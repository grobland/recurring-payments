"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDuplicateScan, type DuplicatePair } from "@/lib/hooks/use-duplicate-scan";
import { useMergeSubscription } from "@/lib/hooks/use-merge-subscription";
import { MergeFieldPicker } from "./merge-field-picker";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * DuplicateScanSection - Self-contained section for the subscriptions page
 * Includes "Find Duplicates" button and inline results display
 */
export function DuplicateScanSection() {
  const { mutate: scan, isPending, data, isSuccess, reset } = useDuplicateScan();
  const [showNoDuplicates, setShowNoDuplicates] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Show "no duplicates" message for 3 seconds then hide
  useEffect(() => {
    if (isSuccess && data?.duplicates.length === 0) {
      setShowNoDuplicates(true);
      const timer = setTimeout(() => {
        setShowNoDuplicates(false);
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, data, reset]);

  const duplicates = data?.duplicates ?? [];
  const hasDuplicates = duplicates.length > 0;

  return (
    <div className="space-y-4">
      {/* Scan button and status */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => scan()}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Find Duplicates
            </>
          )}
        </Button>

        {/* No duplicates success message */}
        {showNoDuplicates && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in duration-200">
            <Check className="h-4 w-4" />
            <span>No duplicates found</span>
          </div>
        )}
      </div>

      {/* Duplicate results section */}
      {hasDuplicates && (
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="p-4">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-3">
                {duplicates.map((pair, index) => (
                  <DuplicatePairCard
                    key={`${pair.sub1.id}-${pair.sub2.id}`}
                    pair={pair}
                    onMergeComplete={() => {
                      // Remove this pair from display by rescanning
                      scan();
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DuplicatePairCardProps {
  pair: DuplicatePair;
  onMergeComplete: () => void;
}

function DuplicatePairCard({ pair, onMergeComplete }: DuplicatePairCardProps) {
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const mergeMutation = useMergeSubscription();

  const handleMerge = (selectedFields: {
    name: "target" | "source";
    amount: "target" | "source";
    frequency: "target" | "source";
    category: "target" | "source";
    nextRenewalDate: "target" | "source";
  }) => {
    // Determine which is target (older/original) and which is source (newer/duplicate)
    // By default, keep the older one as target
    const sub1IsOlder = new Date(pair.sub1.createdAt) <= new Date(pair.sub2.createdAt);
    const target = sub1IsOlder ? pair.sub1 : pair.sub2;
    const source = sub1IsOlder ? pair.sub2 : pair.sub1;

    mergeMutation.mutate(
      {
        targetId: target.id,
        sourceId: source.id,
        selectedFields,
      },
      {
        onSuccess: () => {
          setShowMergeDialog(false);
          onMergeComplete();
        },
      }
    );
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-900">
        <div className="flex flex-1 items-center gap-4">
          {/* First subscription */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{pair.sub1.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(parseFloat(pair.sub1.amount), pair.sub1.currency)}
              {" / "}
              {pair.sub1.frequency}
            </p>
          </div>

          {/* Similarity badge */}
          <Badge
            variant={pair.score >= 90 ? "destructive" : "secondary"}
            className="shrink-0"
          >
            {pair.score}% match
          </Badge>

          {/* Second subscription */}
          <div className="flex-1 min-w-0 text-right">
            <p className="font-medium truncate">{pair.sub2.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(parseFloat(pair.sub2.amount), pair.sub2.currency)}
              {" / "}
              {pair.sub2.frequency}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="ml-4 h-9"
          onClick={() => setShowMergeDialog(true)}
        >
          Merge
        </Button>
      </div>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge Subscriptions</DialogTitle>
            <DialogDescription>
              Choose which values to keep for each field. The other subscription will be removed.
            </DialogDescription>
          </DialogHeader>
          <MergeFieldPicker
            sub1={pair.sub1}
            sub2={pair.sub2}
            onMerge={handleMerge}
            onCancel={() => setShowMergeDialog(false)}
            isPending={mergeMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Also export the results component for reuse
export { DuplicatePairCard as DuplicateScanResults };
