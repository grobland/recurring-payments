"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import type { TransactionWithSource } from "@/types/transaction";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagStatusBadge } from "./tag-status-badge";
import { cn } from "@/lib/utils";

interface TransactionCardProps {
  transaction: TransactionWithSource;
  style: CSSProperties;
}

/**
 * Card component for mobile transaction view.
 * Uses absolute positioning for virtualization.
 */
export function TransactionCard({ transaction, style }: TransactionCardProps) {
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
    <div className="absolute left-0 right-0 px-2" style={style}>
      <Card className={cn("p-4 py-3 gap-2")}>
        {/* Top row: Date and Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
          <span className="text-sm font-bold">{formattedAmount}</span>
        </div>

        {/* Middle: Merchant name */}
        <div className="truncate font-medium text-base">
          {transaction.merchantName}
        </div>

        {/* Bottom row: Source, Category, Tag Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {transaction.sourceType && (
            <Badge variant="outline" className="text-xs">
              {transaction.sourceType}
            </Badge>
          )}
          {transaction.categoryGuess && (
            <span className="text-xs text-muted-foreground">
              {transaction.categoryGuess}
            </span>
          )}
          <TagStatusBadge status={transaction.tagStatus} />
        </div>
      </Card>
    </div>
  );
}
