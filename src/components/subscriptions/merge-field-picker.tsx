"use client";

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

interface SubscriptionData {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: "monthly" | "yearly";
  categoryId: string | null;
  categoryName?: string | null;
  createdAt: Date;
  nextRenewalDate?: Date;
}

interface MergeFieldPickerProps {
  sub1: SubscriptionData;
  sub2: SubscriptionData;
  onMerge: (selectedFields: {
    name: "target" | "source";
    amount: "target" | "source";
    frequency: "target" | "source";
    category: "target" | "source";
    nextRenewalDate: "target" | "source";
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

type FieldSelection = "target" | "source";

interface FieldState {
  name: FieldSelection;
  amount: FieldSelection;
  frequency: FieldSelection;
  category: FieldSelection;
  nextRenewalDate: FieldSelection;
}

/**
 * MergeFieldPicker - Field-by-field selection UI for merging subscriptions
 *
 * By convention, sub1 becomes "target" (the one kept) and sub2 becomes "source" (the one merged in).
 * The component determines defaults based on which subscription is newer.
 */
export function MergeFieldPicker({
  sub1,
  sub2,
  onMerge,
  onCancel,
  isPending = false,
}: MergeFieldPickerProps) {
  // Determine which is newer (prefer newer values as default)
  const sub1IsNewer = new Date(sub1.createdAt) > new Date(sub2.createdAt);

  // Initialize with "newer wins" defaults
  const defaultSelection: FieldState = useMemo(() => {
    const newerDefault: FieldSelection = sub1IsNewer ? "target" : "source";
    return {
      name: newerDefault,
      amount: newerDefault,
      frequency: newerDefault,
      category: newerDefault,
      nextRenewalDate: newerDefault,
    };
  }, [sub1IsNewer]);

  const [selection, setSelection] = useState<FieldState>(defaultSelection);

  // Target = sub1, Source = sub2
  const target = sub1;
  const source = sub2;

  const handleFieldChange = (field: keyof FieldState, value: FieldSelection) => {
    setSelection((prev) => ({ ...prev, [field]: value }));
  };

  const handleMerge = () => {
    onMerge(selection);
  };

  // Check if values are identical for a field
  const isNameIdentical = target.name === source.name;
  const isAmountIdentical =
    target.amount === source.amount && target.currency === source.currency;
  const isFrequencyIdentical = target.frequency === source.frequency;
  const isCategoryIdentical = target.categoryId === source.categoryId;

  return (
    <div className="space-y-6">
      {/* Name field */}
      <FieldRow
        label="Name"
        field="name"
        targetValue={target.name}
        sourceValue={source.name}
        selectedValue={selection.name}
        isIdentical={isNameIdentical}
        onChange={(value) => handleFieldChange("name", value)}
      />

      {/* Amount field */}
      <FieldRow
        label="Amount"
        field="amount"
        targetValue={formatCurrency(parseFloat(target.amount), target.currency)}
        sourceValue={formatCurrency(parseFloat(source.amount), source.currency)}
        selectedValue={selection.amount}
        isIdentical={isAmountIdentical}
        onChange={(value) => handleFieldChange("amount", value)}
      />

      {/* Frequency field */}
      <FieldRow
        label="Frequency"
        field="frequency"
        targetValue={target.frequency}
        sourceValue={source.frequency}
        selectedValue={selection.frequency}
        isIdentical={isFrequencyIdentical}
        onChange={(value) => handleFieldChange("frequency", value)}
      />

      {/* Category field */}
      <FieldRow
        label="Category"
        field="category"
        targetValue={target.categoryId ?? "None"}
        sourceValue={source.categoryId ?? "None"}
        selectedValue={selection.category}
        isIdentical={isCategoryIdentical}
        onChange={(value) => handleFieldChange("category", value)}
        displayTarget={target.categoryName ?? "Uncategorized"}
        displaySource={source.categoryName ?? "Uncategorized"}
      />

      {/* Next Renewal Date field - if available */}
      {(target.nextRenewalDate || source.nextRenewalDate) && (
        <FieldRow
          label="Next Renewal"
          field="nextRenewalDate"
          targetValue={target.nextRenewalDate?.toString() ?? ""}
          sourceValue={source.nextRenewalDate?.toString() ?? ""}
          selectedValue={selection.nextRenewalDate}
          isIdentical={
            target.nextRenewalDate?.toString() === source.nextRenewalDate?.toString()
          }
          onChange={(value) => handleFieldChange("nextRenewalDate", value)}
          displayTarget={
            target.nextRenewalDate
              ? formatDate(target.nextRenewalDate)
              : "Not set"
          }
          displaySource={
            source.nextRenewalDate
              ? formatDate(source.nextRenewalDate)
              : "Not set"
          }
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          className="h-11"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button className="h-11" onClick={handleMerge} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Merging...
            </>
          ) : (
            "Merge"
          )}
        </Button>
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  field: string;
  targetValue: string;
  sourceValue: string;
  selectedValue: FieldSelection;
  isIdentical: boolean;
  onChange: (value: FieldSelection) => void;
  displayTarget?: string;
  displaySource?: string;
}

function FieldRow({
  label,
  field,
  targetValue,
  sourceValue,
  selectedValue,
  isIdentical,
  onChange,
  displayTarget,
  displaySource,
}: FieldRowProps) {
  const targetDisplay = displayTarget ?? targetValue;
  const sourceDisplay = displaySource ?? sourceValue;

  if (isIdentical) {
    // No choice needed - show single value
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="rounded-md border p-3 bg-muted/50">
          <span className="text-sm">{targetDisplay}</span>
          <span className="ml-2 text-xs text-muted-foreground">(identical)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup
        value={selectedValue}
        onValueChange={(value) => onChange(value as FieldSelection)}
        className="grid gap-2"
      >
        {/* Target option */}
        <label
          htmlFor={`${field}-target`}
          className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
            selectedValue === "target"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <RadioGroupItem value="target" id={`${field}-target`} />
          <span className="flex-1 text-sm">{targetDisplay}</span>
          <span className="text-xs text-muted-foreground">Original</span>
        </label>

        {/* Source option */}
        <label
          htmlFor={`${field}-source`}
          className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
            selectedValue === "source"
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <RadioGroupItem value="source" id={`${field}-source`} />
          <span className="flex-1 text-sm">{sourceDisplay}</span>
          <span className="text-xs text-muted-foreground">Duplicate</span>
        </label>
      </RadioGroup>
    </div>
  );
}
