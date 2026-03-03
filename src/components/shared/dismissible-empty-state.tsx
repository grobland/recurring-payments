"use client";

import { X } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useHintDismissals } from "@/lib/hooks/use-hint-dismissals";

interface DismissibleEmptyStateProps {
  /** Unique page identifier for dismissal persistence (e.g., "subscriptions", "vault") */
  pageId: string;
  /** Minimal text shown after dismissal (e.g., "No subscriptions yet") */
  dismissedText: string;
  /** Props passed through to EmptyState when not dismissed */
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export function DismissibleEmptyState({
  pageId,
  dismissedText,
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: DismissibleEmptyStateProps) {
  const { isDismissed, dismiss } = useHintDismissals();

  // Post-dismiss: minimal text line
  if (isDismissed(pageId)) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {dismissedText}
      </p>
    );
  }

  // Full empty state with dismiss X button
  return (
    <div className="relative">
      <button
        onClick={() => dismiss(pageId)}
        className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss hint"
      >
        <X className="h-4 w-4" />
      </button>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />
    </div>
  );
}
