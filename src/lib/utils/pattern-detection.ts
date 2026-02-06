/**
 * Pattern detection utilities for recurring charge analysis.
 * Calculates confidence scores based on occurrence count, interval consistency, and amount variance.
 */

/**
 * Raw pattern data from database detection query
 */
export interface DetectedPattern {
  merchantName: string;
  currency: string;
  occurrenceCount: number;
  chargeDates: Date[];
  amounts: number[];
  avgAmount: number;
  amountStddev: number;
  avgIntervalDays: number;
  intervalStddev: number;
}

/**
 * Breakdown of confidence score factors
 */
export interface ConfidenceFactors {
  occurrenceScore: number;  // 0-30 points (more occurrences = stronger)
  intervalScore: number;    // 0-40 points (consistent intervals = stronger)
  amountScore: number;      // 0-30 points (similar amounts = stronger)
}

/**
 * Result of confidence calculation
 */
export interface ConfidenceResult {
  score: number;  // 0-100
  factors: ConfidenceFactors;
  frequency: "monthly" | "yearly" | null;
}

/**
 * Confidence scoring thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,    // Green - high confidence pattern
  MEDIUM: 50,  // Yellow - medium confidence
  LOW: 0,      // Red - low confidence (but still >= 70 to show)
  MIN_DISPLAY: 70,  // Minimum score to show suggestion
} as const;

/**
 * Interval detection tolerances (in days)
 */
const INTERVAL_TOLERANCE = 7;  // ±7 days for frequency detection
const MONTHLY_INTERVAL = 30;
const YEARLY_INTERVAL = 365;

/**
 * Calculate confidence score for a detected pattern.
 *
 * Scoring factors:
 * - Occurrence count (0-30): More occurrences = stronger pattern
 * - Interval consistency (0-40): Lower stddev relative to average = more regular
 * - Amount consistency (0-30): Lower stddev relative to average = more stable
 *
 * @param pattern - Detected pattern data from database query
 * @returns Confidence result with score (0-100), factor breakdown, and detected frequency
 */
export function calculatePatternConfidence(
  pattern: DetectedPattern
): ConfidenceResult {
  // Factor 1: Occurrence count (0-30 points)
  // 2 occurrences = 15, 3 = 20, 4 = 25, 5+ = 30
  const occurrenceScore = Math.min(30, 10 + (pattern.occurrenceCount * 5));

  // Factor 2: Interval consistency (0-40 points)
  // Lower coefficient of variation = more consistent = higher score
  let intervalScore = 0;
  if (pattern.avgIntervalDays > 0) {
    const intervalCv = pattern.intervalStddev / pattern.avgIntervalDays;
    intervalScore = Math.max(0, Math.round(40 - (intervalCv * 100)));
  }

  // Factor 3: Amount consistency (0-30 points)
  // Lower coefficient of variation = more stable = higher score
  let amountScore = 0;
  if (pattern.avgAmount > 0) {
    const amountCv = pattern.amountStddev / pattern.avgAmount;
    amountScore = Math.max(0, Math.round(30 - (amountCv * 100)));
  }

  const totalScore = Math.min(100, occurrenceScore + intervalScore + amountScore);

  // Detect frequency from average interval (±7 days tolerance)
  let frequency: "monthly" | "yearly" | null = null;
  if (Math.abs(pattern.avgIntervalDays - MONTHLY_INTERVAL) <= INTERVAL_TOLERANCE) {
    frequency = "monthly";
  } else if (Math.abs(pattern.avgIntervalDays - YEARLY_INTERVAL) <= INTERVAL_TOLERANCE) {
    frequency = "yearly";
  }

  return {
    score: totalScore,
    factors: { occurrenceScore, intervalScore, amountScore },
    frequency,
  };
}

/**
 * Check if confidence score meets display threshold
 */
export function isDisplayableConfidence(score: number): boolean {
  return score >= CONFIDENCE_THRESHOLDS.MIN_DISPLAY;
}

/**
 * Get confidence tier from score
 */
export function getConfidenceTier(score: number): "high" | "medium" | "low" {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}
