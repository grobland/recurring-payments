/**
 * File hashing utilities for duplicate detection.
 *
 * Uses Web Crypto API for client-side SHA-256 hashing with chunked processing
 * to handle large files (50MB+) without memory issues.
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

/**
 * Calculate SHA-256 hash of a file using Web Crypto API.
 * Uses chunked processing for memory efficiency with large files.
 *
 * @param file - File to hash
 * @returns Promise<string> - Hex-encoded SHA-256 hash
 */
export async function hashFile(file: File): Promise<string> {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  // For single chunk files, hash directly
  if (chunks === 1) {
    const buffer = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return arrayBufferToHex(hash);
  }

  // For multi-chunk files, process sequentially to prevent memory exhaustion
  const chunkHashes: ArrayBuffer[] = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const buffer = await chunk.arrayBuffer();
    const chunkHash = await crypto.subtle.digest("SHA-256", buffer);
    chunkHashes.push(chunkHash);
  }

  // Combine chunk hashes into single buffer
  const combined = new Uint8Array(
    chunkHashes.reduce((acc, hash) => {
      const arr = Array.from(new Uint8Array(hash));
      return acc.concat(arr);
    }, [] as number[])
  );

  // Final hash of combined chunk hashes
  const finalHash = await crypto.subtle.digest("SHA-256", combined);
  return arrayBufferToHex(finalHash);
}

/**
 * Convert ArrayBuffer to hex string.
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate transaction fingerprint for deduplication.
 * Hash of normalized merchant + amount + date + currency.
 *
 * This is a synchronous operation using a simple hash algorithm
 * (not cryptographically secure, just for deduplication).
 *
 * @param merchantName - Merchant name
 * @param amount - Transaction amount
 * @param date - Transaction date
 * @param currency - Currency code
 * @returns string - Fingerprint (16 character hex string)
 */
export function generateTransactionFingerprint(
  merchantName: string,
  amount: number,
  date: Date,
  currency: string
): string {
  // Normalize merchant name (lowercase, remove special chars and spaces)
  const normalizedMerchant = merchantName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Create deterministic string
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const data = `${normalizedMerchant}:${amount.toFixed(2)}:${dateStr}:${currency.toUpperCase()}`;

  // Use simple hash for synchronous fingerprint (not crypto-secure, just for dedup)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Pad to consistent length (16 chars)
  return Math.abs(hash).toString(16).padStart(16, "0");
}
