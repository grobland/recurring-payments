"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import { ArrowRightCircle } from "lucide-react";
import type { TransactionWithSource, PaymentType } from "@/types/transaction";
import { TagStatusBadge } from "./tag-status-badge";
import { TagBadge } from "./tag-badge";
import { TagCombobox } from "./tag-combobox";
import { ConvertedBadge } from "./converted-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToggleTransactionTag } from "@/lib/hooks/use-transaction-tags";
import { useConvertTransaction } from "@/lib/hooks/use-convert-transaction";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  transaction: TransactionWithSource;
  style: CSSProperties;
  isSelected: boolean;
  onToggle: () => void;
  paymentType?: PaymentType;
}

const MAX_VISIBLE_TAGS = 2;

/**
 * Table row component for desktop transaction view.
 * Uses absolute positioning for virtualization.
 *
 * When paymentType === 'recurring', shows an inline subscription checkbox:
 * - Confirmed subscription: checked + disabled (already converted)
 * - Suggested subscription: checked with amber dot indicator (potential_subscription)
 * - Plain recurring: unchecked, checking triggers convert flow
 */
export function TransactionRow({
  transaction,
  style,
  isSelected,
  onToggle,
  paymentType,
}: TransactionRowProps) {
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
    <tr
      className={cn(
        "absolute left-0 right-0 flex items-center border-b border-border hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted/30"
      )}
      style={style}
    >
      {/* Checkbox */}
      <td className="w-[44px] px-3 py-3 flex items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          aria-label={`Select ${transaction.merchantName}`}
        />
      </td>

      {/* Date */}
      <td className="w-[120px] px-4 py-3 text-sm text-muted-foreground">
        {formattedDate}
      </td>

      {/* Merchant + Tags */}
      <td className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {transaction.merchantName}
          </span>
          {visibleTags.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
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
        </div>
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

      {/* Actions (Tag button) */}
      <td className="w-[50px] px-2 py-3">
        <TagCombobox
          transactionId={transaction.id}
          appliedTagIds={appliedTagIds}
          onTagToggle={handleTagToggle}
          disabled={toggleTag.isPending}
        />
      </td>

      {/* Inline subscription checkbox — visible only in recurring payment type view */}
      {showSubscriptionCheckbox && (
        <td className="w-[60px] px-2 py-3 flex items-center justify-center">
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
            {/* Amber dot indicator for auto-suggested but unconfirmed subscriptions */}
            {isSubscriptionSuggested && !isSubscriptionConfirmed && (
              <span
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400"
                title="Suggested subscription"
              />
            )}
          </div>
        </td>
      )}

      {/* Convert Action */}
      <td className="w-[110px] px-2 py-3">
        {transaction.convertedToSubscriptionId ? (
          <ConvertedBadge subscriptionId={transaction.convertedToSubscriptionId} />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
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
      </td>
    </tr>
  );
}
