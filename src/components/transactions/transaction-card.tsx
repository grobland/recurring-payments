"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import { ArrowRightCircle } from "lucide-react";
import type { TransactionWithSource, PaymentType } from "@/types/transaction";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  isSelected: boolean;
  onToggle: () => void;
  paymentType?: PaymentType;
}

const MAX_VISIBLE_TAGS = 3;

/**
 * Card component for mobile transaction view.
 * Uses absolute positioning for virtualization.
 *
 * When paymentType === 'recurring', shows an inline subscription checkbox:
 * - Confirmed subscription: checked + disabled (already converted)
 * - Suggested subscription: checked with amber dot indicator (potential_subscription)
 * - Plain recurring: unchecked, checking triggers convert flow
 */
export function TransactionCard({
  transaction,
  style,
  isSelected,
  onToggle,
  paymentType,
}: TransactionCardProps) {
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

  // Subscription status logic for inline checkbox
  const isSubscriptionConfirmed =
    transaction.convertedToSubscriptionId !== null ||
    transaction.tagStatus === "converted";

  const isSubscriptionSuggested =
    transaction.tagStatus === "potential_subscription";

  const showSubscriptionCheckbox = paymentType === "recurring";

  return (
    <div className="absolute left-0 right-0 px-2" style={style}>
      <Card className={cn("p-4 py-3 gap-2", isSelected && "ring-2 ring-primary")}>
        {/* Top row: Checkbox, Date, Amount, and Tag button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              aria-label={`Select ${transaction.merchantName}`}
            />
            <span className="text-sm text-muted-foreground">{formattedDate}</span>
          </div>
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

        {/* Bottom row: Source, Category, Tag Status, Convert / Subscription checkbox */}
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

          {/* Inline subscription checkbox for recurring payment type view */}
          {showSubscriptionCheckbox ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Subscription</span>
              <div className="relative">
                <Checkbox
                  checked={isSubscriptionConfirmed || isSubscriptionSuggested}
                  onCheckedChange={(checked) => {
                    if (checked && !isSubscriptionConfirmed) {
                      convertTransaction.mutate({
                        transactionId: transaction.id,
                        merchantName: transaction.merchantName,
                      });
                    }
                  }}
                  disabled={isSubscriptionConfirmed || convertTransaction.isPending}
                  aria-label={`Mark ${transaction.merchantName} as subscription`}
                />
                {/* Amber dot for auto-suggested but unconfirmed subscriptions */}
                {isSubscriptionSuggested && !isSubscriptionConfirmed && (
                  <span
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400"
                    title="Suggested subscription"
                  />
                )}
              </div>
            </div>
          ) : (
            /* Convert Action - shown when not in recurring view */
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
          )}
        </div>
      </Card>
    </div>
  );
}
