"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { TrendingUp, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlertWithSubscription } from "@/lib/hooks/use-alerts";

interface AlertItemProps {
  alert: AlertWithSubscription;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

export function AlertItem({
  alert,
  onAcknowledge,
  onDismiss,
  isLoading,
}: AlertItemProps) {
  const isPriceIncrease = alert.type === "price_increase";
  const isAcknowledged = !!alert.acknowledgedAt;

  // Format the alert message
  const getMessage = () => {
    if (isPriceIncrease) {
      const { oldAmount, newAmount, currency } = alert.metadata ?? {};
      if (oldAmount !== undefined && newAmount !== undefined) {
        const formatter = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency ?? "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        return `${formatter.format(oldAmount)} -> ${formatter.format(newAmount)}`;
      }
      return "Price increased";
    } else {
      const { expectedDate } = alert.metadata ?? {};
      if (expectedDate) {
        return `Expected ${format(new Date(expectedDate), "MMM d")}`;
      }
      return "Renewal missed";
    }
  };

  const subscriptionName =
    alert.subscription?.name ?? alert.metadata?.subscriptionName ?? "Unknown";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-md transition-colors",
        isAcknowledged ? "opacity-60" : "bg-muted/50"
      )}
    >
      {/* Type indicator */}
      <div
        className={cn(
          "mt-0.5 h-2 w-2 rounded-full shrink-0",
          isPriceIncrease ? "bg-red-500" : "bg-yellow-500"
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isPriceIncrease ? (
            <TrendingUp className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          )}
          <Link
            href={alert.subscription ? `/subscriptions/${alert.subscription.id}` : "#"}
            className="font-medium truncate hover:underline"
          >
            {subscriptionName}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{getMessage()}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(alert.createdAt), "MMM d, h:mm a")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        {!isAcknowledged && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAcknowledge(alert.id)}
            disabled={isLoading}
            title="Mark as reviewed"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onDismiss(alert.id)}
          disabled={isLoading}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
