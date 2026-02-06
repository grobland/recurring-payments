"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DuplicateWarningProps {
  /** Similarity score (0-100) */
  score: number;
  /** Name of the existing subscription this matches */
  existingName: string;
  /** Which fields matched (for tooltip display) */
  matches: {
    name: boolean;
    amount: boolean;
    frequency: boolean;
    category?: boolean;
    source?: boolean;
  };
}

/**
 * Displays a warning badge for potential duplicate subscriptions.
 *
 * Two-tier display:
 * - 85%+ similarity: Red/destructive badge with AlertTriangle icon
 * - 70-84%: Yellow/warning badge, smaller styling
 */
export function DuplicateWarning({ score, existingName, matches }: DuplicateWarningProps) {
  // Build list of matching fields for tooltip
  const matchingFields: string[] = [];
  if (matches.name) matchingFields.push("name");
  if (matches.amount) matchingFields.push("amount");
  if (matches.frequency) matchingFields.push("frequency");
  if (matches.category) matchingFields.push("category");
  if (matches.source) matchingFields.push("source");

  const matchingText = matchingFields.length > 0
    ? `Matching: ${matchingFields.join(", ")}`
    : "Partial match";

  // Two-tier display based on score
  const isHighSimilarity = score >= 85;
  const variant = isHighSimilarity ? "destructive" : "warning";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          className={isHighSimilarity ? "cursor-help" : "cursor-help text-xs"}
        >
          {isHighSimilarity && <AlertTriangle className="h-3 w-3" />}
          {score}% match
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 max-w-xs">
          <p className="font-medium">Potential duplicate of &ldquo;{existingName}&rdquo;</p>
          <p className="text-xs opacity-80">{matchingText}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
