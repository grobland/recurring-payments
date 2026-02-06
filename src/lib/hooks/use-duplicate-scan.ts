import { useMutation } from "@tanstack/react-query";
import type { DuplicatePair } from "@/app/api/subscriptions/duplicates/route";

interface DuplicateScanResponse {
  duplicates: DuplicatePair[];
}

async function scanForDuplicates(): Promise<DuplicateScanResponse> {
  const response = await fetch("/api/subscriptions/duplicates", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to scan for duplicates");
  }

  return response.json();
}

/**
 * Hook for triggering duplicate subscription scan
 */
export function useDuplicateScan() {
  return useMutation({
    mutationFn: scanForDuplicates,
  });
}

// Re-export the type for convenience
export type { DuplicatePair };
