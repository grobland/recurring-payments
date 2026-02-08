"use client";

import { useState, useCallback, useRef } from "react";
import { hashFile } from "@/lib/utils/file-hash";

// File status in the queue
export type FileStatus =
  | "pending"      // Waiting in queue
  | "hashing"      // Computing SHA-256 hash
  | "checking"     // Checking for duplicates
  | "uploading"    // Uploading to server
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
  sourceType: string;
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
function saveQueueState(queue: QueuedFile[], sourceType: string): void {
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
      duplicateInfo: f.duplicateInfo,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue: serializable, sourceType, timestamp: Date.now() }));
  } catch {
    // localStorage might be unavailable or full
  }
}

/**
 * Load persisted queue state from localStorage.
 * Returns partial state that can be restored (status info for files that were in progress).
 */
function loadQueueState(): { queue: SerializableQueueItem[]; sourceType: string; timestamp: number } | null {
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
  const { sourceType, onComplete } = options;
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const fileMapRef = useRef<Map<string, File>>(new Map());

  // Generate unique ID for each file
  const generateId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Update a file in the queue and persist to localStorage
  const updateFile = useCallback((id: string, updates: Partial<QueuedFile>) => {
    setQueue(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      saveQueueState(updated, sourceType);
      return updated;
    });
  }, [sourceType]);

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
        duplicateInfo: null,
      };
    });

    setQueue(prev => {
      const updated = [...prev, ...newFiles];
      saveQueueState(updated, sourceType);
      return updated;
    });
  }, [sourceType]);

  // Remove a file from the queue
  const removeFile = useCallback((id: string) => {
    fileMapRef.current.delete(id);
    setQueue(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveQueueState(updated, sourceType);
      return updated;
    });
  }, [sourceType]);

  // Cancel all pending files
  const cancelAll = useCallback(() => {
    setQueue(prev => {
      const updated = prev.filter(f =>
        f.status === "complete" || f.status === "duplicate"
      );
      saveQueueState(updated, sourceType);
      return updated;
    });
    processingRef.current = false;
    setIsProcessing(false);
  }, [sourceType]);

  // Retry a failed file
  const retryFile = useCallback((id: string) => {
    setQueue(prev => {
      const updated = prev.map(f =>
        f.id === id ? { ...f, status: "pending" as FileStatus, error: null, progress: 0 } : f
      );
      saveQueueState(updated, sourceType);
      return updated;
    });
  }, [sourceType]);

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

      // Step 3: Upload the file (creates statement record)
      updateFile(id, { status: "uploading", progress: 40 });
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("hash", hash);
      uploadFormData.append("sourceType", sourceType);

      const uploadResponse = await fetch("/api/batch/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadData = await uploadResponse.json();
      updateFile(id, { statementId: uploadData.statementId, progress: 60 });

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
  }, [sourceType, updateFile]);

  // Process the queue sequentially
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    while (processingRef.current) {
      // Find next pending file (use current state via callback)
      let nextFile: QueuedFile | undefined;
      setQueue(prev => {
        nextFile = prev.find(f => f.status === "pending");
        return prev;
      });

      if (!nextFile) {
        break; // No more pending files
      }

      await processFile(nextFile);

      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    processingRef.current = false;
    setIsProcessing(false);

    // Calculate results from final state
    setQueue(prev => {
      const results: BatchUploadResult = {
        totalFiles: prev.length,
        successful: prev.filter(f => f.status === "complete").length,
        failed: prev.filter(f => f.status === "error").length,
        skipped: prev.filter(f => f.status === "duplicate").length,
        totalTransactions: prev.reduce((sum, f) => sum + (f.transactionCount || 0), 0),
      };
      onComplete?.(results);

      // Clear persisted state on completion
      clearQueueState();

      return prev;
    });
  }, [processFile, onComplete]);

  // Start processing when files are added
  const startProcessing = useCallback(() => {
    if (!processingRef.current && queue.some(f => f.status === "pending")) {
      processQueue();
    }
  }, [queue, processQueue]);

  // Get queue statistics
  const stats = {
    total: queue.length,
    pending: queue.filter(f => f.status === "pending").length,
    processing: queue.filter(f => ["hashing", "checking", "uploading", "processing"].includes(f.status)).length,
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
