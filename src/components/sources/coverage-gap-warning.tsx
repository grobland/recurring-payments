"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CoverageGapWarningProps {
  /** Array of missing months in YYYY-MM format */
  gaps: string[];
}

/**
 * Warning badge showing coverage gaps in statement data.
 * Displays a badge with gap count and tooltip with missing months.
 */
export function CoverageGapWarning({ gaps }: CoverageGapWarningProps) {
  if (!gaps || gaps.length === 0) {
    return null;
  }

  // Format gaps for display: "2024-01" -> "Jan 2024"
  const formatGap = (gap: string): string => {
    const [year, month] = gap.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // Show max 3 gaps with +N more
  const maxVisible = 3;
  const visibleGaps = gaps.slice(0, maxVisible);
  const remainingCount = gaps.length - maxVisible;

  const gapText =
    gaps.length === 1
      ? `${gaps.length} gap`
      : `${gaps.length} gaps`;

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-medium">Missing statements:</p>
      <ul className="list-disc list-inside">
        {visibleGaps.map((gap) => (
          <li key={gap}>{formatGap(gap)}</li>
        ))}
        {remainingCount > 0 && (
          <li className="text-muted-foreground">+{remainingCount} more</li>
        )}
      </ul>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="warning"
          className="cursor-help gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          {gapText}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

export default CoverageGapWarning;
