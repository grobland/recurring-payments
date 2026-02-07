import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";
import type { Alert, Subscription } from "@/lib/db/schema";

// Type for alerts with joined subscription data
export interface AlertWithSubscription extends Alert {
  subscription: Pick<
    Subscription,
    "id" | "name" | "amount" | "currency" | "nextRenewalDate"
  > | null;
}

export interface AlertsResponse {
  alerts: AlertWithSubscription[];
}

// Query key factory for consistent cache management
export const alertKeys = {
  all: ["alerts"] as const,
  list: () => [...alertKeys.all, "list"] as const,
};

/**
 * Fetch all unread alerts for the current user.
 */
export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.list(),
    queryFn: async (): Promise<AlertsResponse> => {
      const res = await fetch("/api/alerts");
      if (!res.ok) {
        throw new Error(getErrorMessage(await res.json()));
      }
      return res.json();
    },
    staleTime: 60_000, // 1 minute - alerts don't change that often
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return isRetryableError(error);
    },
  });
}

/**
 * Check if there are any unacknowledged alerts (for badge indicator).
 */
export function useHasUnreadAlerts(): boolean {
  const { data } = useAlerts();
  return data?.alerts.some((a) => !a.acknowledgedAt) ?? false;
}

/**
 * Acknowledge an alert (mark as reviewed).
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(getErrorMessage(await res.json()));
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate alerts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

/**
 * Dismiss an alert (remove from list).
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(getErrorMessage(await res.json()));
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate alerts cache to refresh the list
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

/**
 * Dismiss all alerts at once.
 */
export function useDismissAllAlerts() {
  const queryClient = useQueryClient();
  const { data } = useAlerts();

  return useMutation({
    mutationFn: async () => {
      const alerts = data?.alerts ?? [];
      // Dismiss all alerts in parallel
      await Promise.all(
        alerts.map((alert) =>
          fetch(`/api/alerts/${alert.id}`, { method: "DELETE" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
