/**
 * Transfer and refund detection for transaction filtering.
 *
 * Identifies transactions that represent internal transfers, refunds,
 * reversals, and other non-merchant movements. These transactions are
 * skipped during merchant entity resolution and recurrence detection.
 *
 * Intentionally broad — false positives are acceptable because these
 * transactions still exist in the DB; they're just excluded from
 * merchant resolution and recurrence analysis.
 */

/**
 * Keywords that indicate a transaction is a transfer, refund, or
 * non-merchant movement (checked via substring match on lowercased input).
 */
const TRANSFER_REFUND_KEYWORDS: string[] = [
  "transfer",
  "tfr",
  "refund",
  "reversal",
  "payment received",
  "cashback",
  "interest paid",
  "interest earned",
  "direct debit returned",
  "chargeback",
];

/**
 * Determines whether a transaction description represents a transfer,
 * refund, reversal, or other non-merchant movement.
 *
 * @param description - Raw or normalized transaction description
 * @returns true if the description matches a transfer/refund pattern
 */
export function isTransferOrRefund(description: string): boolean {
  if (!description) return false;

  const lower = description.toLowerCase();

  return TRANSFER_REFUND_KEYWORDS.some((keyword) => lower.includes(keyword));
}
