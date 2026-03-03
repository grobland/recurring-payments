"use client";

import { AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface OverlapBadgeProps {
  /** Names of the OTHER subscriptions in the same overlap group (not this one) */
  otherNames: string[];
  /** The categoryId this overlap group belongs to */
  categoryId: string;
  /** Called when user clicks the X to dismiss this group */
  onDismiss: (categoryId: string) => void;
}

/**
 * Displays a warning badge for subscriptions sharing the same category
 * with other active subscriptions (overlap group).
 *
 * - Yellow warning badge with AlertTriangle icon and "Overlap" label
 * - Tooltip listing the other subscriptions in the same category
 * - X button to dismiss the warning for this category group
 */
export function OverlapBadge({ otherNames, categoryId, onDismiss }: OverlapBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1">
          <Badge variant="warning" className="cursor-help text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overlap
          </Badge>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(categoryId);
            }}
            aria-label="Dismiss overlap warning"
            className="ml-0.5 rounded-sm text-warning hover:text-warning/80 focus:outline-none"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 max-w-xs">
          <p className="font-medium text-xs">Also in same category:</p>
          {otherNames.map((name) => (
            <p key={name} className="text-xs">
              {name}
            </p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
