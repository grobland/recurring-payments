import type { Transaction } from "@/lib/db/schema";

/**
 * Filter parameters for transaction browser
 */
export interface TransactionFilters {
  /** Filter by statement source type (e.g., "Chase Sapphire") */
  sourceType?: string;
  /** Filter by tag status: unreviewed | potential_subscription | not_subscription | converted | all */
  tagStatus?: string;
  /** Filter transactions on or after this date (ISO string) */
  dateFrom?: string;
  /** Filter transactions on or before this date (ISO string) */
  dateTo?: string;
  /** Search in merchant name or category guess */
  search?: string;
}

/**
 * Cursor for keyset pagination
 * Uses (transactionDate, id) composite for consistent ordering
 */
export interface TransactionCursor {
  /** ISO date string of the transaction date */
  transactionDate: string;
  /** UUID tiebreaker for stable sorting */
  id: string;
}

/**
 * Paginated response from /api/transactions
 */
export interface TransactionPage {
  /** Array of transactions for this page */
  transactions: TransactionWithSource[];
  /** Cursor for next page, null if no more pages */
  nextCursor: TransactionCursor | null;
  /** Whether more pages exist */
  hasMore: boolean;
  /** Optional total count for display */
  total?: number;
}

/**
 * Transaction with joined statement source type
 */
export type TransactionWithSource = Transaction & {
  /** Source type from joined statements table */
  sourceType: string | null;
};

/**
 * Tag status values for transaction categorization
 */
export type TagStatus =
  | "unreviewed"
  | "potential_subscription"
  | "not_subscription"
  | "converted";
