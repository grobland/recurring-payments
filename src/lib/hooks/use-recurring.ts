"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errors";
import type {
  CreateMasterInput,
  UpdateMasterInput,
  MergeInput,
  StatusChangeInput,
  ConfirmSeriesInput,
  ResolveReviewInput,
  LabelTransactionInput,
} from "@/lib/validations/recurring";

// ============ Query Key Factory ============

export const recurringKeys = {
  all: ["recurring"] as const,
  dashboard: () => [...recurringKeys.all, "dashboard"] as const,
  masters: () => [...recurringKeys.all, "masters"] as const,
  masterList: (filters: RecurringMasterFilters) =>
    [...recurringKeys.masters(), "list", filters] as const,
  masterDetail: (id: string) =>
    [...recurringKeys.masters(), "detail", id] as const,
  series: () => [...recurringKeys.all, "series"] as const,
  seriesList: (filters?: Record<string, string>) =>
    [...recurringKeys.series(), "list", filters] as const,
  seriesDetail: (id: string) =>
    [...recurringKeys.series(), "detail", id] as const,
  reviewQueue: () => [...recurringKeys.all, "review-queue"] as const,
};

// ============ Types ============

export type RecurringMasterFilters = {
  kind?: string;
  status?: string;
  search?: string;
};

// ============ API Helper ============

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

// ============ Query Hooks ============

/**
 * Fetch recurring payment dashboard summary.
 * Returns activeCount, monthlyTotal, upcomingCount, needsReviewCount,
 * upcomingPayments, amountChanges, and needsReviewItems.
 */
export function useRecurringDashboard() {
  return useQuery({
    queryKey: recurringKeys.dashboard(),
    queryFn: () => apiFetch("/api/recurring/dashboard"),
    staleTime: 60_000,
  });
}

/**
 * Fetch list of recurring masters with optional filters.
 */
export function useRecurringMasters(filters: RecurringMasterFilters = {}) {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const queryString = params.toString();
  const url = `/api/recurring/masters${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: recurringKeys.masterList(filters),
    queryFn: () => apiFetch(url),
  });
}

/**
 * Fetch a single recurring master by ID.
 */
export function useRecurringMasterDetail(id: string) {
  return useQuery({
    queryKey: recurringKeys.masterDetail(id),
    queryFn: () => apiFetch(`/api/recurring/masters/${id}`),
    enabled: !!id,
  });
}

/**
 * Fetch recurring series list with optional filters.
 */
export function useRecurringSeries(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const queryString = params.toString();
  const url = `/api/recurring/series${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: recurringKeys.seriesList(filters),
    queryFn: () => apiFetch(url),
  });
}

/**
 * Fetch a single recurring series by ID.
 */
export function useRecurringSeriesDetail(id: string) {
  return useQuery({
    queryKey: recurringKeys.seriesDetail(id),
    queryFn: () => apiFetch(`/api/recurring/series/${id}`),
    enabled: !!id,
  });
}

/**
 * Fetch the review queue items (unresolved patterns needing human review).
 */
export function useReviewQueue() {
  return useQuery({
    queryKey: recurringKeys.reviewQueue(),
    queryFn: () => apiFetch("/api/recurring/review-queue"),
  });
}

// ============ Mutation Hooks ============

/**
 * Create a new recurring master.
 */
export function useCreateMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMasterInput) =>
      apiFetch("/api/recurring/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Recurring payment created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Update an existing recurring master.
 */
export function useUpdateMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMasterInput }) =>
      apiFetch(`/api/recurring/masters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({
        queryKey: recurringKeys.masterDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Recurring payment updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Merge one recurring master into another.
 */
export function useMergeMasters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MergeInput }) =>
      apiFetch(`/api/recurring/masters/${id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Recurring payments merged");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Change the status of a recurring master (active, paused, cancelled, etc.).
 */
export function useChangeMasterStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StatusChangeInput }) =>
      apiFetch(`/api/recurring/masters/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({
        queryKey: recurringKeys.masterDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Status updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Confirm a recurring series (promote to a recurring master).
 */
export function useConfirmSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmSeriesInput }) =>
      apiFetch(`/api/recurring/series/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.series() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.reviewQueue() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Series confirmed as recurring");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Ignore a recurring series (mark as not recurring).
 */
export function useIgnoreSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/recurring/series/${id}/ignore`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.series() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.reviewQueue() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Series ignored");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Resolve a review queue item.
 */
export function useResolveReviewItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveReviewInput }) =>
      apiFetch(`/api/recurring/review-queue/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.reviewQueue() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.masters() });
      queryClient.invalidateQueries({ queryKey: recurringKeys.dashboard() });
      toast.success("Review item resolved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

/**
 * Label a transaction as recurring, not recurring, or ignore.
 */
export function useLabelTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LabelTransactionInput }) =>
      apiFetch(`/api/transactions/${id}/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction labeled");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
