"use client";

import { Button } from "@/components/ui/button";
import { FileItem } from "./file-item";
import type { QueuedFile, DuplicateAction } from "@/lib/hooks/use-batch-upload";

interface FileQueueProps {
  files: QueuedFile[];
  isProcessing: boolean;
  stats: {
    total: number;
    pending: number;
    processing: number;
    complete: number;
    failed: number;
    duplicate: number;
  };
  onRemoveFile: (id: string) => void;
  onRetryFile: (id: string) => void;
  onResolveDuplicate: (id: string, action: DuplicateAction) => void;
  onCancelAll: () => void;
}

export function FileQueue({
  files,
  isProcessing,
  stats,
  onRemoveFile,
  onRetryFile,
  onResolveDuplicate,
  onCancelAll,
}: FileQueueProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {stats.total} file{stats.total !== 1 ? "s" : ""}
          </span>
          {stats.complete > 0 && (
            <span className="text-green-600 dark:text-green-400">
              {stats.complete} complete
            </span>
          )}
          {stats.failed > 0 && (
            <span className="text-destructive">
              {stats.failed} failed
            </span>
          )}
          {stats.duplicate > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              {stats.duplicate} duplicate{stats.duplicate !== 1 ? "s" : ""}
            </span>
          )}
          {isProcessing && stats.pending > 0 && (
            <span className="text-muted-foreground">
              {stats.pending} remaining
            </span>
          )}
        </div>

        {isProcessing && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelAll}
            className="h-9"
          >
            Cancel All
          </Button>
        )}
      </div>

      {/* File list */}
      <div className="space-y-2">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onRemove={() => onRemoveFile(file.id)}
            onRetry={() => onRetryFile(file.id)}
            onResolveDuplicate={(action) => onResolveDuplicate(file.id, action)}
          />
        ))}
      </div>
    </div>
  );
}
