/**
 * Analytics types for the dashboard spending views.
 * Used by the analytics API and React hooks.
 */

/**
 * Period types for analytics filtering
 */
export type AnalyticsPeriod = "month" | "year" | "quarter";

/**
 * Parameters for querying analytics
 */
export interface AnalyticsParams {
  /** Time period granularity */
  period: AnalyticsPeriod;
  /** Year to query (e.g., 2026) */
  year: number;
  /** Month (1-12), required when period is 'month' */
  month?: number;
  /** Quarter (1-4), required when period is 'quarter' */
  quarter?: number;
}

/**
 * Spending breakdown by category
 */
export interface CategoryBreakdown {
  /** Category UUID, null for uncategorized subscriptions */
  id: string | null;
  /** Category display name */
  name: string;
  /** Hex color code (e.g., "#8b5cf6") */
  color: string;
  /** Lucide icon name */
  icon: string;
  /** Amount converted to user's display currency */
  amount: number;
  /** Number of subscriptions in this category */
  count: number;
  /** Percentage of total spending (0-100) */
  percentage: number;
}

/**
 * Original currency breakdown before conversion
 */
export interface CurrencyBreakdown {
  /** ISO currency code (e.g., "USD", "EUR") */
  currency: string;
  /** Total amount in this currency */
  amount: number;
}

/**
 * Full analytics response from the API
 */
export interface AnalyticsResponse {
  /** Time period for this data */
  period: AnalyticsPeriod;
  /** Year the data covers */
  year: number;
  /** Month (1-12) when period is 'month' */
  month?: number;
  /** Quarter (1-4) when period is 'quarter' */
  quarter?: number;
  /** Total monthly spending in display currency */
  totalMonthly: number;
  /** Total yearly spending in display currency */
  totalYearly: number;
  /** Number of active subscriptions */
  subscriptionCount: number;
  /** Number of categories with subscriptions */
  categoryCount: number;
  /** User's preferred display currency */
  displayCurrency: string;
  /** Spending breakdown by category */
  categories: CategoryBreakdown[];
  /** Original currency amounts before conversion */
  currencyBreakdown: CurrencyBreakdown[];
  /** ISO date when FX rates were last fetched */
  rateTimestamp: string;
}
