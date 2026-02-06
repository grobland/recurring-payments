/**
 * Multi-field weighted similarity scoring for duplicate detection.
 *
 * Uses Jaro-Winkler algorithm for fuzzy name matching and configurable
 * weights for combining field-level similarity scores.
 */

import stringSimilarity from "string-comparison";

/**
 * Represents a subscription record for similarity comparison.
 * Uses fields from the subscriptions table that are relevant for duplicate detection.
 */
export interface SubscriptionRecord {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  categoryId?: string | null;
  statementSource?: string | null;
}

/**
 * Configurable weights for each field in similarity calculation.
 * All weights should sum to 1.0 for consistent scoring.
 */
export interface SimilarityWeights {
  name: number; // Default: 0.5 - Most important for identifying duplicates
  amount: number; // Default: 0.25 - Important but amount can vary
  frequency: number; // Default: 0.15 - Monthly vs yearly is significant
  category: number; // Default: 0.05 - Helpful but often differs
  source: number; // Default: 0.05 - Bank/card info if available
}

/**
 * Result of similarity calculation between two subscription records.
 */
export interface SimilarityResult {
  /** Overall similarity score from 0-100 */
  score: number;
  /** Which fields matched (using thresholds for fuzzy fields) */
  matches: {
    name: boolean; // true if Jaro-Winkler >= 0.8
    amount: boolean; // true if within 5% tolerance and same currency
    frequency: boolean; // true if exact match
    category: boolean; // true if exact match (or both null)
    source: boolean; // true if Jaro-Winkler >= 0.8 (or either null)
  };
}

/**
 * Default weights emphasizing name as primary identifier.
 */
export const DEFAULT_WEIGHTS: SimilarityWeights = {
  name: 0.5,
  amount: 0.25,
  frequency: 0.15,
  category: 0.05,
  source: 0.05,
};

/**
 * Tolerance for amount comparison (5% variance allowed).
 */
const AMOUNT_TOLERANCE = 0.05;

/**
 * Threshold for considering a fuzzy name/source match.
 */
const FUZZY_MATCH_THRESHOLD = 0.8;

/**
 * Calculates weighted similarity score between two subscription records.
 *
 * @param sub1 - First subscription record
 * @param sub2 - Second subscription record
 * @param weights - Optional custom weights (defaults to DEFAULT_WEIGHTS)
 * @returns SimilarityResult with score (0-100) and matches object
 *
 * @example
 * ```ts
 * const result = calculateSimilarity(
 *   { name: "Netflix", amount: 15.99, currency: "USD", frequency: "monthly" },
 *   { name: "NETFLIX", amount: 16.00, currency: "USD", frequency: "monthly" }
 * );
 * // result.score ~= 100 (case-insensitive name match, amount within 5%)
 * // result.matches = { name: true, amount: true, frequency: true, ... }
 * ```
 */
export function calculateSimilarity(
  sub1: SubscriptionRecord,
  sub2: SubscriptionRecord,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityResult {
  // Get Jaro-Winkler algorithm
  const jaroWinkler = stringSimilarity.jaroWinkler;

  // Calculate name similarity (case-insensitive)
  const name1 = sub1.name.toLowerCase();
  const name2 = sub2.name.toLowerCase();
  const nameSim = jaroWinkler.similarity(name1, name2);
  const nameMatches = nameSim >= FUZZY_MATCH_THRESHOLD;

  // Calculate amount similarity (5% tolerance, same currency required)
  let amountSim = 0;
  let amountMatches = false;

  if (sub1.currency === sub2.currency) {
    // Handle zero amounts specially
    if (sub1.amount === 0 && sub2.amount === 0) {
      amountSim = 1.0;
      amountMatches = true;
    } else if (sub1.amount === 0 || sub2.amount === 0) {
      // One is zero, one is not - no match
      amountSim = 0;
      amountMatches = false;
    } else {
      const amountDiff = Math.abs(sub1.amount - sub2.amount);
      const amountAvg = (sub1.amount + sub2.amount) / 2;
      const percentDiff = amountDiff / amountAvg;

      if (percentDiff <= AMOUNT_TOLERANCE) {
        amountSim = 1.0;
        amountMatches = true;
      }
    }
  }

  // Calculate frequency similarity (exact match)
  const frequencySim = sub1.frequency === sub2.frequency ? 1.0 : 0.0;
  const frequencyMatches = frequencySim === 1.0;

  // Calculate category similarity (exact match, null-safe)
  // Both null/undefined = neutral (0.5), one null = no match, both same = match
  let categorySim: number;
  let categoryMatches: boolean;

  const cat1 = sub1.categoryId ?? null;
  const cat2 = sub2.categoryId ?? null;

  if (cat1 === null && cat2 === null) {
    // Both null - neutral score
    categorySim = 0.5;
    categoryMatches = false; // Not a definitive match
  } else if (cat1 === null || cat2 === null) {
    // One null, one not - no match
    categorySim = 0;
    categoryMatches = false;
  } else if (cat1 === cat2) {
    // Both have same value - match
    categorySim = 1.0;
    categoryMatches = true;
  } else {
    // Both have values but different - no match
    categorySim = 0;
    categoryMatches = false;
  }

  // Calculate source similarity (Jaro-Winkler if both exist, neutral if either missing)
  let sourceSim: number;
  let sourceMatches: boolean;

  const source1 = sub1.statementSource ?? null;
  const source2 = sub2.statementSource ?? null;

  if (source1 === null || source2 === null) {
    // Either missing - neutral score
    sourceSim = 0.5;
    sourceMatches = false; // Not a definitive match since data missing
  } else {
    // Both have values - compare with Jaro-Winkler
    sourceSim = jaroWinkler.similarity(
      source1.toLowerCase(),
      source2.toLowerCase()
    );
    sourceMatches = sourceSim >= FUZZY_MATCH_THRESHOLD;
  }

  // Calculate weighted total
  const totalScore =
    nameSim * weights.name +
    amountSim * weights.amount +
    frequencySim * weights.frequency +
    categorySim * weights.category +
    sourceSim * weights.source;

  // Convert to percentage (0-100) and round
  const percentage = Math.round(totalScore * 100);

  return {
    score: percentage,
    matches: {
      name: nameMatches,
      amount: amountMatches,
      frequency: frequencyMatches,
      category: categoryMatches,
      source: sourceMatches,
    },
  };
}
