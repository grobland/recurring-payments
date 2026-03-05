"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import dynamic from "next/dynamic";
import { ConfidenceBadge } from "./confidence-badge";
import { EvidenceList } from "./evidence-list";

const SuggestionTimeline = dynamic(
  () => import("./suggestion-timeline").then((m) => ({ default: m.SuggestionTimeline })),
  { ssr: false, loading: () => <div className="h-20 w-full animate-pulse bg-accent rounded-md" /> }
);
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { PatternSuggestion } from "@/lib/validations/patterns";

interface SuggestionCardProps {
  pattern: PatternSuggestion;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
}

/**
 * Get frequency label for display.
 * Monthly, Yearly, or nothing for unknown frequencies.
 */
function getFrequencyLabel(frequency: "monthly" | "yearly" | null): string {
  if (frequency === "monthly") return "Monthly";
  if (frequency === "yearly") return "Yearly";
  return "";
}

/**
 * Individual suggestion card with expandable details.
 * Shows compact summary with checkbox, expands to show timeline and evidence.
 */
export function SuggestionCard({
  pattern,
  isSelected,
  onToggleSelect,
  onAccept,
  onDismiss,
  isAccepting = false,
  isDismissing = false,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isProcessing = isAccepting || isDismissing;
  const frequencyLabel = getFrequencyLabel(pattern.detectedFrequency);

  return (
    <Card
      className={cn(
        "transition-colors",
        isSelected && "ring-2 ring-primary",
        isProcessing && "opacity-60"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed state - compact view */}
        <div className="flex items-center gap-3 p-4">
          {/* Checkbox for multi-select */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(pattern.id)}
            disabled={isProcessing}
            aria-label={`Select ${pattern.merchantName}`}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Merchant + Confidence */}
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{pattern.merchantName}</span>
              <ConfidenceBadge score={pattern.confidenceScore} />
            </div>

            {/* Row 2: Amount + Frequency + Occurrences */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">
                {formatCurrency(pattern.avgAmount, pattern.currency)}
              </span>
              {frequencyLabel && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>{frequencyLabel}</span>
                </>
              )}
              <span className="text-muted-foreground/50">|</span>
              <span>{pattern.occurrenceCount} charges</span>
              {pattern.avgIntervalDays && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>~{Math.round(pattern.avgIntervalDays)} day interval</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              disabled={isProcessing}
              aria-label="Dismiss suggestion"
              className="h-8 w-8 p-0"
            >
              <X className="size-4" />
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isProcessing}
            >
              <Check className="size-4" />
              Accept
            </Button>
          </div>
        </div>

        {/* Expand/collapse trigger */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-1 w-full px-4 py-2 text-sm text-muted-foreground",
              "border-t hover:bg-muted/50 transition-colors"
            )}
          >
            {isExpanded ? (
              <>
                Hide evidence
                <ChevronUp className="size-4" />
              </>
            ) : (
              <>
                Show evidence ({pattern.chargeDates.length} charges)
                <ChevronDown className="size-4" />
              </>
            )}
          </button>
        </CollapsibleTrigger>

        {/* Expanded state - timeline and evidence */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            <SuggestionTimeline
              chargeDates={pattern.chargeDates}
              amounts={pattern.amounts}
              currency={pattern.currency}
            />
            <EvidenceList
              chargeDates={pattern.chargeDates}
              amounts={pattern.amounts}
              currency={pattern.currency}
              merchantName={pattern.merchantName}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
