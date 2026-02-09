"use client";

import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color: string;
  className?: string;
}

/**
 * Colored pill badge for displaying applied tags on transactions.
 * Uses the tag's color for background with white text for contrast.
 */
export function TagBadge({ name, color, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
