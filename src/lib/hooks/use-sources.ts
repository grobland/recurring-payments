"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { SourceCoverage } from "@/types/source";

// Query keys for source queries
export const sourceKeys = {
  all: ["sources"] as const,
  lists: () => [...sourceKeys.all, "list"] as const,
  list: () => [...sourceKeys.lists()] as const,
};

// Response types
type SourcesResponse = {
  sources: SourceCoverage[];
};

// API function
async function fetchSources(): Promise<SourcesResponse> {
  const response = await fetch("/api/sources");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch sources" }));
    throw new Error(error.error || "Failed to fetch sources");
  }
  return response.json();
}

/**
 * Fetch all statement sources with coverage statistics
 *
 * @returns useQuery result with sources array containing coverage data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSources()
 *
 * // Access sources
 * const sources = data?.sources ?? []
 * ```
 */
export function useSources(
  options?: Omit<
    UseQueryOptions<SourcesResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: sourceKeys.list(),
    queryFn: fetchSources,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    ...options,
  });
}
