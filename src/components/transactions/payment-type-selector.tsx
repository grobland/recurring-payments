"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PaymentType } from "@/types/transaction";
import { PAYMENT_TYPES } from "@/types/transaction";

interface PaymentTypeSelectorProps {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}

const LABELS: Record<PaymentType, string> = {
  all: "All",
  recurring: "Recurring",
  subscriptions: "Subscriptions",
  "one-time": "One-time",
};

/**
 * Segmented control (iOS-style connected pill group) for filtering transactions
 * by payment type. Active segment has filled background; others ghost/outline.
 *
 * Positioned above existing filters in TransactionBrowser.
 * Default value is "all" (no URL param).
 */
export function PaymentTypeSelector({
  value,
  onChange,
}: PaymentTypeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        // Prevent deselection — Radix sends "" when clicking the active item
        if (v) onChange(v as PaymentType);
      }}
      variant="outline"
      spacing={0}
      className="w-fit border rounded-lg p-0.5 bg-muted/40"
    >
      {PAYMENT_TYPES.map((type) => (
        <ToggleGroupItem
          key={type}
          value={type}
          aria-label={`Show ${LABELS[type].toLowerCase()} transactions`}
          className="px-4 text-sm rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground border-0"
        >
          {LABELS[type]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
