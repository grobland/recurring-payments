"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Calendar,
  DollarSign,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils/currency";
import { getConfidenceTier } from "@/lib/utils/pattern-detection";
import type { PatternSuggestion } from "@/lib/validations/patterns";

interface PatternSuggestionItemProps {
  pattern: PatternSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
}

/**
 * Individual pattern suggestion with evidence display and action buttons.
 * Shows merchant name, amount, frequency, confidence badge, and expandable evidence.
 */
export function PatternSuggestionItem({
  pattern,
  onAccept,
  onDismiss,
  isAccepting = false,
  isDismissing = false,
}: PatternSuggestionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const confidenceTier = getConfidenceTier(pattern.confidenceScore);
  const confidenceColors = {
    high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  // Format frequency for display
  const frequencyLabel = pattern.detectedFrequency
    ? pattern.detectedFrequency === "monthly"
      ? "/month"
      : "/year"
    : "";

  // Parse charge dates for evidence display
  const chargeDates = pattern.chargeDates.map((d) => new Date(d));

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium truncate">{pattern.merchantName}</h4>
            <Badge
              variant="outline"
              className={confidenceColors[confidenceTier]}
            >
              {pattern.confidenceScore}% match
            </Badge>
          </div>

          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(pattern.avgAmount, pattern.currency)}
              {frequencyLabel}
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              {pattern.occurrenceCount} occurrences
            </span>
            {pattern.avgIntervalDays && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                ~{pattern.avgIntervalDays} days apart
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            disabled={isAccepting || isDismissing}
            className="h-9 w-9 p-0"
            title="Dismiss pattern"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isAccepting || isDismissing}
            className="h-9"
          >
            {isAccepting ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Adding...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Accept
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable evidence section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full justify-start text-muted-foreground hover:text-foreground"
          >
            {isOpen ? (
              <>
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
                Hide evidence
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
                Show evidence ({pattern.occurrenceCount} charges)
              </>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="rounded-md border bg-muted/50 p-3">
            <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Detected Charges
            </h5>
            <div className="space-y-1">
              {chargeDates.map((date, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{format(date, "MMM d, yyyy")}</span>
                  <span className="font-medium">
                    {formatCurrency(pattern.amounts[index], pattern.currency)}
                  </span>
                </div>
              ))}
            </div>

            {pattern.detectedFrequency && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Detected as{" "}
                  <span className="font-medium text-foreground">
                    {pattern.detectedFrequency}
                  </span>{" "}
                  subscription
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
