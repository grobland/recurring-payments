"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getConfidenceTier, CONFIDENCE_THRESHOLDS } from "@/lib/utils/pattern-detection";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  showTooltip?: boolean;
}

/**
 * Color-coded confidence score badge with optional tooltip.
 * Uses getConfidenceTier() for tier classification.
 * high = green, medium = yellow, low = red
 */
export function ConfidenceBadge({ score, showTooltip = true }: ConfidenceBadgeProps) {
  const tier = getConfidenceTier(score);

  const tierColors = {
    high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const tierDescriptions = {
    high: `High confidence (${CONFIDENCE_THRESHOLDS.HIGH}%+): Strong recurring pattern with consistent timing and amounts.`,
    medium: `Medium confidence (${CONFIDENCE_THRESHOLDS.MEDIUM}-${CONFIDENCE_THRESHOLDS.HIGH - 1}%): Likely recurring, but timing or amounts vary somewhat.`,
    low: `Low confidence (<${CONFIDENCE_THRESHOLDS.MEDIUM}%): Pattern detected, but may not be a true subscription.`,
  };

  const badge = (
    <Badge variant="outline" className={cn(tierColors[tier])}>
      {score}% match
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tierDescriptions[tier]}
      </TooltipContent>
    </Tooltip>
  );
}
