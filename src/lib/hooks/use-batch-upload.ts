"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { hashFile } from "@/lib/utils/file-hash";

// File status in the queue
export type FileStatus =
  | "pending"      // Waiting in queue
  | "hashing"      // Computing SHA-256 hash
  | "checking"     // Checking for duplicates
  | "uploading"    // Uploading to server
  | "storing"      // Persisting PDF to Supabase Storage
  | "processing"   // Server extracting transactions
  | "complete"     // Successfully processed
  | "error"        // Failed (retryable)
  | "duplicate";   // Already uploaded (user can skip or re-import)

// Serializable queue state for localStorage persistence
interface SerializableQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  hash: string | null;
  status: FileStatus;
  progress: number;
  error: string | null;
  statementId: string | null;
  transactionCount: number | null;
  pdfStored: boolean | null;
  duplicateInfo: {
    existingId: string;
    filename: string;
    uploadedAt: string;
  } | null;
}

// Queued file with status
export interface QueuedFile {
  id: string;
  file: File;
  hash: string | null;
  status: FileStatus;
  progress: number; // 0-100
  error: string | null;
  statementId: string | null;
  transactionCount: number | null;
  pdfStored: boolean | null;
  // Duplicate info
  duplicateInfo: {
    existingId: string;
    filename: string;
    uploadedAt: string;
  } | null;
}

// Duplicate resolution action
export type DuplicateAction = "skip" | "reimport";

interface UseBatchUploadOptions {
  accountId: string;
  onComplete?: (results: BatchUploadResult) => void;
}

export interface BatchUploadResult {
  totalFiles: number;
  successful: number;
  failed: number;
  skipped: number;
  totalTransactions: number;
}

const STORAGE_KEY = "batch-upload-queue";

/**
 * Save queue state to localStorage (for persistence across refresh).
 * Only saves metadata, not File objects (those cannot be serialized).
 */
function saveQueueState(queue: QueuedFile[], accountId: string): void {
  try {
    const serializable: SerializableQueueItem[] = queue.map(f => ({
      id: f.id,
      fileName: f.file.name,
      fileSize: f.file.size,
      fileType: f.file.type,
      hash: f.hash,
      status: f.status,
      progress: f.progress,
      error: f.error,
      statementId: f.statementId,
      transactionCount: f.transactionCount,
      pdfStored: f.pdfStored,
      duplicateInfo: f.duplicateInfo,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue: serializable, accountId, timestamp: Date.now() }));
  } catch {
    // localStorage might be unavailable or full
  }
}

/**
 * Load persisted queue state from localStorage.
 * Returns partial state that can be restored (status info for files that were in progress).
 */
function loadQueueState(): { queue: SerializableQueueItem[]; accountId: string; timestamp: number } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    // Expire after 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear persisted queue state.
 */
function clearQueueState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Hook for managing batch file uploads with sequential processing.
 * Processes files one at a time to prevent memory exhaustion.
 * Persists queue state to localStorage for resume on page refresh.
 */
export function useBatchUpload(options: UseBatchUploadOptions) {
  const { accountId, onComplete } = options;
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const fileMapRef = useRef<Map<string, File>>(new Map());
  const queueRef = useRef<QueuedFile[]>([]);
  const potentialCountRef = useRef(0);

  // Generate unique ID for each file
  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Update a file in the queue and persist to localStorage
  const updateFile = useCallback((id: string, updates: Partial<QueuedFile>) => {
    setQueue(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      queueRef.current = updated;
      saveQueueState(updated, accountId);
      return updated;
    });
  }, [accountId]);

  // Add files to the queue
  const addFiles = useCallback((files: File[]) => {
    const newFiles: QueuedFile[] = files.map(file => {
      const id = generateId();
      fileMapRef.current.set(id, file);
      return {
        id,
        file,
        hash: null,
        status: "pending" as FileStatus,
        progress: 0,
        error: null,
        statementId: null,
        transactionCount: null,
        pdfStored: null,
        duplicateInfo: null,
      };
    });

    setQueue(prev => {
      const updated = [...prev, ...newFiles];
      queueRef.current = updated;
      saveQueueState(updated, accountId);
      return updated;
    });
  }, [accountId]);

  // Remove a file from the queue
  const removeFile = useCallback((id: string) => {
    fileMapRef.current.delete(id);
    setQueue(prev => {
      const updated = prev.filter(f => f.id !== id);
      queueRef.current = updated;
      saveQueueState(updated, accountId);
      return updated;
    });
  }, [accountId]);

  // Cancel all pending files
  const cancelAll = useCallback(() => {
    setQueue(prev => {
      const updated = prev.filter(f =>
        f.status === "complete" || f.status === "duplicate"
      );
      queueRef.current = updated;
      saveQueueState(updated, accountId);
      return updated;
    });
    processingRef.current = false;
    setIsProcessing(false);
  }, [accountId]);

  // Retry a failed file
  const retryFile = useCallback((id: string) => {
    setQueue(prev => {
      const updated = prev.map(f =>
        f.id === id ? { ...f, status: "pending" as FileStatus, error: null, progress: 0 } : f
      );
      queueRef.current = updated;
      saveQueueState(updated, accountId);
      return updated;
    });
  }, [accountId]);

  // Handle duplicate resolution
  const resolveDuplicate = useCallback((id: string, action: DuplicateAction) => {
    if (action === "skip") {
      // Mark as complete (skipped)
      updateFile(id, { status: "complete", progress: 100 });
    } else {
      // Re-import: deferred to future phase (blob storage required)
      // For now, just mark as complete
      updateFile(id, { status: "complete", progress: 100 });
    }
  }, [updateFile]);

  // Process a single file through the pipeline
  const processFile = useCallback(async (queuedFile: QueuedFile): Promise<void> => {
    const { id, file } = queuedFile;

    try {
      // Step 1: Hash the file
      updateFile(id, { status: "hashing", progress: 10 });
      const hash = await hashFile(file);
      updateFile(id, { hash, progress: 20 });

      // Step 2: Check for duplicates
      updateFile(id, { status: "checking", progress: 30 });
      const checkResponse = await fetch("/api/batch/check-hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      });

      if (!checkResponse.ok) {
        throw new Error("Failed to check for duplicates");
      }

      const checkData = await checkResponse.json();
      if (checkData.isDuplicate) {
        updateFile(id, {
          status: "duplicate",
          progress: 100,
          duplicateInfo: {
            existingId: checkData.existing.id,
            filename: checkData.existing.filename,
            uploadedAt: checkData.existing.uploadedAt,
          },
        });
        return; // Stop processing, wait for user decision
      }

      // Step 2b: If statement exists but PDF is missing, re-attach the PDF
      // without creating a new statement or re-processing transactions.
      if (checkData.needsPdfReattach && checkData.existingStatementId) {
        updateFile(id, { status: "storing", progress: 50 });

        const attachFormData = new FormData();
        attachFormData.append("file", file);
        attachFormData.append("statementId", checkData.existingStatementId);

        const attachResponse = await fetch("/api/vault/attach-pdf", {
          method: "POST",
          body: attachFormData,
        });

        if (!attachResponse.ok) {
          const errorData = await attachResponse.json();
          throw new Error(errorData.error || "Failed to re-attach PDF");
        }

        updateFile(id, {
          status: "complete",
          progress: 100,
          statementId: checkData.existingStatementId,
          pdfStored: true,
          transactionCount: checkData.existing?.transactionCount ?? 0,
        });
        return;
      }

      // Step 3: Upload the file (creates statement record)
      updateFile(id, { status: "uploading", progress: 40 });
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("hash", hash);
      uploadFormData.append("accountId", accountId);

      const uploadResponse = await fetch("/api/batch/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadData = await uploadResponse.json();

      // Step 3.5: Show storing status while server stores PDF to Supabase
      // (the server already completed storage by the time we read the response,
      //  but we show the status briefly to give UI feedback)
      updateFile(id, { status: "storing", progress: 55 });
      updateFile(id, {
        statementId: uploadData.statementId,
        pdfStored: uploadData.pdfStored ?? null,
        progress: 60,
      });

      // Step 4: Process the file (server extracts PDF text and transactions)
      updateFile(id, { status: "processing", progress: 70 });

      // Send file to server for processing - server handles PDF parsing
      const processFormData = new FormData();
      processFormData.append("statementId", uploadData.statementId);
      processFormData.append("file", file);

      const processResponse = await fetch("/api/batch/process", {
        method: "POST",
        body: processFormData,
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const processData = await processResponse.json();

      // Accumulate potential subscription count for batch summary
      if (processData.potentialCount) {
        potentialCountRef.current += processData.potentialCount;
      }

      updateFile(id, {
        status: "complete",
        progress: 100,
        transactionCount: processData.transactionCount,
      });
    } catch (error) {
      updateFile(id, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [accountId, updateFile]);

  // Process the queue sequentially
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    // Reset potential count at start of batch
    potentialCountRef.current = 0;

    while (processingRef.current) {
      // Find next pending file from the ref (always current)
      const nextFile = queueRef.current.find(f => f.status === "pending");

      if (!nextFile) {
        break; // No more pending files
      }

      await processFile(nextFile);

      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    processingRef.current = false;
    setIsProcessing(false);

    // Calculate results from the ref (always current)
    const finalQueue = queueRef.current;
    const results: BatchUploadResult = {
      totalFiles: finalQueue.length,
      successful: finalQueue.filter(f => f.status === "complete").length,
      failed: finalQueue.filter(f => f.status === "error").length,
      skipped: finalQueue.filter(f => f.status === "duplicate").length,
      totalTransactions: finalQueue.reduce((sum, f) => sum + (f.transactionCount || 0), 0),
    };

    // Trigger pattern detection (fire and forget)
    fetch("/api/patterns/detect", { method: "POST" }).catch((e) => {
      console.error("Pattern detection trigger failed:", e);
    });

    // Show toast if potential subscriptions were detected
    const totalPotential = potentialCountRef.current;
    if (totalPotential > 0) {
      toast.success(
        `${totalPotential} potential subscription${totalPotential !== 1 ? "s" : ""} detected`,
        {
          duration: 8000,
          action: {
            label: "View Suggestions",
            onClick: () => {
              window.location.href = "/payments/suggestions";
            },
          },
        }
      );
    }

    onComplete?.(results);

    // Invalidate import sources cache so new accounts appear in dropdown
    queryClient.invalidateQueries({ queryKey: ["import-sources"] });

    // Invalidate account coverage so the coverage list refreshes immediately
    if (accountId) {
      queryClient.invalidateQueries({ queryKey: ["accounts", accountId, "coverage"] });
    }

    // Clear persisted state on completion
    clearQueueState();
  }, [processFile, onComplete, queryClient]);

  // Start processing when files are added
  const startProcessing = useCallback(() => {
    if (!processingRef.current && queueRef.current.some(f => f.status === "pending")) {
      processQueue();
    }
  }, [processQueue]);

  // Get queue statistics
  const stats = {
    total: queue.length,
    pending: queue.filter(f => f.status === "pending").length,
    processing: queue.filter(f => ["hashing", "checking", "uploading", "storing", "processing"].includes(f.status)).length,
    complete: queue.filter(f => f.status === "complete").length,
    failed: queue.filter(f => f.status === "error").length,
    duplicate: queue.filter(f => f.status === "duplicate").length,
  };

  return {
    queue,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    cancelAll,
    retryFile,
    resolveDuplicate,
    startProcessing,
    // Expose for testing/debugging
    loadPersistedState: loadQueueState,
    clearPersistedState: clearQueueState,
  };
}
