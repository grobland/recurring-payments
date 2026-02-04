import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

// Types
export interface ImportHistoryItem {
  id: string;
  statementSource: string;
  createdAt: string;
  subscriptionsCreated: number;
  subscriptionsSkipped: number;
}

type ImportHistoryResponse = {
  imports: ImportHistoryItem[];
};

// Query keys
export const importHistoryKeys = {
  all: ["import-history"] as const,
};

// API function
async function fetchImportHistory(): Promise<ImportHistoryResponse> {
  const response = await fetch("/api/import/history");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch import history");
  }
  return response.json();
}

// Hook
/**
 * Fetch import history for the current user
 */
export function useImportHistory(
  options?: Omit<
    UseQueryOptions<ImportHistoryResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: importHistoryKeys.all,
    queryFn: fetchImportHistory,
    ...options,
  });
}
