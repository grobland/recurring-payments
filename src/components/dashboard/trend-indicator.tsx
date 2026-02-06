"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import type { MoMChange } from "@/types/analytics";

interface TrendIndicatorProps {
  /** Month-over-month change data */
  change: MoMChange;
  /** Currency for formatting */
  currency: string;
  /** Optional className for container */
  className?: string;
}

/**
 * Displays month-over-month spending change with direction indicator.
 *
 * Per CONTEXT.md: Red for increases (bad), green for decreases (good) in spending context.
 * Display format: +$24 (+12%) or -$15 (-8%)
 */
export function TrendIndicator({ change, currency, className }: TrendIndicatorProps) {
  const { absolute, percentage, direction } = change;

  // Determine styling based on direction
  // Red = spending went UP (bad), Green = spending went DOWN (good)
  const isIncrease = direction === "up";
  const isDecrease = direction === "down";

  const colorClass = isIncrease
    ? "text-red-500"
    : isDecrease
    ? "text-green-500"
    : "text-muted-foreground";

  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;

  // Format sign for display
  const sign = absolute > 0 ? "+" : absolute < 0 ? "" : "";
  const percentSign = percentage > 0 ? "+" : percentage < 0 ? "" : "";

  return (
    <div className={cn("flex items-center gap-1 text-sm", colorClass, className)}>
      <Icon className="h-4 w-4" />
      <span>
        {sign}{formatCurrency(Math.abs(absolute), currency)} ({percentSign}{percentage.toFixed(1)}%)
      </span>
    </div>
  );
}
