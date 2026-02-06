"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export interface ExistingSubscription {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: string;
}

export interface ImportingSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
}

export interface DuplicateComparisonProps {
  /** The existing subscription in the database */
  existing: ExistingSubscription;
  /** The subscription being imported */
  importing: ImportingSubscription;
  /** Similarity score (0-100) */
  score: number;
  /** Which fields matched */
  matches: {
    name: boolean;
    amount: boolean;
    frequency: boolean;
    category?: boolean;
    source?: boolean;
  };
}

interface ComparisonFieldProps {
  label: string;
  existingValue: string;
  importingValue: string;
  isMatch: boolean;
}

function ComparisonField({ label, existingValue, importingValue, isMatch }: ComparisonFieldProps) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-muted-foreground font-medium">{label}</div>
      <div
        className={cn(
          "px-2 py-1 rounded",
          !isMatch && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        )}
      >
        {existingValue}
      </div>
      <div
        className={cn(
          "px-2 py-1 rounded",
          !isMatch && "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        )}
      >
        {importingValue}
      </div>
    </div>
  );
}

/**
 * Side-by-side comparison view for potential duplicate subscriptions.
 *
 * Shows existing vs new subscription fields with highlighted differences.
 */
export function DuplicateComparison({
  existing,
  importing,
  score,
  matches,
}: DuplicateComparisonProps) {
  const variant = score >= 85 ? "destructive" : "warning";

  return (
    <div className="space-y-4">
      {/* Similarity Score Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Duplicate Detection
        </span>
        <Badge variant={variant}>{score}% similar</Badge>
      </div>

      {/* Comparison Grid */}
      <Card>
        <CardHeader className="py-3">
          <div className="grid grid-cols-3 gap-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Field
            </CardTitle>
            <CardTitle className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Existing
            </CardTitle>
            <CardTitle className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Importing
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <ComparisonField
            label="Name"
            existingValue={existing.name}
            importingValue={importing.name}
            isMatch={matches.name}
          />
          <ComparisonField
            label="Amount"
            existingValue={formatCurrency(parseFloat(existing.amount), existing.currency)}
            importingValue={formatCurrency(importing.amount, importing.currency)}
            isMatch={matches.amount}
          />
          <ComparisonField
            label="Frequency"
            existingValue={existing.frequency}
            importingValue={importing.frequency}
            isMatch={matches.frequency}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" />
          <span>Existing value</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" />
          <span>New value (differs)</span>
        </div>
      </div>
    </div>
  );
}
