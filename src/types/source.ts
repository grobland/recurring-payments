/**
 * Source coverage types for statement dashboard
 */

/**
 * Coverage statistics for a single statement source (e.g., "Chase Sapphire")
 */
export interface SourceCoverage {
  /** Source type identifier (e.g., "Chase Sapphire", "Bank of America") */
  sourceType: string;
  /** ISO date of earliest statement */
  earliestStatementDate: string;
  /** ISO date of latest statement */
  latestStatementDate: string;
  /** Total number of statements from this source */
  statementCount: number;
  /** Total number of transactions across all statements */
  transactionCount: number;
  /** ISO date of most recent import */
  lastImportDate: string;
  /** Transaction status breakdown */
  stats: {
    /** Transactions converted to subscriptions */
    converted: number;
    /** Transactions marked as not_subscription */
    skipped: number;
    /** Transactions in unreviewed or potential_subscription status */
    pending: number;
  };
  /** Array of missing months in YYYY-MM format */
  gaps: string[];
}

/**
 * Summary of a single statement within a source
 */
export interface StatementSummary {
  /** Statement UUID */
  id: string;
  /** Original uploaded filename */
  originalFilename: string;
  /** Statement date (ISO string) */
  statementDate: string;
  /** When the statement was uploaded (ISO string) */
  uploadedAt: string;
  /** Number of transactions in this statement */
  transactionCount: number;
  /** Transaction status breakdown for this statement */
  stats: {
    converted: number;
    skipped: number;
    pending: number;
  };
  /** Whether the original PDF is stored in Supabase Storage */
  hasPdf: boolean;
}

/**
 * Transaction detail for statement drill-down
 */
export interface StatementTransaction {
  /** Transaction UUID */
  id: string;
  /** Transaction date (ISO string) */
  transactionDate: string;
  /** Merchant name from statement */
  merchantName: string;
  /** Transaction amount as string (for decimal precision) */
  amount: string;
  /** Currency code (e.g., "USD") */
  currency: string;
  /** Current tag status */
  tagStatus: string;
  /** ID of subscription if converted, null otherwise */
  convertedToSubscriptionId: string | null;
}
