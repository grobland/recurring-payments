import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  SubscriptionWithCategory,
  SubscriptionSummary,
} from "@/types/subscription";
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from "@/lib/validations/subscription";

// Query keys
export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  lists: () => [...subscriptionKeys.all, "list"] as const,
  list: (filters: SubscriptionFilters) =>
    [...subscriptionKeys.lists(), filters] as const,
  details: () => [...subscriptionKeys.all, "detail"] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  deleted: () => [...subscriptionKeys.all, "deleted"] as const,
  summary: () => [...subscriptionKeys.all, "summary"] as const,
};

// Types
export type SubscriptionFilters = {
  status?: "active" | "paused" | "cancelled" | "all";
  category?: string;
  frequency?: "monthly" | "yearly" | "all";
  search?: string;
  sortBy?: "name" | "amount" | "nextRenewalDate" | "createdAt";
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
};

type SubscriptionsResponse = {
  subscriptions: SubscriptionWithCategory[];
  summary: SubscriptionSummary;
};

type SubscriptionResponse = {
  subscription: SubscriptionWithCategory;
};

type DeleteResponse = {
  message: string;
  id: string;
};

// API functions
async function fetchSubscriptions(
  filters: SubscriptionFilters = {}
): Promise<SubscriptionsResponse> {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.frequency && filters.frequency !== "all") {
    params.set("frequency", filters.frequency);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }
  if (filters.includeDeleted) {
    params.set("includeDeleted", "true");
  }

  const queryString = params.toString();
  const url = `/api/subscriptions${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch subscriptions");
  }
  return response.json();
}

async function fetchSubscription(id: string): Promise<SubscriptionResponse> {
  const response = await fetch(`/api/subscriptions/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch subscription");
  }
  return response.json();
}

async function createSubscription(
  data: CreateSubscriptionInput
): Promise<SubscriptionResponse> {
  const response = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create subscription");
  }
  return response.json();
}

async function updateSubscription({
  id,
  data,
}: {
  id: string;
  data: UpdateSubscriptionInput;
}): Promise<SubscriptionResponse> {
  const response = await fetch(`/api/subscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update subscription");
  }
  return response.json();
}

async function deleteSubscription(id: string): Promise<DeleteResponse> {
  const response = await fetch(`/api/subscriptions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete subscription");
  }
  return response.json();
}

async function restoreSubscription(id: string): Promise<SubscriptionResponse> {
  const response = await fetch(`/api/subscriptions/${id}/restore`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to restore subscription");
  }
  return response.json();
}

// Hooks

/**
 * Fetch subscriptions with filters
 */
export function useSubscriptions(
  filters: SubscriptionFilters = {},
  options?: Omit<
    UseQueryOptions<SubscriptionsResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: subscriptionKeys.list(filters),
    queryFn: () => fetchSubscriptions(filters),
    ...options,
  });
}

/**
 * Fetch a single subscription by ID
 */
export function useSubscription(
  id: string,
  options?: Omit<
    UseQueryOptions<SubscriptionResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => fetchSubscription(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Create a new subscription
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      // Invalidate all subscription lists
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}

/**
 * Update an existing subscription
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscription,
    onSuccess: (data, variables) => {
      // Update the specific subscription in cache
      queryClient.setQueryData(
        subscriptionKeys.detail(variables.id),
        data
      );
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}

/**
 * Soft delete a subscription
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubscription,
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: subscriptionKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}

/**
 * Restore a deleted subscription
 */
export function useRestoreSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreSubscription,
    onSuccess: (data, id) => {
      // Add back to cache
      queryClient.setQueryData(subscriptionKeys.detail(id), data);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.deleted() });
    },
  });
}

/**
 * Prefetch a subscription (for hover/navigation optimization)
 */
export function usePrefetchSubscription() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: subscriptionKeys.detail(id),
      queryFn: () => fetchSubscription(id),
      staleTime: 30000, // 30 seconds
    });
  };
}
