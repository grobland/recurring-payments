"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { StatementSummary } from "@/types/source";

// Query keys for source statement queries
export const sourceStatementKeys = {
  all: ["sourceStatements"] as const,
  lists: () => [...sourceStatementKeys.all, "list"] as const,
  list: (sourceType: string) => [...sourceStatementKeys.lists(), sourceType] as const,
};

// Response types
type SourceStatementsResponse = {
  statements: StatementSummary[];
};

// API function
async function fetchSourceStatements(
  sourceType: string
): Promise<SourceStatementsResponse> {
  // URL encode the sourceType for the path
  const encodedSourceType = encodeURIComponent(sourceType);
  const response = await fetch(`/api/sources/${encodedSourceType}/statements`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to fetch statements",
    }));
    throw new Error(error.error || "Failed to fetch statements");
  }
  return response.json();
}

/**
 * Fetch all statements for a specific source type
 *
 * @param sourceType - The source type identifier (e.g., "Chase Sapphire")
 * @returns useQuery result with statements array
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSourceStatements("Chase Sapphire")
 *
 * // Access statements (only when sourceType is provided)
 * const statements = data?.statements ?? []
 * ```
 */
export function useSourceStatements(
  sourceType: string | undefined,
  options?: Omit<
    UseQueryOptions<SourceStatementsResponse, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery({
    queryKey: sourceStatementKeys.list(sourceType ?? ""),
    queryFn: () => fetchSourceStatements(sourceType!),
    enabled: !!sourceType,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    ...options,
  });
}
