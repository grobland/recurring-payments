"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "batch-upload-queue";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IncompleteBatch {
  sourceType: string;
  timestamp: number;
  processed: number;
  total: number;
  lastError?: string;
  completedFiles: { filename: string; status: string }[];
  pendingFiles: { filename: string }[];
}

interface StoredQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  hash: string | null;
  status: string;
  progress: number;
  error: string | null;
  statementId: string | null;
  transactionCount: number | null;
  duplicateInfo: {
    existingId: string;
    filename: string;
    uploadedAt: string;
  } | null;
}

interface StoredQueueData {
  queue: StoredQueueItem[];
  sourceType: string;
  timestamp: number;
}

/**
 * Hook to detect incomplete batch uploads from localStorage.
 * Returns null if no incomplete batch exists or data has expired.
 * Use this to show a resume/discard banner on the batch import page.
 */
export function useIncompleteBatch(): {
  batch: IncompleteBatch | null;
  discard: () => void;
} {
  // Initialize as null to avoid SSR/client mismatch
  const [batch, setBatch] = useState<IncompleteBatch | null>(null);

  // Parse localStorage data and check for incomplete batch
  useEffect(() => {
    const checkForIncompleteBatch = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setBatch(null);
          return;
        }

        const data: StoredQueueData = JSON.parse(stored);

        // Check expiry (24 hours)
        if (Date.now() - data.timestamp > EXPIRY_MS) {
          localStorage.removeItem(STORAGE_KEY);
          setBatch(null);
          return;
        }

        const { queue, sourceType, timestamp } = data;

        // Determine if batch is incomplete
        // Incomplete means: has pending files OR has error files
        const pendingFiles = queue.filter(f => f.status === "pending");
        const errorFiles = queue.filter(f => f.status === "error");
        const completedFiles = queue.filter(f =>
          f.status === "complete" || f.status === "duplicate"
        );
        const processingFiles = queue.filter(f =>
          ["hashing", "checking", "uploading", "processing"].includes(f.status)
        );

        // If all files are complete (no pending, no errors, no processing), batch is complete
        const isIncomplete =
          pendingFiles.length > 0 ||
          errorFiles.length > 0 ||
          processingFiles.length > 0;

        if (!isIncomplete || queue.length === 0) {
          setBatch(null);
          return;
        }

        // Find the last error message (most recent error)
        const lastErrorFile = errorFiles[errorFiles.length - 1];
        const lastError = lastErrorFile?.error || undefined;

        // Build incomplete batch info
        const incompleteBatch: IncompleteBatch = {
          sourceType,
          timestamp,
          processed: completedFiles.length,
          total: queue.length,
          lastError,
          completedFiles: completedFiles.map(f => ({
            filename: f.fileName,
            status: f.status,
          })),
          pendingFiles: [...pendingFiles, ...processingFiles].map(f => ({
            filename: f.fileName,
          })),
        };

        setBatch(incompleteBatch);
      } catch {
        // localStorage might be unavailable or corrupted
        setBatch(null);
      }
    };

    checkForIncompleteBatch();
  }, []);

  // Discard the incomplete batch
  const discard = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setBatch(null);
  }, []);

  return { batch, discard };
}

export default useIncompleteBatch;
