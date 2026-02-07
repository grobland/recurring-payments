/**
 * Forecast types for spending prediction views.
 * Used by the forecast API endpoints and React components.
 */

// ============================================================================
// Calendar Forecast Types
// ============================================================================

/**
 * A single upcoming charge event.
 * Represents one subscription renewal within the forecast window.
 */
export interface UpcomingCharge {
  /** ISO date string of the charge */
  date: string;
  /** Subscription UUID */
  subscriptionId: string;
  /** Subscription display name */
  subscriptionName: string;
  /** Charge amount in original currency */
  amount: number;
  /** ISO currency code (e.g., "USD", "EUR") */
  currency: string;
  /** Category UUID, null if uncategorized */
  categoryId: string | null;
  /** Category display name */
  categoryName: string;
  /** Hex color code for the category (e.g., "#8b5cf6") */
  categoryColor: string;
}

/**
 * Aggregate summary for the calendar forecast window.
 */
export interface CalendarSummary {
  /** Total amount of all upcoming charges (in original currencies, not converted) */
  totalAmount: number;
  /** Total number of charge events */
  chargeCount: number;
  /** Number of unique subscriptions with renewals in this window */
  uniqueSubscriptions: number;
  /** ISO date string of the forecast window start */
  startDate: string;
  /** ISO date string of the forecast window end */
  endDate: string;
}

/**
 * Full response from GET /api/forecast/calendar.
 */
export interface CalendarResponse {
  /** List of upcoming charges, sorted chronologically */
  charges: UpcomingCharge[];
  /** Aggregate summary statistics */
  summary: CalendarSummary;
  /** User's display currency for reference */
  displayCurrency: string;
}

// ============================================================================
// Monthly Forecast Types
// ============================================================================

/**
 * Single month forecast with confidence intervals.
 * Confidence intervals widen for months further in the future.
 */
export interface MonthlyForecast {
  /** Month in yyyy-MM format (e.g., "2026-03") */
  month: string;
  /** Point forecast (expected spending) */
  forecast: number;
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
 * Metadata about how the forecast was calculated.
 */
export interface ForecastMetadata {
  /** Number of historical months used to calculate volatility */
  historicalMonths: number;
  /** Coefficient of variation (stdDev / mean), 0-1 scale */
  coefficientOfVariation: number;
}

/**
 * Full response from GET /api/forecast/monthly.
 */
export interface MonthlyForecastResponse {
  /** Array of monthly forecasts with confidence intervals */
  forecasts: MonthlyForecast[];
  /** User's display currency */
  displayCurrency: string;
  /** Calculation metadata */
  metadata: ForecastMetadata;
}

// ============================================================================
// Annual Forecast Types
// ============================================================================

/**
 * Extended metadata for annual forecasts.
 */
export interface AnnualForecastMetadata extends ForecastMetadata {
  /** Standard deviation of monthly spending (in display currency) */
  monthlyStdDev: number;
}

/**
 * Full response from GET /api/forecast/annual.
 */
export interface AnnualForecastResponse {
  /** Total annual spending projection */
  forecast: number;
  /** Lower bound of 80% confidence interval */
  lower80: number;
  /** Upper bound of 80% confidence interval */
  upper80: number;
  /** Lower bound of 95% confidence interval */
  lower95: number;
  /** Upper bound of 95% confidence interval */
  upper95: number;
  /** 12-month breakdown with individual confidence intervals */
  monthlyProjections: MonthlyForecast[];
  /** User's display currency */
  displayCurrency: string;
  /** Extended metadata including monthly standard deviation */
  metadata: AnnualForecastMetadata;
}
