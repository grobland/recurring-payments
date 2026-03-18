/**
 * Source hash generation for transaction deduplication.
 *
 * Generates a deterministic SHA-256 hash from a statement ID and sequence number.
 * Used to populate transactions.sourceHash, enabling idempotent re-processing:
 * if a statement is re-processed, existing transactions are skipped rather than
 * duplicated (via the partial unique index on source_hash WHERE source_hash IS NOT NULL).
 */

import { createHash } from "crypto";

/**
 * Generates a deterministic SHA-256 hex hash for a statement line item.
 *
 * The hash is computed from `${statementId}:${sequenceNumber}` and uniquely
 * identifies which line item in which statement produced a given transaction.
 *
 * This is synchronous — Node.js crypto.createHash is not async.
 *
 * @param statementId - UUID of the parent statement
 * @param sequenceNumber - 1-based sequence number of the line item within the statement
 * @returns 64-character lowercase hex string (SHA-256)
 *
 * @example
 * generateSourceHash("stmt-abc-123", 1)
 * // => "e3b0c44298fc1c149afb..." (64 hex chars)
 */
export function generateSourceHash(
  statementId: string,
  sequenceNumber: number
): string {
  return createHash("sha256")
    .update(`${statementId}:${sequenceNumber}`)
    .digest("hex");
}
