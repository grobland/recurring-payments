"use client";

import { useState } from "react";
import { BarChart3, CheckCircle2, FileText, RefreshCw, TrendingUp } from "lucide-react";
import { BatchUploader as CoreBatchUploader } from "@/components/batch/batch-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BatchUploadResult } from "@/lib/hooks/use-batch-upload";

/**
 * Extended processing stats after a batch upload completes.
 * Shows recurring payment intelligence metrics alongside base upload stats.
 */
interface ProcessingStats {
  totalFiles: number;
  successful: number;
  failed: number;
  skipped: number;
  totalTransactions: number;
}

interface StatItemProps {
  label: string;
  value: number | string;
  description?: string;
  highlight?: boolean;
}

function StatItem({ label, value, description, highlight }: StatItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {value}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
  );
}

interface ProcessingResultsPanelProps {
  stats: ProcessingStats;
  onReset: () => void;
}

/**
 * Processing Results panel shown after a batch upload completes.
 * Displays file counts, transaction counts, and a prompt to check recurring payments.
 */
function ProcessingResultsPanel({ stats, onReset }: ProcessingResultsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Success indicator */}
      <div className="flex items-center gap-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Batch processing complete
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            {stats.successful} of {stats.totalFiles} file{stats.totalFiles !== 1 ? "s" : ""} processed
            {stats.failed > 0 && ` · ${stats.failed} failed`}
            {stats.skipped > 0 && ` · ${stats.skipped} duplicate${stats.skipped !== 1 ? "s" : ""} skipped`}
          </p>
        </div>
      </div>

      {/* Processing stats grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Processing Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <StatItem
              label="Files processed"
              value={stats.successful}
              description="PDFs extracted"
            />
            <StatItem
              label="Transactions found"
              value={stats.totalTransactions}
              description="Lines imported"
              highlight={stats.totalTransactions > 0}
            />
            {stats.skipped > 0 && (
              <StatItem
                label="Duplicates skipped"
                value={stats.skipped}
                description="Already uploaded"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recurring intelligence prompt */}
      {stats.totalTransactions > 0 && (
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Recurring payment detection running
            </p>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Transactions have been normalised and merchant entities resolved.
            Recurring pattern detection will automatically identify and link
            recurring charges. Check the Recurring Payments dashboard to review results.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <a
              href="/payments/recurring"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              View recurring payments
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Upload more
        </Button>
      </div>
    </div>
  );
}

interface BatchUploaderWithStatsProps {
  /** Optional callback when batch processing completes */
  onComplete?: (result: BatchUploadResult) => void;
}

/**
 * Extended batch uploader for the vault page.
 * Wraps the core BatchUploader and adds a "Processing Results" panel after
 * successful upload, showing file counts, transaction totals, and a link to
 * the Recurring Payments dashboard to review detected patterns.
 *
 * This is the vault-specific entry point (UI-02).
 * The core upload mechanics live in @/components/batch/batch-uploader.
 */
export function BatchUploaderWithStats({ onComplete }: BatchUploaderWithStatsProps) {
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);

  const handleComplete = (result: BatchUploadResult) => {
    // Only show stats panel if at least one file was processed
    if (result.successful > 0 || result.failed > 0) {
      setProcessingStats({
        totalFiles: result.totalFiles,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        totalTransactions: result.totalTransactions,
      });
    }
    onComplete?.(result);
  };

  const handleReset = () => {
    setProcessingStats(null);
  };

  if (processingStats) {
    return (
      <ProcessingResultsPanel
        stats={processingStats}
        onReset={handleReset}
      />
    );
  }

  return <CoreBatchUploader onComplete={handleComplete} />;
}
