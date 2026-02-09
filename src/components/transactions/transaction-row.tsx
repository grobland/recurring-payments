"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";
import { ArrowRightCircle } from "lucide-react";
import type { TransactionWithSource } from "@/types/transaction";
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
}

const MAX_VISIBLE_TAGS = 2;

/**
 * Table row component for desktop transaction view.
 * Uses absolute positioning for virtualization.
 */
export function TransactionRow({
  transaction,
  style,
  isSelected,
  onToggle,
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
