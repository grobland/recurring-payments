import type { Frequency } from "@/lib/validations/subscription";

/**
 * Normalize an amount to monthly cost
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  if (frequency === "yearly") {
    return amount / 12;
  }
  return amount;
}

/**
 * Normalize an amount to yearly cost
 */
export function normalizeToYearly(amount: number, frequency: Frequency): number {
  if (frequency === "monthly") {
    return amount * 12;
  }
  return amount;
}

/**
 * Calculate the normalized monthly amount for a subscription
 * Returns the value rounded to 2 decimal places
 */
export function calculateNormalizedMonthly(
  amount: number,
  frequency: Frequency
): string {
  const normalized = normalizeToMonthly(amount, frequency);
  return normalized.toFixed(2);
}

/**
 * Calculate total monthly spend from a list of subscriptions
 */
export function calculateTotalMonthly(
  subscriptions: Array<{
    amount: string | number;
    frequency: Frequency;
    status: string;
  }>
): number {
  return subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((total, sub) => {
      const amount = typeof sub.amount === "string" ? parseFloat(sub.amount) : sub.amount;
      return total + normalizeToMonthly(amount, sub.frequency);
    }, 0);
}

/**
 * Calculate total yearly spend from a list of subscriptions
 */
export function calculateTotalYearly(
  subscriptions: Array<{
    amount: string | number;
    frequency: Frequency;
    status: string;
  }>
): number {
  return subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((total, sub) => {
      const amount = typeof sub.amount === "string" ? parseFloat(sub.amount) : sub.amount;
      return total + normalizeToYearly(amount, sub.frequency);
    }, 0);
}
