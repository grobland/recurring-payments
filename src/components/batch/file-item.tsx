"use client";

import { FileText, X, RotateCcw, Check, AlertTriangle, Clock, Upload, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QueuedFile, FileStatus, DuplicateAction } from "@/lib/hooks/use-batch-upload";

interface FileItemProps {
  file: QueuedFile;
  onRemove: () => void;
  onRetry: () => void;
  onResolveDuplicate: (action: DuplicateAction) => void;
}

const statusConfig: Record<FileStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
  animate?: boolean;
}> = {
  pending: { icon: Clock, label: "Waiting", color: "text-muted-foreground" },
  hashing: { icon: Loader2, label: "Hashing...", color: "text-blue-500", animate: true },
  checking: { icon: Loader2, label: "Checking...", color: "text-blue-500", animate: true },
  uploading: { icon: Upload, label: "Uploading...", color: "text-blue-500", animate: true },
  storing: { icon: Database, label: "Storing PDF...", color: "text-blue-500", animate: true },
  processing: { icon: Loader2, label: "Processing...", color: "text-blue-500", animate: true },
  complete: { icon: Check, label: "Complete", color: "text-green-500" },
  error: { icon: AlertTriangle, label: "Failed", color: "text-destructive" },
  duplicate: { icon: AlertTriangle, label: "Duplicate", color: "text-yellow-500" },
};

export function FileItem({ file, onRemove, onRetry, onResolveDuplicate }: FileItemProps) {
  const { icon: StatusIcon, label, color, animate } = statusConfig[file.status];
  const isActive = ["hashing", "checking", "uploading", "storing", "processing"].includes(file.status);
  const canRemove = file.status === "pending" || file.status === "error" || file.status === "complete";
  const canRetry = file.status === "error";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isActive && "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
        file.status === "complete" && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
        file.status === "error" && "border-destructive/50 bg-destructive/5",
        file.status === "duplicate" && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20"
      )}
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className="mt-0.5">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{file.file.name}</p>
            <Badge variant="outline" className="shrink-0">
              {(file.file.size / 1024 / 1024).toFixed(1)} MB
            </Badge>
          </div>

          {/* Status line */}
          <div className={cn("flex items-center gap-2 mt-1 text-sm", color)}>
            <StatusIcon className={cn("h-4 w-4", animate && "animate-spin")} />
            <span>{label}</span>
            {file.status === "complete" && file.transactionCount !== null && (
              <span className="text-muted-foreground">
                ({file.transactionCount} transactions)
              </span>
            )}
          </div>

          {/* Storage status messages */}
          {file.status === "complete" && file.pdfStored === false && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">
              PDF could not be stored — subscriptions imported successfully
            </p>
          )}
          {file.status === "complete" && file.pdfStored === true && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
              PDF stored successfully
            </p>
          )}

          {/* View PDF link for files with stored PDFs */}
          {file.status === "complete" && file.pdfStored === true && file.statementId && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary mt-0.5"
              onClick={async () => {
                const res = await fetch(`/api/statements/${file.statementId}/pdf-url`);
                if (res.ok) {
                  const { url } = await res.json();
                  window.open(url, "_blank");
                }
              }}
            >
              View PDF
            </Button>
          )}

          {/* Error message */}
          {file.status === "error" && file.error && (
            <p className="text-sm text-destructive mt-1">{file.error}</p>
          )}

          {/* Progress bar */}
          {isActive && (
            <Progress value={file.progress} className="mt-2 h-1.5" />
          )}

          {/* Duplicate resolution */}
          {file.status === "duplicate" && file.duplicateInfo && (
            <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm">
              <p className="text-yellow-800 dark:text-yellow-200">
                This file was already uploaded as &quot;{file.duplicateInfo.filename}&quot;
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => onResolveDuplicate("skip")}
                >
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => onResolveDuplicate("reimport")}
                  disabled
                  title="Re-import coming soon"
                >
                  Re-import
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRetry}
              title="Retry"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRemove}
              title="Remove"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
