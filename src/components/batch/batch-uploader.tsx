"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountCombobox } from "@/components/import/account-combobox";
import { FileQueue } from "./file-queue";
import { useBatchUpload } from "@/lib/hooks/use-batch-upload";
import { cn } from "@/lib/utils";

interface BatchUploaderProps {
  onComplete?: (result: {
    totalFiles: number;
    successful: number;
    failed: number;
    skipped: number;
    totalTransactions: number;
  }) => void;
}

export function BatchUploader({ onComplete }: BatchUploaderProps) {
  // Account selection (UUID)
  const [accountId, setAccountId] = useState("");

  // Batch upload hook
  const {
    queue,
    stats,
    isProcessing,
    addFiles,
    removeFile,
    cancelAll,
    retryFile,
    resolveDuplicate,
    startProcessing,
  } = useBatchUpload({
    accountId,
    onComplete,
  });

  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: !accountId || isProcessing,
  });

  const canProcess = queue.length > 0 && stats.pending > 0 && !isProcessing && accountId;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Account selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Account <span className="text-destructive">*</span>
          </label>
          <AccountCombobox
            value={accountId}
            onChange={setAccountId}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            All files in this batch will be associated with this account.
            To create a new account go to the{" "}
            <Link href="/accounts" className="text-primary underline underline-offset-2 hover:text-primary/80">
              Accounts
            </Link>{" "}
            page.
          </p>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            (!accountId || isProcessing) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">
            {isDragActive
              ? "Drop the files here..."
              : "Drag & drop PDF statements here, or click to select"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF files only, max 50MB each. Upload 12+ statements at once.
          </p>
        </div>

        {/* File queue */}
        <FileQueue
          files={queue}
          isProcessing={isProcessing}
          stats={stats}
          onRemoveFile={removeFile}
          onRetryFile={retryFile}
          onResolveDuplicate={resolveDuplicate}
          onCancelAll={cancelAll}
        />

        {/* Process button */}
        {queue.length > 0 && (
          <Button
            onClick={startProcessing}
            disabled={!canProcess}
            className="w-full h-11"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {stats.processing} of {stats.total}...
              </>
            ) : (
              <>
                Process {stats.pending} File{stats.pending !== 1 ? "s" : ""}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
