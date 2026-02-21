"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HistoricalUploadModalProps {
  open: boolean;
  onClose: () => void;
  sourceType: string;
  /** Month in "yyyy-MM" format, e.g. "2026-02" */
  targetMonth: string;
  /** "missing" = gray cell (new upload), "attach" = yellow cell (add PDF to existing data) */
  mode: "missing" | "attach";
  /** Present when mode === "attach" */
  statementId?: string;
}

/**
 * Upload wizard modal for filling coverage grid gaps.
 *
 * - "missing" mode: uploads a new statement PDF via /api/batch/upload
 * - "attach" mode: attaches a PDF to an existing statement via /api/vault/attach-pdf
 *
 * On success, invalidates vault coverage cache so the grid refreshes automatically.
 */
export function HistoricalUploadModal({
  open,
  onClose,
  sourceType,
  targetMonth,
  mode,
  statementId,
}: HistoricalUploadModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsUploading(false);
      setError(null);
    }
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50 MB
    disabled: isUploading,
  });

  const monthLabel = format(parseISO(targetMonth + "-01"), "MMMM yyyy");

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (mode === "attach") {
        formData.append("statementId", statementId!);
        const res = await fetch("/api/vault/attach-pdf", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error ?? "Upload failed");
        }
      } else {
        formData.append("sourceType", sourceType);
        formData.append("statementDate", targetMonth);
        const { hashFile } = await import("@/lib/utils/file-hash");
        const hash = await hashFile(file);
        formData.append("hash", hash);
        const res = await fetch("/api/batch/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error ?? "Upload failed");
        }
        const uploadResult = (await res.json()) as {
          statementId?: string;
          isDuplicate?: boolean;
        };

        // Trigger AI processing so transactions get extracted and the
        // statement moves to "complete" (coverage grid needs statementDate
        // which batch/process derives from transactions if not already set)
        if (uploadResult.statementId && !uploadResult.isDuplicate) {
          const processForm = new FormData();
          processForm.append("statementId", uploadResult.statementId);
          processForm.append("file", file);
          await fetch("/api/batch/process", {
            method: "POST",
            body: processForm,
          });
        }
      }

      // Invalidate coverage + related caches so the grid updates
      await queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
      await queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
      await queryClient.invalidateQueries({ queryKey: ["sources"] });

      toast.success("PDF stored successfully");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRetry() {
    setError(null);
  }

  function handleClearFile() {
    setFile(null);
    setError(null);
  }

  const titleText =
    mode === "attach"
      ? `Attach PDF — ${sourceType}`
      : `Upload Statement — ${sourceType}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode-specific informational message */}
          {mode === "attach" ? (
            <p className="text-sm text-muted-foreground">
              You have data for this month but no PDF. Drop a file below to
              attach the original statement.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upload a statement PDF for this source and month.
            </p>
          )}

          {/* Dropzone area */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "min-h-[120px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors px-4 py-6",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="size-6 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-muted-foreground">Drop file here</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drop PDF here or click to browse
                </p>
              )}
            </div>
          ) : (
            /* File selected state */
            <div className="min-h-[120px] rounded-lg border flex flex-col items-center justify-center gap-2 px-4 py-6 bg-muted/20">
              <div className="flex items-center gap-2 w-full max-w-xs">
                <Upload className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={isUploading}
                  className="ml-1 rounded-sm p-0.5 hover:bg-muted transition-colors disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Error message with retry */}
          {error && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Upload button */}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
