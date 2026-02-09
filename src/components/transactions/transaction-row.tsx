"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import type { TransactionWithSource } from "@/types/transaction";
import { TagStatusBadge } from "./tag-status-badge";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  transaction: TransactionWithSource;
  style: CSSProperties;
}

/**
 * Table row component for desktop transaction view.
 * Uses absolute positioning for virtualization.
 */
export function TransactionRow({ transaction, style }: TransactionRowProps) {
  const formattedDate = format(
    new Date(transaction.transactionDate),
    "MMM d, yyyy"
  );

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency || "USD",
    signDisplay: "auto",
  }).format(Number(transaction.amount));

  return (
    <tr
      className={cn(
        "absolute left-0 right-0 flex items-center border-b border-border hover:bg-muted/50 transition-colors"
      )}
      style={style}
    >
      {/* Date */}
      <td className="w-[120px] px-4 py-3 text-sm text-muted-foreground">
        {formattedDate}
      </td>

      {/* Merchant */}
      <td className="flex-1 px-4 py-3 text-sm font-medium truncate min-w-0">
        {transaction.merchantName}
      </td>

      {/* Amount */}
      <td className="w-[100px] px-4 py-3 text-sm text-right font-medium">
        {formattedAmount}
      </td>

      {/* Source */}
      <td className="w-[140px] px-4 py-3 text-sm text-muted-foreground truncate">
        {transaction.sourceType || "-"}
      </td>

      {/* Category */}
      <td className="w-[120px] px-4 py-3 text-sm text-muted-foreground truncate">
        {transaction.categoryGuess || "-"}
      </td>

      {/* Tag Status */}
      <td className="w-[100px] px-4 py-3">
        <TagStatusBadge status={transaction.tagStatus} />
      </td>
    </tr>
  );
}
