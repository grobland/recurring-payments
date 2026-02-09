"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BulkActionsBarProps {
  selectedCount: number;
  onAcceptAll: () => void;
  onDismissAll: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

/**
 * Floating action bar for bulk pattern operations.
 * Appears fixed at bottom center when selections exist.
 * Provides Accept All, Dismiss All, and Clear buttons.
 *
 * @example
 * ```tsx
 * <BulkActionsBar
 *   selectedCount={selectedIds.size}
 *   onAcceptAll={() => bulkAccept.mutate({ patternIds: Array.from(selectedIds) })}
 *   onDismissAll={() => bulkDismiss.mutate({ patternIds: Array.from(selectedIds) })}
 *   onClearSelection={() => setSelectedIds(new Set())}
 *   isProcessing={bulkAccept.isPending || bulkDismiss.isPending}
 * />
 * ```
 */
export function BulkActionsBar({
  selectedCount,
  onAcceptAll,
  onDismissAll,
  onClearSelection,
  isProcessing = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Card className="flex items-center gap-4 p-4 shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismissAll}
            disabled={isProcessing}
          >
            <X className="size-4" />
            Dismiss All
          </Button>
          <Button
            size="sm"
            onClick={onAcceptAll}
            disabled={isProcessing}
          >
            <Check className="size-4" />
            Accept All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear
          </Button>
        </div>
      </Card>
    </div>
  );
}
