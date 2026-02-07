/**
 * Anomaly detection utilities for subscription alerts.
 * Used by detect-anomalies cron job.
 */

export interface PriceChangeResult {
  isSignificant: boolean;
  percentChange: number;
  absoluteChange: number;
  oldAmount: number;
  newAmount: number;
}

/**
 * Detect if a price change exceeds thresholds (>5% OR >$2).
 * Only detects increases, not decreases.
 */
export function detectPriceChange(
  oldAmount: number,
  newAmount: number
): PriceChangeResult {
  const absoluteChange = newAmount - oldAmount;
  const percentChange = oldAmount > 0 ? (absoluteChange / oldAmount) * 100 : 0;

  // Only flag increases, not decreases
  // Threshold: >5% OR >$2 (or equivalent)
  const isSignificant =
    absoluteChange > 0 && (percentChange > 5 || absoluteChange > 2);

  return {
    isSignificant,
    percentChange: Math.round(percentChange * 10) / 10, // 1 decimal
    absoluteChange: Math.round(absoluteChange * 100) / 100, // 2 decimals
    oldAmount,
    newAmount,
  };
}

export interface MissedRenewalResult {
  isMissed: boolean;
  daysPastDue: number;
  expectedDate: Date;
}

/**
 * Detect if a subscription renewal was missed.
 * A renewal is "missed" if:
 * 1. nextRenewalDate is more than 3 days in the past
 * 2. The subscription hasn't been updated since before the renewal date
 *
 * This prevents false positives when users manually update their subscriptions.
 */
export function detectMissedRenewal(
  nextRenewalDate: Date,
  updatedAt: Date,
  now: Date = new Date()
): MissedRenewalResult {
  const renewalTime = nextRenewalDate.getTime();
  const nowTime = now.getTime();
  const updatedTime = updatedAt.getTime();

  const daysPastDue = Math.floor(
    (nowTime - renewalTime) / (1000 * 60 * 60 * 24)
  );

  // Missed if:
  // 1. Renewal date is 3+ days ago
  // 2. Subscription wasn't updated after the renewal date
  const isMissed = daysPastDue >= 3 && updatedTime < renewalTime;

  return {
    isMissed,
    daysPastDue,
    expectedDate: nextRenewalDate,
  };
}

/**
 * Format price change for display (e.g., "$12 -> $14").
 */
export function formatPriceChange(
  oldAmount: number,
  newAmount: number,
  currency: string
): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(oldAmount)} -> ${formatter.format(newAmount)}`;
}
