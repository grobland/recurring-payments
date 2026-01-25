import {
  format,
  formatDistanceToNow,
  differenceInDays,
  addMonths,
  addYears,
  isPast,
  isToday,
  isTomorrow,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";
import type { Frequency } from "@/lib/validations/subscription";

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, formatStr: string = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format a date as relative time (e.g., "in 3 days")
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get days until a date
 */
export function getDaysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return differenceInDays(startOfDay(d), startOfDay(new Date()));
}

/**
 * Check if a date is in the past
 */
export function isDatePast(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return isPast(startOfDay(d)) && !isToday(d);
}

/**
 * Get a human-readable renewal status
 */
export function getRenewalStatus(date: Date | string): {
  label: string;
  variant: "default" | "warning" | "danger" | "success";
} {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = getDaysUntil(d);

  if (days < 0) {
    return { label: "Overdue", variant: "danger" };
  }
  if (isToday(d)) {
    return { label: "Today", variant: "warning" };
  }
  if (isTomorrow(d)) {
    return { label: "Tomorrow", variant: "warning" };
  }
  if (days <= 7) {
    return { label: `In ${days} days`, variant: "warning" };
  }
  if (days <= 30) {
    return { label: `In ${days} days`, variant: "default" };
  }
  return { label: formatDate(d), variant: "success" };
}

/**
 * Calculate the next renewal date based on frequency
 */
export function calculateNextRenewalDate(
  currentDate: Date,
  frequency: Frequency
): Date {
  if (frequency === "monthly") {
    return addMonths(currentDate, 1);
  }
  return addYears(currentDate, 1);
}

/**
 * Advance a renewal date to the next occurrence if it's in the past
 */
export function advanceRenewalDate(
  renewalDate: Date | string,
  frequency: Frequency
): Date {
  let date = typeof renewalDate === "string" ? new Date(renewalDate) : new Date(renewalDate);
  const today = startOfDay(new Date());

  while (startOfDay(date) < today) {
    date = calculateNextRenewalDate(date, frequency);
  }

  return date;
}

/**
 * Check if a date is within a range from today
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = startOfDay(new Date());
  const futureDate = endOfDay(addDays(today, days));

  return isWithinInterval(d, { start: today, end: futureDate });
}

/**
 * Get subscriptions renewing within X days
 */
export function filterUpcomingRenewals<
  T extends { nextRenewalDate: Date | string; status: string }
>(subscriptions: T[], days: number): T[] {
  return subscriptions.filter(
    (sub) => sub.status === "active" && isWithinDays(sub.nextRenewalDate, days)
  );
}
