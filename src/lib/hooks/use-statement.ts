"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

// Response types
type StatementInfo = {
  id: string;
  originalFilename: string;
  sourceType: string;
  statementDate: string | null;
  uploadedAt: string;
  transactionCount: number;
  stats: {
    converted: number;
    skipped: number;
    pending: number;
  };
};

type StatementResponse = {
  statement: StatementInfo;
};

// Query keys
export const statementKeys = {
  all: ["statements"] as const,
  detail: (id: string) => [...statementKeys.all, "detail", id] as const,
};

// API function
async function fetchStatement(id: string): Promise<StatementResponse> {
  const response = await fetch(`/api/statements/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to fetch statement",
    }));
    throw new Error(error.error || "Failed to fetch statement");
  }
  return response.json();
}

/**
 * Fetch a single statement's details
 *
 * @param id - The statement UUID
 * @returns useQuery result with statement info
 */
export function useStatement(
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<StatementResponse, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery({
    queryKey: statementKeys.detail(id ?? ""),
    queryFn: () => fetchStatement(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    ...options,
  });
}
