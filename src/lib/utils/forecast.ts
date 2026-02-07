/**
 * Utility functions for spending forecast calculations.
 * Uses simple-statistics for statistical computations.
 */
import { sampleStandardDeviation, mean } from "simple-statistics";

/**
 * Z-scores for common confidence levels.
 * Used to calculate confidence interval widths from standard deviation.
 */
export const CONFIDENCE_LEVELS = {
  80: 1.28,
  90: 1.645,
  95: 1.96,
  99: 2.576,
} as const;

/**
 * Default volatility used when insufficient data is available.
 * 20% is a conservative estimate for subscription spending variability.
 */
const DEFAULT_VOLATILITY = 0.2;

/**
 * Maximum volatility cap to prevent unreasonably wide confidence bands.
 * 100% volatility means intervals can span 0 to 2x the forecast.
 */
const MAX_VOLATILITY = 1.0;

/**
 * Calculate the coefficient of variation (volatility) from historical monthly spending.
 *
 * The coefficient of variation (CV) is the ratio of standard deviation to mean,
 * expressing variability as a proportion of the average. A CV of 0.20 means
 * typical monthly spending varies by about 20% from the average.
 *
 * @param historicalMonthly - Array of monthly spending amounts
 * @returns Coefficient of variation (0 to 1), or 0.20 default for insufficient data
 *
 * @example
 * ```typescript
 * // Normal case with sufficient data
 * const volatility = calculateVolatility([100, 110, 105, 95, 100]);
 * // Returns approximately 0.054 (5.4% variation)
 *
 * // Edge case: insufficient data
 * const fallback = calculateVolatility([100]);
 * // Returns 0.20 (default 20% volatility)
 * ```
 */
export function calculateVolatility(historicalMonthly: number[]): number {
  // Need at least 2 data points to calculate standard deviation
  if (historicalMonthly.length < 2) {
    return DEFAULT_VOLATILITY;
  }

  const avg = mean(historicalMonthly);

  // Guard against zero or negative mean (can't divide by zero)
  if (avg <= 0) {
    return DEFAULT_VOLATILITY;
  }

  const stdDev = sampleStandardDeviation(historicalMonthly);
  const cv = stdDev / avg;

  // Cap at max volatility to prevent unreasonable bands
  return Math.min(cv, MAX_VOLATILITY);
}

/**
 * Calculate raw standard deviation from historical data.
 *
 * @param historicalMonthly - Array of past monthly spending totals
 * @returns Sample standard deviation, or 0 if insufficient data
 */
export function calculateStdDev(historicalMonthly: number[]): number {
  if (historicalMonthly.length < 2) {
    return 0;
  }

  return sampleStandardDeviation(historicalMonthly);
}

/**
 * Scale uncertainty for future projections using the square root of time rule.
 *
 * This implements the principle that for independent random variations,
 * the standard deviation of a sum grows with sqrt(n). This is why
 * fan charts "fan out" over time - uncertainty compounds.
 *
 * @param baseStdDev - The base standard deviation for a single period
 * @param monthsAhead - Number of months into the future (1 = current month)
 * @returns Scaled standard deviation for the projection horizon
 *
 * @example
 * ```typescript
 * const baseStdDev = 50; // $50 monthly std dev
 *
 * // 1 month ahead: no scaling
 * scaleUncertainty(50, 1); // Returns 50
 *
 * // 4 months ahead: uncertainty roughly doubles
 * scaleUncertainty(50, 4); // Returns 100 (50 * sqrt(4))
 *
 * // 12 months ahead: uncertainty scales by ~3.46x
 * scaleUncertainty(50, 12); // Returns ~173 (50 * sqrt(12))
 * ```
 */
export function scaleUncertainty(
  baseStdDev: number,
  monthsAhead: number
): number {
  return baseStdDev * Math.sqrt(monthsAhead);
}

/**
 * Result type for confidence interval calculations.
 */
export interface ConfidenceIntervals {
  /** Lower bound of 80% confidence interval */
  lower80: number;
  /** Upper bound of 80% confidence interval */
  upper80: number;
  /** Lower bound of 95% confidence interval */
  lower95: number;
  /** Upper bound of 95% confidence interval */
  upper95: number;
}

/**
 * Calculate confidence intervals for a spending forecast.
 *
 * Applies z-scores to the forecast's standard deviation to create
 * prediction intervals. Lower bounds are floored at zero since
 * spending cannot be negative.
 *
 * @param forecast - The point forecast (expected spending)
 * @param volatility - Coefficient of variation (0 to 1)
 * @param monthsAhead - Number of months into the future (default 1)
 * @returns Object with lower80, upper80, lower95, upper95 bounds
 *
 * @example
 * ```typescript
 * // Forecast $500 with 15% volatility, 1 month ahead
 * const intervals = addConfidenceIntervals(500, 0.15, 1);
 * // intervals.lower80 ~ $404, intervals.upper80 ~ $596
 * // intervals.lower95 ~ $353, intervals.upper95 ~ $647
 *
 * // 6 months ahead (uncertainty scales with sqrt(6))
 * const sixMonthIntervals = addConfidenceIntervals(500, 0.15, 6);
 * // Wider intervals due to sqrt(time) scaling
 * ```
 */
export function addConfidenceIntervals(
  forecast: number,
  volatility: number,
  monthsAhead: number = 1
): ConfidenceIntervals {
  // Calculate base standard deviation from forecast and volatility
  const forecastStdDev = forecast * volatility;

  // Scale uncertainty by sqrt(time) for future projections
  const scaledStdDev = scaleUncertainty(forecastStdDev, monthsAhead);

  // Calculate interval bounds using z-scores
  // Floor lower bounds at 0 (spending cannot be negative)
  return {
    lower80: Math.max(0, forecast - CONFIDENCE_LEVELS[80] * scaledStdDev),
    upper80: forecast + CONFIDENCE_LEVELS[80] * scaledStdDev,
    lower95: Math.max(0, forecast - CONFIDENCE_LEVELS[95] * scaledStdDev),
    upper95: forecast + CONFIDENCE_LEVELS[95] * scaledStdDev,
  };
}

/**
 * Round a number to 2 decimal places for currency display.
 *
 * @param value - Number to round
 * @returns Rounded number
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
