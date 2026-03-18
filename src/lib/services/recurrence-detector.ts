import { db as defaultDb } from "@/lib/db";
import {
  transactions,
  merchantAliases,
  merchantEntities,
  recurringSeries,
  recurringMasterSeriesLinks,
  userTransactionLabels,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// ============ Type Definitions ============

type DbClient = typeof defaultDb;

export interface DetectedSeries {
  merchantEntityId: string;
  merchantName: string;
  rule: "A" | "B" | "C" | "D" | "E";
  detectedFrequency: "monthly" | "yearly" | "weekly" | "quarterly" | "custom";
  intervalDays: number;
  dayOfMonth: number | null;
  amountType: "fixed" | "variable";
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  amountStddev: number;
  confidence: number;
  transactionCount: number;
  firstSeenDate: Date;
  lastSeenDate: Date;
  nextExpectedDate: Date | null;
  currency: string;
  transactionIds: string[];
}

export interface DetectionResult {
  detectedSeries: DetectedSeries[];
  skippedMerchants: number; // single-occurrence merchants
  totalMerchantsAnalyzed: number;
}

// Internal shape used inside detectPatternForGroup
export interface DetectedPattern {
  rule: "A" | "B" | "C" | "D" | "E";
  detectedFrequency: "monthly" | "yearly" | "weekly" | "quarterly" | "custom";
  intervalDays: number;
  dayOfMonth: number | null;
  amountType: "fixed" | "variable";
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  amountStddev: number;
  confidence: number;
  transactionCount: number;
  firstSeenDate: Date;
  lastSeenDate: Date;
  nextExpectedDate: Date | null;
}

// Minimal transaction row shape used for detection
interface TransactionRow {
  id: string;
  transactionDate: Date;
  amount: number;
  currency: string;
}

// ============ Pure Helper Functions ============

/**
 * Classify amounts as fixed or variable based on the coefficient of variation.
 * CV <= 0.05 => "fixed", CV > 0.05 => "variable"
 */
export function classifyAmountType(amounts: number[]): "fixed" | "variable" {
  if (amounts.length <= 1) return "fixed";
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return "fixed";
  const variance =
    amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / amounts.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;
  return cv <= 0.05 ? "fixed" : "variable";
}

/**
 * Predict the next payment date based on detected cadence.
 * @param lastDate     Last known payment date
 * @param frequency    Detected frequency string
 * @param dayOfMonth   Day-of-month for monthly predictions (or null)
 * @param intervalDays Used for "custom" frequency
 */
export function predictNextDate(
  lastDate: Date,
  frequency: string,
  dayOfMonth: number | null,
  intervalDays?: number
): Date | null {
  const d = new Date(lastDate);

  switch (frequency) {
    case "monthly": {
      const dom = dayOfMonth ?? lastDate.getUTCDate();
      const nextMonth = d.getUTCMonth() + 1;
      const nextYear =
        nextMonth > 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
      const clampedMonth = nextMonth > 11 ? 0 : nextMonth;
      // Clamp to last day of target month
      const daysInMonth = new Date(
        Date.UTC(nextYear, clampedMonth + 1, 0)
      ).getUTCDate();
      const day = Math.min(dom, daysInMonth);
      return new Date(Date.UTC(nextYear, clampedMonth, day));
    }

    case "yearly": {
      return new Date(
        Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate())
      );
    }

    case "weekly": {
      return new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    case "quarterly": {
      return new Date(d.getTime() + 91 * 24 * 60 * 60 * 1000);
    }

    case "custom": {
      if (!intervalDays) return null;
      return new Date(d.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    default:
      return null;
  }
}

/**
 * Compute confidence score for a detected rule.
 * Base confidence per rule + bonuses for consistency + user boost.
 */
export function computeConfidence(
  rule: "A" | "B" | "C" | "D" | "E",
  occurrences: number,
  intervalStddev: number,
  amountCV: number,
  hasUserBoost: boolean
): number {
  let confidence: number;

  switch (rule) {
    case "A":
      // Rule A is always 0.95 (known alias hit)
      confidence = 0.95;
      break;

    case "B": {
      // Fixed monthly: base 0.70, +0.05 per extra occurrence (beyond 2, max +0.15),
      // +0.05 if amounts exactly equal (CV == 0)
      confidence = 0.70;
      const extraOccurrences = Math.min(occurrences - 2, 3);
      confidence += extraOccurrences * 0.05;
      if (amountCV === 0) confidence += 0.05;
      break;
    }

    case "C": {
      // Variable monthly: base 0.60, +0.05 per extra occurrence (max +0.10),
      // +0.05 if interval stddev < 3 days
      confidence = 0.60;
      const extraOccurrences = Math.min(occurrences - 2, 2);
      confidence += extraOccurrences * 0.05;
      if (intervalStddev < 3) confidence += 0.05;
      break;
    }

    case "D":
      // Annual: base 0.65
      confidence = 0.65;
      break;

    case "E":
      // Weekly/quarterly/custom: starts at 0.65 for weekly, 0.60 for quarterly/custom
      // This is determined by the caller; we provide 0.65 as a starting base
      confidence = 0.65;
      break;

    default:
      confidence = 0.50;
  }

  if (hasUserBoost) {
    confidence += 0.10;
  }

  return Math.min(1.0, confidence);
}

// ============ Statistical Helpers ============

function computeStats(values: number[]) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1
      ? values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n
      : 0;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { mean, stddev, min, max };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length <= 1) return 0;
  const { mean, stddev } = computeStats(values);
  if (mean === 0) return 0;
  return stddev / mean;
}

/**
 * Core pure detection function — applies rules A-E sequentially.
 * Does NOT touch the database; takes pre-resolved inputs.
 *
 * @param transactions      Array of {date, amount} sorted or unsorted
 * @param hasExistingMaster Whether this merchant is already linked to a recurring_master
 * @param userBoost         Whether any transaction has a "recurring" user label
 */
export function detectPatternForGroup(
  txnInputs: Array<{ date: Date; amount: number }>,
  hasExistingMaster: boolean,
  userBoost: boolean
): DetectedPattern | null {
  if (txnInputs.length < 2) return null;

  // Sort by date ascending
  const sorted = [...txnInputs].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const firstSeenDate = sorted[0].date;
  const lastSeenDate = sorted[sorted.length - 1].date;
  const amounts = sorted.map((t) => t.amount);
  const { mean: avgAmount, stddev: amountStddev, min: minAmount, max: maxAmount } = computeStats(amounts);
  const amountCV = coefficientOfVariation(amounts);
  const amountType = classifyAmountType(amounts);
  const transactionCount = sorted.length;

  // Compute inter-arrival intervals in days
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
    intervals.push(diffMs / (1000 * 60 * 60 * 24));
  }

  const medianInterval = median(intervals);
  const { stddev: intervalStddev } = computeStats(intervals);
  const intervalCV = coefficientOfVariation(intervals);

  // ── Rule A: existing master linked ──
  if (hasExistingMaster) {
    const confidence = computeConfidence("A", transactionCount, intervalStddev, amountCV, userBoost);
    // Determine frequency from intervals for completeness
    const frequency = inferFrequency(medianInterval);
    return {
      rule: "A",
      detectedFrequency: frequency,
      intervalDays: Math.round(medianInterval),
      dayOfMonth: inferDayOfMonth(sorted.map((t) => t.date), frequency),
      amountType,
      avgAmount,
      minAmount,
      maxAmount,
      amountStddev,
      confidence,
      transactionCount,
      firstSeenDate,
      lastSeenDate,
      nextExpectedDate: predictNextDate(
        lastSeenDate,
        frequency,
        inferDayOfMonth(sorted.map((t) => t.date), frequency),
        Math.round(medianInterval)
      ),
    };
  }

  // ── Rule B: Fixed monthly ──
  // Median interval 25-35 days, CV of amounts <= 0.05, day-of-month stddev <= 5
  if (medianInterval >= 25 && medianInterval <= 35) {
    const domValues = sorted.map((t) => t.date.getUTCDate());
    const { stddev: domStddev } = computeStats(domValues);

    if (amountCV <= 0.05 && domStddev <= 5) {
      const dayOfMonth = Math.round(
        domValues.reduce((a, b) => a + b, 0) / domValues.length
      );
      const confidence = computeConfidence("B", transactionCount, intervalStddev, amountCV, userBoost);
      return {
        rule: "B",
        detectedFrequency: "monthly",
        intervalDays: Math.round(medianInterval),
        dayOfMonth,
        amountType: "fixed",
        avgAmount,
        minAmount,
        maxAmount,
        amountStddev,
        confidence,
        transactionCount,
        firstSeenDate,
        lastSeenDate,
        nextExpectedDate: predictNextDate(lastSeenDate, "monthly", dayOfMonth),
      };
    }
  }

  // ── Rule C: Variable monthly ──
  // Median interval 25-35 days, CV of amounts > 0.05 but <= 0.50
  if (medianInterval >= 25 && medianInterval <= 35) {
    if (amountCV > 0.05 && amountCV <= 0.50) {
      const domValues = sorted.map((t) => t.date.getUTCDate());
      const dayOfMonth = Math.round(
        domValues.reduce((a, b) => a + b, 0) / domValues.length
      );
      const confidence = computeConfidence("C", transactionCount, intervalStddev, amountCV, userBoost);
      return {
        rule: "C",
        detectedFrequency: "monthly",
        intervalDays: Math.round(medianInterval),
        dayOfMonth,
        amountType: "variable",
        avgAmount,
        minAmount,
        maxAmount,
        amountStddev,
        confidence,
        transactionCount,
        firstSeenDate,
        lastSeenDate,
        nextExpectedDate: predictNextDate(lastSeenDate, "monthly", dayOfMonth),
      };
    }
  }

  // ── Rule D: Annual ──
  // Median interval 335-395 days
  if (medianInterval >= 335 && medianInterval <= 395) {
    const confidence = computeConfidence("D", transactionCount, intervalStddev, amountCV, userBoost);
    return {
      rule: "D",
      detectedFrequency: "yearly",
      intervalDays: Math.round(medianInterval),
      dayOfMonth: null,
      amountType,
      avgAmount,
      minAmount,
      maxAmount,
      amountStddev,
      confidence,
      transactionCount,
      firstSeenDate,
      lastSeenDate,
      nextExpectedDate: predictNextDate(lastSeenDate, "yearly", null),
    };
  }

  // ── Rule E: Weekly / Quarterly / Custom ──

  // Weekly: 5-9 day intervals, min 3 occurrences
  if (medianInterval >= 5 && medianInterval <= 9 && transactionCount >= 3) {
    const confidence = Math.min(1.0, 0.65 + (userBoost ? 0.10 : 0));
    return {
      rule: "E",
      detectedFrequency: "weekly",
      intervalDays: 7,
      dayOfMonth: null,
      amountType,
      avgAmount,
      minAmount,
      maxAmount,
      amountStddev,
      confidence,
      transactionCount,
      firstSeenDate,
      lastSeenDate,
      nextExpectedDate: predictNextDate(lastSeenDate, "weekly", null),
    };
  }

  // Quarterly: 80-100 day intervals, min 2 occurrences
  if (medianInterval >= 80 && medianInterval <= 100) {
    const confidence = Math.min(1.0, 0.60 + (userBoost ? 0.10 : 0));
    return {
      rule: "E",
      detectedFrequency: "quarterly",
      intervalDays: 91,
      dayOfMonth: null,
      amountType,
      avgAmount,
      minAmount,
      maxAmount,
      amountStddev,
      confidence,
      transactionCount,
      firstSeenDate,
      lastSeenDate,
      nextExpectedDate: predictNextDate(lastSeenDate, "quarterly", null),
    };
  }

  // Custom: consistent intervals (CV < 0.3), min 2 occurrences
  if (intervalCV < 0.3) {
    const confidence = Math.min(1.0, 0.55 + (userBoost ? 0.10 : 0));
    return {
      rule: "E",
      detectedFrequency: "custom",
      intervalDays: Math.round(medianInterval),
      dayOfMonth: null,
      amountType,
      avgAmount,
      minAmount,
      maxAmount,
      amountStddev,
      confidence,
      transactionCount,
      firstSeenDate,
      lastSeenDate,
      nextExpectedDate: predictNextDate(
        lastSeenDate,
        "custom",
        null,
        Math.round(medianInterval)
      ),
    };
  }

  return null;
}

// ============ Internal Helpers ============

function inferFrequency(
  medianInterval: number
): "monthly" | "yearly" | "weekly" | "quarterly" | "custom" {
  if (medianInterval >= 5 && medianInterval <= 9) return "weekly";
  if (medianInterval >= 25 && medianInterval <= 35) return "monthly";
  if (medianInterval >= 80 && medianInterval <= 100) return "quarterly";
  if (medianInterval >= 335 && medianInterval <= 395) return "yearly";
  return "custom";
}

function inferDayOfMonth(
  dates: Date[],
  frequency: string
): number | null {
  if (frequency !== "monthly") return null;
  const domValues = dates.map((d) => d.getUTCDate());
  return Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length);
}

// ============ DB-dependent Grouping Function ============

/**
 * Group all user transactions by merchant entity via alias lookup.
 * Transactions are matched to a merchant entity by looking up their
 * normalizedDescription in the merchant_aliases table.
 */
export async function groupTransactionsByMerchant(
  db: DbClient,
  userId: string
): Promise<
  Map<
    string,
    { merchantName: string; transactions: TransactionRow[] }
  >
> {
  // Load all transactions with normalizedDescription
  const txns = await db
    .select({
      id: transactions.id,
      transactionDate: transactions.transactionDate,
      amount: transactions.amount,
      currency: transactions.currency,
      normalizedDescription: transactions.normalizedDescription,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  if (txns.length === 0) {
    return new Map();
  }

  // Get unique normalized descriptions (non-null only)
  const descriptors = [
    ...new Set(
      txns
        .map((t) => t.normalizedDescription?.toLowerCase())
        .filter((d): d is string => !!d)
    ),
  ];

  if (descriptors.length === 0) {
    return new Map();
  }

  // Batch lookup aliases for all descriptors
  const aliasRows = await db
    .select({
      aliasText: merchantAliases.aliasText,
      merchantEntityId: merchantAliases.merchantEntityId,
      merchantName: merchantEntities.name,
    })
    .from(merchantAliases)
    .innerJoin(
      merchantEntities,
      eq(merchantAliases.merchantEntityId, merchantEntities.id)
    )
    .where(
      and(
        eq(merchantAliases.userId, userId),
        inArray(
          sql`lower(${merchantAliases.aliasText})`,
          descriptors
        )
      )
    );

  // Build alias -> merchant mapping
  const aliasToMerchant = new Map<
    string,
    { merchantEntityId: string; merchantName: string }
  >();
  for (const row of aliasRows) {
    aliasToMerchant.set(row.aliasText.toLowerCase(), {
      merchantEntityId: row.merchantEntityId,
      merchantName: row.merchantName,
    });
  }

  // Group transactions by merchantEntityId
  const groups = new Map<
    string,
    { merchantName: string; transactions: TransactionRow[] }
  >();

  for (const txn of txns) {
    const desc = txn.normalizedDescription?.toLowerCase();
    if (!desc) continue;

    const merchant = aliasToMerchant.get(desc);
    if (!merchant) continue;

    const existing = groups.get(merchant.merchantEntityId);
    const txnRow: TransactionRow = {
      id: txn.id,
      transactionDate: new Date(txn.transactionDate),
      amount: parseFloat(txn.amount as unknown as string),
      currency: txn.currency,
    };

    if (existing) {
      existing.transactions.push(txnRow);
    } else {
      groups.set(merchant.merchantEntityId, {
        merchantName: merchant.merchantName,
        transactions: [txnRow],
      });
    }
  }

  return groups;
}

// ============ Main Detection Function ============

/**
 * Run recurrence detection for all of a user's transactions.
 *
 * 1. Groups transactions by merchant entity via alias lookup
 * 2. Loads user_transaction_labels to honour user decisions
 * 3. Checks which merchants are already linked to recurring_masters (Rule A)
 * 4. Applies detection rules A-E per merchant group
 * 5. Returns DetectionResult (does NOT write to DB — writing is done by the caller)
 */
export async function detectRecurringSeries(
  db: DbClient,
  userId: string
): Promise<DetectionResult> {
  // Step 1: Group transactions by merchant
  const groups = await groupTransactionsByMerchant(db, userId);

  // Step 2: Load user transaction labels
  const labels = await db
    .select({
      transactionId: userTransactionLabels.transactionId,
      label: userTransactionLabels.label,
    })
    .from(userTransactionLabels)
    .where(eq(userTransactionLabels.userId, userId));

  const labelMap = new Map<string, string>();
  for (const l of labels) {
    labelMap.set(l.transactionId, l.label);
  }

  // Step 3: Load existing series → master links to identify Rule A merchants
  const existingSeriesRows = await db
    .select({ merchantEntityId: recurringSeries.merchantEntityId })
    .from(recurringSeries)
    .innerJoin(
      recurringMasterSeriesLinks,
      eq(recurringMasterSeriesLinks.seriesId, recurringSeries.id)
    )
    .where(eq(recurringSeries.userId, userId));

  const merchantsWithMaster = new Set(
    existingSeriesRows
      .map((r) => r.merchantEntityId)
      .filter((id): id is string => !!id)
  );

  // Step 4: Detect patterns per merchant group
  const detectedSeries: DetectedSeries[] = [];
  let skippedMerchants = 0;

  for (const [merchantEntityId, group] of groups.entries()) {
    // Apply user labels: exclude not_recurring / ignore, flag recurring boost
    const filteredTxns = group.transactions.filter((t) => {
      const label = labelMap.get(t.id);
      return label !== "not_recurring" && label !== "ignore";
    });

    // Check for user boost (any transaction labeled "recurring")
    const hasUserBoost = filteredTxns.some(
      (t) => labelMap.get(t.id) === "recurring"
    );

    // Skip if fewer than 2 transactions after filtering
    if (filteredTxns.length < 2) {
      skippedMerchants++;
      continue;
    }

    const hasExistingMaster = merchantsWithMaster.has(merchantEntityId);

    const pattern = detectPatternForGroup(
      filteredTxns.map((t) => ({
        date: t.transactionDate,
        amount: t.amount,
      })),
      hasExistingMaster,
      hasUserBoost
    );

    if (pattern) {
      // Determine currency (use most common currency in the group)
      const currencyCounts = new Map<string, number>();
      for (const t of filteredTxns) {
        currencyCounts.set(t.currency, (currencyCounts.get(t.currency) ?? 0) + 1);
      }
      const currency = [...currencyCounts.entries()].sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      detectedSeries.push({
        merchantEntityId,
        merchantName: group.merchantName,
        transactionIds: filteredTxns.map((t) => t.id),
        currency,
        ...pattern,
      });
    }
  }

  return {
    detectedSeries,
    skippedMerchants,
    totalMerchantsAnalyzed: groups.size,
  };
}

/**
 * Convenience wrapper using the default db instance.
 */
export async function detectRecurringSeriesForUser(
  userId: string
): Promise<DetectionResult> {
  return detectRecurringSeries(defaultDb, userId);
}
