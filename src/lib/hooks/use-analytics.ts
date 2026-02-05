import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalyticsResponse, AnalyticsPeriod } from "@/types/analytics";
import { isRetryableError } from "@/lib/utils/errors";

/**
 * Query key factory for analytics queries
 */
export const analyticsKeys = {
  all: ["analytics"] as const,
  period: (
    period: AnalyticsPeriod,
    year: number,
    month?: number,
    quarter?: number
  ) => [...analyticsKeys.all, { period, year, month, quarter }] as const,
};

/**
 * Fetch analytics data from the API
 */
async function fetchAnalytics(
  period: AnalyticsPeriod,
  year: number,
  month?: number,
  quarter?: number
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  params.set("period", period);
  params.set("year", year.toString());

  if (period === "month" && month !== undefined) {
    params.set("month", month.toString());
  }
  if (period === "quarter" && quarter !== undefined) {
    params.set("quarter", quarter.toString());
  }

  const response = await fetch(`/api/analytics?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch analytics");
  }

  return response.json();
}

/**
 * Hook to fetch and cache analytics data
 *
 * @param period - Time period granularity (month, year, quarter)
 * @param year - Year to query (e.g., 2026)
 * @param month - Month (1-12), used when period is 'month'
 * @param quarter - Quarter (1-4), used when period is 'quarter'
 *
 * @example
 * ```tsx
 * // Current month analytics
 * const { data, isLoading } = useAnalytics("month", 2026, 2);
 *
 * // Yearly analytics
 * const { data } = useAnalytics("year", 2026);
 *
 * // Quarter analytics
 * const { data } = useAnalytics("quarter", 2026, undefined, 1);
 * ```
 */
export function useAnalytics(
  period: AnalyticsPeriod,
  year: number,
  month?: number,
  quarter?: number
) {
  return useQuery({
    queryKey: analyticsKeys.period(period, year, month, quarter),
    queryFn: () => fetchAnalytics(period, year, month, quarter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Data refreshes server-side via cron
    retry: (failureCount, error) => {
      // Only retry on transient errors (network, 503)
      if (!isRetryableError(error)) return false;
      // Max 2 retries (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
  });
}

/**
 * Hook to invalidate all analytics queries
 *
 * Use after subscription mutations to refresh analytics data.
 *
 * @example
 * ```tsx
 * const invalidateAnalytics = useInvalidateAnalytics();
 *
 * // After updating a subscription
 * await updateSubscription(data);
 * invalidateAnalytics();
 * ```
 */
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  };
}
