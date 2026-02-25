"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface EvidenceListProps {
  chargeDates: string[];
  amounts: number[];
  currency: string;
  merchantName: string;
}

/**
 * Display transaction evidence with charge dates, amounts, and links.
 * Shows variance warning if amounts differ more than 10% from average.
 */
export function EvidenceList({
  chargeDates,
  amounts,
  currency,
  merchantName,
}: EvidenceListProps) {
  // Calculate amount variance
  const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const hasVariance = amounts.some(
    (amount) => Math.abs(amount - avgAmount) / avgAmount > 0.1
  );

  return (
    <div className="space-y-2">
      {hasVariance && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2 text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Amounts vary significantly - possible price change</span>
        </div>
      )}

      <div className="space-y-1">
        {chargeDates.map((date, index) => {
          const parsedDate = new Date(date);
          const amount = amounts[index];
          const searchDate = format(parsedDate, "yyyy-MM-dd");

          return (
            <Link
              key={`${date}-${index}`}
              href={`/payments/transactions?search=${encodeURIComponent(merchantName)}&dateFrom=${searchDate}`}
              className="group flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted"
            >
              <span className="text-muted-foreground">
                {format(parsedDate, "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1 font-medium">
                {formatCurrency(amount, currency)}
                <ExternalLink
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-opacity",
                    "opacity-0 group-hover:opacity-100"
                  )}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
