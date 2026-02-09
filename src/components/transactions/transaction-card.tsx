"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import { ArrowRightCircle } from "lucide-react";
import type { TransactionWithSource } from "@/types/transaction";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagStatusBadge } from "./tag-status-badge";
import { TagBadge } from "./tag-badge";
import { TagCombobox } from "./tag-combobox";
import { ConvertedBadge } from "./converted-badge";
import { useToggleTransactionTag } from "@/lib/hooks/use-transaction-tags";
import { useConvertTransaction } from "@/lib/hooks/use-convert-transaction";
import { cn } from "@/lib/utils";

interface TransactionCardProps {
  transaction: TransactionWithSource;
  style: CSSProperties;
}

const MAX_VISIBLE_TAGS = 3;

/**
 * Card component for mobile transaction view.
 * Uses absolute positioning for virtualization.
 */
export function TransactionCard({ transaction, style }: TransactionCardProps) {
  const toggleTag = useToggleTransactionTag();
  const convertTransaction = useConvertTransaction();

  const formattedDate = format(
    new Date(transaction.transactionDate),
    "MMM d, yyyy"
  );

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: transaction.currency || "USD",
    signDisplay: "auto",
  }).format(Number(transaction.amount));

  const appliedTags = transaction.tags ?? [];
  const appliedTagIds = appliedTags.map((t) => t.id);
  const visibleTags = appliedTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = appliedTags.length - MAX_VISIBLE_TAGS;

  const handleTagToggle = (tagId: string) => {
    const action = appliedTagIds.includes(tagId) ? "remove" : "add";
    toggleTag.mutate({
      transactionId: transaction.id,
      tagId,
      action,
    });
  };

  return (
    <div className="absolute left-0 right-0 px-2" style={style}>
      <Card className={cn("p-4 py-3 gap-2")}>
        {/* Top row: Date, Amount, and Tag button */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{formattedDate}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{formattedAmount}</span>
            <TagCombobox
              transactionId={transaction.id}
              appliedTagIds={appliedTagIds}
              onTagToggle={handleTagToggle}
              disabled={toggleTag.isPending}
            />
          </div>
        </div>

        {/* Middle: Merchant name */}
        <div className="truncate font-medium text-base">
          {transaction.merchantName}
        </div>

        {/* Tags row (if any) */}
        {appliedTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {visibleTags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {hiddenTagCount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{hiddenTagCount}
              </span>
            )}
          </div>
        )}

        {/* Bottom row: Source, Category, Tag Status, Convert */}
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

          {/* Convert Action - positioned separately */}
          <div className="ml-auto">
            {transaction.convertedToSubscriptionId ? (
              <ConvertedBadge subscriptionId={transaction.convertedToSubscriptionId} />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() =>
                  convertTransaction.mutate({
                    transactionId: transaction.id,
                    merchantName: transaction.merchantName,
                  })
                }
                disabled={convertTransaction.isPending}
              >
                <ArrowRightCircle className="h-3.5 w-3.5" />
                Convert
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
