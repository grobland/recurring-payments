"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { DashboardHeader } from "@/components/layout";
import { BatchUploader } from "@/components/batch/batch-uploader";
import { IncompleteBatchBanner } from "@/components/sources/incomplete-batch-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BatchUploadResult } from "@/lib/hooks/use-batch-upload";

export default function BatchImportPage() {
  const router = useRouter();
  const [result, setResult] = useState<BatchUploadResult | null>(null);

  const handleComplete = (uploadResult: BatchUploadResult) => {
    setResult(uploadResult);
  };

  const handleStartNew = () => {
    setResult(null);
  };

  return (
    <>
      <DashboardHeader
        title="Batch Import"
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Batch Import" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Incomplete batch warning */}
          <IncompleteBatchBanner />

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Batch Import Statements
            </h2>
            <p className="text-muted-foreground">
              Upload multiple bank statements at once. We&apos;ll store all transactions
              and automatically detect potential subscriptions.
            </p>
          </div>

          {/* Result or Uploader */}
          {result ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Batch Import Complete!</h3>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <p>
                    {result.successful} of {result.totalFiles} files processed successfully
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {result.totalTransactions} transactions found
                  </p>
                  {result.failed > 0 && (
                    <p className="text-destructive">
                      {result.failed} file{result.failed !== 1 ? "s" : ""} failed
                    </p>
                  )}
                  {result.skipped > 0 && (
                    <p className="text-yellow-600 dark:text-yellow-400">
                      {result.skipped} duplicate{result.skipped !== 1 ? "s" : ""} skipped
                    </p>
                  )}
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={handleStartNew}
                    className="w-full sm:w-auto h-11"
                  >
                    Import More
                  </Button>
                  <Button
                    onClick={() => router.push("/payments/subscriptions")}
                    className="w-full sm:w-auto h-11"
                  >
                    View Subscriptions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <BatchUploader onComplete={handleComplete} />
          )}

          {/* Help text */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">How batch import works:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Select the bank/credit card account for all statements</li>
              <li>Drag and drop your PDF statements (up to 12+ files)</li>
              <li>Files are processed one at a time to avoid memory issues</li>
              <li>All transactions are stored for future browsing</li>
              <li>Recurring charges are automatically flagged as potential subscriptions</li>
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
