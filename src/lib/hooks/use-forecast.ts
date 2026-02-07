/**
 * React hooks for forecast data fetching.
 * Uses TanStack Query for caching and error handling.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarResponse,
  MonthlyForecastResponse,
  AnnualForecastResponse,
} from "@/types/forecast";
import { isRetryableError } from "@/lib/utils/errors";

/**
 * Query key factory for forecast queries.
 * Enables targeted invalidation and efficient caching.
 *
 * @example
 * ```typescript
 * // Invalidate all forecast data
 * queryClient.invalidateQueries({ queryKey: forecastKeys.all });
 *
 * // Invalidate only calendar data
 * queryClient.invalidateQueries({ queryKey: forecastKeys.calendar(30) });
 * ```
 */
export const forecastKeys = {
  all: ["forecast"] as const,
  calendar: (days: number) =>
    [...forecastKeys.all, "calendar", { days }] as const,
  monthly: (months: number) =>
    [...forecastKeys.all, "monthly", { months }] as const,
  annual: () => [...forecastKeys.all, "annual"] as const,
};

/**
 * Fetch calendar data from the API
 */
async function fetchCalendar(days: number): Promise<CalendarResponse> {
  const response = await fetch(`/api/forecast/calendar?days=${days}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch calendar");
  }

  return response.json();
}

/**
 * Fetch monthly forecast data from the API
 */
async function fetchMonthly(months: number): Promise<MonthlyForecastResponse> {
  const response = await fetch(`/api/forecast/monthly?months=${months}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch monthly forecast");
  }

  return response.json();
}

/**
 * Fetch annual forecast data from the API
 */
async function fetchAnnual(): Promise<AnnualForecastResponse> {
  const response = await fetch("/api/forecast/annual");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch annual forecast");
  }

  return response.json();
}

/**
 * Hook to fetch and cache upcoming charges calendar data.
 *
 * Returns a list of upcoming subscription renewals within the specified
 * number of days, along with summary statistics.
 *
 * @param days - Number of days to look ahead (30, 60, or 90)
 *
 * @example
 * ```tsx
 * function UpcomingCharges() {
 *   const { data, isLoading, isError } = useForecastCalendar(30);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *
 *   return (
 *     <div>
 *       <p>Total: {data.summary.totalAmount}</p>
 *       {data.charges.map(charge => (
 *         <ChargeCard key={charge.subscriptionId} charge={charge} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useForecastCalendar(days: 30 | 60 | 90 = 30) {
  return useQuery({
    queryKey: forecastKeys.calendar(days),
    queryFn: () => fetchCalendar(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
  });
}

/**
 * Hook to fetch and cache monthly forecast data.
 *
 * Returns monthly spending projections with 80% and 95% confidence
 * intervals that widen over time (fan chart data).
 *
 * @param months - Number of months to forecast (1-12, default 6)
 *
 * @example
 * ```tsx
 * function MonthlyForecastChart() {
 *   const { data, isLoading, isError } = useForecastMonthly(6);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *
 *   // Data ready for fan chart visualization
 *   return (
 *     <FanChart
 *       data={data.forecasts}
 *       currency={data.displayCurrency}
 *     />
 *   );
 * }
 * ```
 */
export function useForecastMonthly(months: number = 6) {
  return useQuery({
    queryKey: forecastKeys.monthly(months),
    queryFn: () => fetchMonthly(months),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
  });
}

/**
 * Hook to fetch and cache annual forecast data.
 *
 * Returns 12-month spending projection with annual confidence intervals
 * (scaled by sqrt(12)) and monthly breakdown.
 *
 * @example
 * ```tsx
 * function AnnualForecastCard() {
 *   const { data, isLoading, isError } = useForecastAnnual();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *
 *   return (
 *     <Card>
 *       <CardTitle>Annual Forecast</CardTitle>
 *       <p>Expected: {formatCurrency(data.forecast, data.displayCurrency)}</p>
 *       <p className="text-sm text-muted-foreground">
 *         95% range: {formatCurrency(data.lower95)} - {formatCurrency(data.upper95)}
 *       </p>
 *     </Card>
 *   );
 * }
 * ```
 */
export function useForecastAnnual() {
  return useQuery({
    queryKey: forecastKeys.annual(),
    queryFn: fetchAnnual,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
  });
}

/**
 * Hook to invalidate all forecast data.
 *
 * Use after subscription mutations (create, update, delete) to
 * ensure forecast data reflects the latest state.
 *
 * @example
 * ```tsx
 * function SubscriptionActions() {
 *   const invalidateForecast = useInvalidateForecast();
 *   const deleteSubscription = useMutation({
 *     mutationFn: deleteSubscriptionAPI,
 *     onSuccess: () => {
 *       invalidateForecast();
 *     },
 *   });
 *
 *   return <button onClick={() => deleteSubscription.mutate(id)}>Delete</button>;
 * }
 * ```
 */
export function useInvalidateForecast() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: forecastKeys.all });
  };
}
