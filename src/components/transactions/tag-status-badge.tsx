"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TagStatus } from "@/types/transaction";

interface TagStatusBadgeProps {
  status: TagStatus | string;
  className?: string;
}

/**
 * Badge component for displaying transaction tag status.
 * Returns null for "unreviewed" status (no badge shown).
 */
export function TagStatusBadge({ status, className }: TagStatusBadgeProps) {
  switch (status) {
    case "unreviewed":
      return null;

    case "potential_subscription":
      return (
        <Badge
          className={cn(
            "bg-blue-500 text-white text-xs hover:bg-blue-600",
            className
          )}
        >
          Potential
        </Badge>
      );

    case "converted":
      return (
        <Badge variant="success" className={cn("text-xs", className)}>
          Converted
        </Badge>
      );

    case "not_subscription":
      return (
        <Badge variant="secondary" className={cn("text-xs", className)}>
          Dismissed
        </Badge>
      );

    default:
      return null;
  }
}
