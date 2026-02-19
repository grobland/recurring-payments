"use client";

import { useQuery } from "@tanstack/react-query";

// Response type from /api/statements/[id]/pdf-url
type PdfUrlResponse = {
  url: string;
  downloadUrl: string;
};

// Query keys
export const pdfUrlKeys = {
  url: (id: string) => ["pdf-url", id] as const,
};

// API function
async function fetchPdfUrl(statementId: string): Promise<PdfUrlResponse> {
  const response = await fetch(`/api/statements/${statementId}/pdf-url`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to fetch PDF URL",
    }));
    throw new Error(error.error || "Failed to fetch PDF URL");
  }
  return response.json() as Promise<PdfUrlResponse>;
}

/**
 * Lazily fetch signed URLs for a stored PDF statement.
 *
 * Only fetches when the modal is open (enabled = true).
 * Returns both a viewing URL and a download URL (with Content-Disposition: attachment).
 *
 * @param statementId - The statement UUID
 * @param enabled - Whether to fetch (typically: modal is open)
 * @returns useQuery result with { url, downloadUrl }
 */
export function usePdfUrl(statementId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: pdfUrlKeys.url(statementId ?? ""),
    queryFn: () => fetchPdfUrl(statementId!),
    enabled: !!statementId && enabled,
    staleTime: 55 * 60 * 1000, // 55 min — just under 1-hour signed URL expiry
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: 1,
  });
}
