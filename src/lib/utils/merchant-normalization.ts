/**
 * Merchant descriptor normalization for transaction processing.
 *
 * Strips payment processor prefixes, business suffixes, trailing reference
 * numbers, and geographic indicators to produce a clean merchant name
 * suitable for entity resolution and deduplication.
 */

/**
 * Payment processor prefixes to strip from transaction descriptions.
 * Ordered longest-match first to avoid partial strips.
 */
const PROCESSOR_PREFIX_PATTERNS: RegExp[] = [
  /^apple\.com[*/]/i,
  /^paypal\s*\*/i,
  /^google\s*\*/i,
  /^stripe\s*\*/i,
  /^sq\*/i,
  /^tst\*/i,
  /^pp\*/i,
  /^cko\*/i,
];

/**
 * Business entity suffixes to strip (word-boundary match).
 * Only stripped when they appear as a standalone word at the end.
 */
const BUSINESS_SUFFIX_PATTERN = /\s+\b(ltd|llc|inc|co|plc|corp)\b\s*$/i;

/**
 * Trailing reference numbers: 6 or more consecutive digits at the end.
 */
const TRAILING_DIGITS_PATTERN = /\s+\d{6,}\s*$/;

/**
 * Trailing geographic suffix at end of string (after lowercasing).
 * Matches:
 * - City + 2-letter country code: " london gb", " new york us"
 * - Short numeric location ID + city + country: " 3287 london gb"
 * - Bare 2-letter country code: " gb", " us"
 *
 * Pattern: optional (digits or word) + optional word + 2-letter code at end.
 * Applied iteratively to handle stacked geographic tokens.
 */
const TRAILING_GEO_SUFFIX_PATTERN = /(\s+\d+)?(\s+[a-z]+)?\s+[a-z]{2}$/;

/**
 * Normalizes a raw merchant descriptor from a bank or credit card statement.
 *
 * Rules applied in order:
 * 1. Lowercase entire string
 * 2. Strip payment processor prefixes (SQ*, PAYPAL*, CKO*, STRIPE*, etc.)
 * 3. Strip trailing reference numbers (6+ consecutive digits)
 * 4. Strip business entity suffixes (LTD, LLC, INC, CO, PLC, CORP)
 * 5. Strip trailing 2-letter country/state codes
 * 6. Collapse multiple spaces to single space
 * 7. Trim whitespace
 *
 * @param raw - Raw merchant description from statement
 * @returns Normalized merchant name, lowercase and cleaned
 */
export function normalizeMerchantDescriptor(raw: string): string {
  if (!raw) return "";

  // Step 1: Lowercase
  let result = raw.toLowerCase();

  // Step 2: Strip processor prefixes (re-apply after lowercasing since patterns are case-insensitive)
  for (const pattern of PROCESSOR_PREFIX_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // Step 3: Strip trailing reference numbers (6+ digits)
  result = result.replace(TRAILING_DIGITS_PATTERN, "");

  // Step 4: Strip business suffixes
  result = result.replace(BUSINESS_SUFFIX_PATTERN, "");

  // Step 5: Strip trailing geographic suffixes (city + country code, bare country code)
  result = result.replace(TRAILING_GEO_SUFFIX_PATTERN, "");

  // Step 6: Collapse multiple spaces
  result = result.replace(/\s+/g, " ");

  // Step 7: Trim
  return result.trim();
}
