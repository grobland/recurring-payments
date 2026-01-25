"use client";

import Link from "next/link";
import { AlertCircle, Clock, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useUserStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { isTrialActive, isPaid, daysLeftInTrial, billingStatus } = useUserStatus();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if paid, already dismissed, or not in trial
  if (isPaid || dismissed || !isTrialActive) {
    return null;
  }

  // Show urgent banner if trial is ending soon (3 days or less)
  const isUrgent = daysLeftInTrial <= 3;

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 px-4 py-2 text-sm",
        isUrgent
          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
          : "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
      )}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertCircle className="h-4 w-4 shrink-0" />
        ) : (
          <Clock className="h-4 w-4 shrink-0" />
        )}
        <span>
          {isUrgent ? (
            <>
              <strong>Trial ending soon!</strong> You have{" "}
              {daysLeftInTrial === 0
                ? "less than a day"
                : daysLeftInTrial === 1
                ? "1 day"
                : `${daysLeftInTrial} days`}{" "}
              left.
            </>
          ) : (
            <>
              You&apos;re on a free trial with{" "}
              <strong>{daysLeftInTrial} days</strong> remaining.
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          variant={isUrgent ? "default" : "outline"}
          className={cn(
            "h-7",
            !isUrgent && "border-blue-300 hover:bg-blue-200 dark:border-blue-700 dark:hover:bg-blue-800"
          )}
        >
          <Link href="/settings/billing">Upgrade Now</Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TrialExpiredBanner() {
  const { isTrialActive, isPaid, billingStatus } = useUserStatus();

  // Only show if trial has expired (not active and not paid)
  if (isPaid || isTrialActive || billingStatus === "trial") {
    return null;
  }

  return (
    <div className="relative flex items-center justify-between gap-4 bg-red-100 px-4 py-2 text-sm text-red-900 dark:bg-red-900/30 dark:text-red-200">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Trial expired.</strong> Upgrade to continue adding and editing
          subscriptions.
        </span>
      </div>
      <Button
        asChild
        size="sm"
        variant="destructive"
        className="h-7"
      >
        <Link href="/settings/billing">Upgrade Now</Link>
      </Button>
    </div>
  );
}
