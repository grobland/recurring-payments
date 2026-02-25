"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIncompleteBatch } from "@/lib/hooks/use-incomplete-batch";

/**
 * Yellow warning banner that appears when a previous batch import was interrupted.
 * Shows progress info and allows user to Resume or Discard the incomplete batch.
 */
export function IncompleteBatchBanner() {
  const { batch, discard } = useIncompleteBatch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't render if no incomplete batch
  if (!batch) {
    return null;
  }

  const { processed, total, lastError, pendingFiles } = batch;

  // Build progress text
  const progressText = `${processed} of ${total} files processed`;

  // Build error text if available
  const errorText = lastError ? `(${lastError})` : null;

  const handleDiscard = () => {
    discard();
    setIsDialogOpen(false);
  };

  return (
    <div className="relative flex items-center justify-between gap-4 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Incomplete import:</strong> {progressText}
          {errorText && (
            <span className="ml-1 text-amber-700 dark:text-amber-300">
              {errorText}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 border-amber-300 hover:bg-amber-200 dark:border-amber-700 dark:hover:bg-amber-800"
        >
          <Link href="/vault/load">Resume</Link>
        </Button>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-amber-700 hover:bg-amber-200 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-800 dark:hover:text-amber-100"
            >
              Discard
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard incomplete import?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {pendingFiles.length} unprocessed file
                {pendingFiles.length !== 1 ? "s" : ""} from the queue.
                {processed > 0 && (
                  <>
                    {" "}
                    The {processed} already processed file
                    {processed !== 1 ? "s" : ""} will remain in your account.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDiscard}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default IncompleteBatchBanner;
