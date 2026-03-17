import { getOpenAIClient } from "./client";
import { z } from "zod";
import {
  bankExtractionResultSchema,
  bankLineItemSchema,
  creditCardExtractionResultSchema,
  creditCardLineItemSchema,
  loanExtractionResultSchema,
  loanLineItemSchema,
  type BankExtractionResult,
  type CreditCardExtractionResult,
  type LoanExtractionResult,
} from "@/lib/validations/line-item";

// ============ PROMPTS ============

const BANK_EXTRACTION_PROMPT = `Extract every INDIVIDUAL TRANSACTION from the bank statement. Return JSON array — no markdown.

Fields: sequenceNumber (1,2,3...), date (YYYY-MM-DD), description (merchant name as printed), debitAmount (Money Out, positive or null), creditAmount (Money In, positive or null), balance (running balance after this txn or null), reference (or null), type (DD/SO/FPO/FPI/BGC/ATM/POS/DEB/TFR or null), rawDescription (null unless you cleaned the description).

SKIP summary rows: Opening Balance, Closing Balance, Money In/Out totals, Balance Brought/Carried Forward.

Keep each row's date+description+amounts+balance together. Do NOT mix values between rows.

Example: [{"sequenceNumber":1,"date":"2025-01-05","description":"NETFLIX.COM","debitAmount":15.99,"creditAmount":null,"balance":1484.01,"reference":null,"type":"DD","rawDescription":null}]`;

const CREDIT_CARD_EXTRACTION_PROMPT = `Extract EVERY line item from the credit card statement. Return JSON array only — no markdown.

Fields per item:
- sequenceNumber: position (1,2,3...)
- transactionDate: YYYY-MM-DD or null
- postingDate: YYYY-MM-DD or null (date posted to account, if shown separately)
- description: merchant/payee name, cleaned
- amount: positive = charge, negative = credit/refund/payment. null for non-monetary lines
- foreignCurrencyAmount: original foreign amount or null
- foreignCurrency: ISO 4217 code (USD, EUR, etc.) or null
- merchantCategory: category if shown (Shopping, Travel, etc.) or null
- reference: transaction reference or null
- rawDescription: original text if different from description, else null

Rules:
- Include ALL lines: previous balance, payments, purchases, cash advances, interest, fees, new balance
- Charges are positive amounts. Payments and refunds are negative
- If foreign currency shown, put original amount in foreignCurrencyAmount and currency code in foreignCurrency

Example: [{"sequenceNumber":1,"transactionDate":null,"postingDate":null,"description":"Previous Balance","amount":null,"foreignCurrencyAmount":null,"foreignCurrency":null,"merchantCategory":null,"reference":null,"rawDescription":null}]

Empty doc → return []`;

const LOAN_EXTRACTION_PROMPT = `Extract EVERY line item from the loan/mortgage statement. Return JSON array only — no markdown.

Fields per item:
- sequenceNumber: position (1,2,3...)
- date: YYYY-MM-DD or null
- description: payment description, cleaned
- paymentAmount: total payment amount or null
- principalAmount: principal portion or null
- interestAmount: interest portion or null
- feesAmount: fees/charges portion or null
- remainingBalance: balance remaining after this line or null
- rawDescription: original text if different from description, else null

Rules:
- Include ALL lines: opening balance, payments, interest charges, fees, adjustments, closing balance
- Break down payments into principal/interest/fees when shown
- paymentAmount should be the total; principal+interest+fees are the breakdown

Example: [{"sequenceNumber":1,"date":null,"description":"Opening Balance","paymentAmount":null,"principalAmount":null,"interestAmount":null,"feesAmount":null,"remainingBalance":150000.00,"rawDescription":null}]

Empty doc → return []`;

// ============ GENERIC CHUNKED EXTRACTION ============

/** Max chars per chunk to stay within OpenAI's comfort zone for fast responses */
const MAX_CHUNK_CHARS = 8000;

/**
 * Calls GPT-4o-mini for a single chunk of statement text.
 * Generic: works with any prompt + Zod schema pair.
 */
async function extractChunk<T>(
  openai: ReturnType<typeof getOpenAIClient>,
  systemPrompt: string,
  text: string,
  seqOffset: number,
  arraySchema: z.ZodArray<z.ZodTypeAny>,
  itemSchema: z.ZodTypeAny,
  label: string,
  prevItems?: T[]
): Promise<T[]> {
  // Build user message with continuation context if available
  let userContent = `Extract every line item (start sequenceNumber at ${seqOffset + 1}):\n\n${text}`;

  if (prevItems && prevItems.length > 0) {
    // Give the LLM the last item from the previous chunk — compact, just enough to avoid duplication
    const last = prevItems[prevItems.length - 1] as Record<string, unknown>;
    const hint = `Last extracted: "${last.description}" bal:${last.balance ?? "?"}`;
    userContent = `${hint} — skip items already extracted, start AFTER it.\nsequenceNumber starts at ${seqOffset + 1}:\n\n${text}`;
  }

  const response = await openai.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    },
    {
      timeout: 60_000,
      maxRetries: 0,
    }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  let raw: unknown;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[line-item-extractor:${label}] No JSON array found in AI response`);
      return [];
    }
    raw = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error(`[line-item-extractor:${label}] Failed to parse AI response JSON:`, parseError);
    console.error(`[line-item-extractor:${label}] Raw response:`, content.slice(0, 500));
    return [];
  }

  // Batch validation
  const result = arraySchema.safeParse(raw);
  if (result.success) return result.data as T[];

  // Per-item fallback
  console.warn(
    `[line-item-extractor:${label}] Batch validation failed, trying per-item:`,
    result.error.issues.slice(0, 3)
  );

  if (!Array.isArray(raw)) return [];

  const validItems: T[] = [];
  for (const item of raw) {
    const itemResult = itemSchema.safeParse(item);
    if (itemResult.success) {
      validItems.push(itemResult.data as T);
    } else {
      console.warn(
        `[line-item-extractor:${label}] Skipping invalid item:`,
        JSON.stringify(item).slice(0, 200),
        itemResult.error.issues[0]
      );
    }
  }
  return validItems;
}

/**
 * Split text into chunks at record boundaries, staying under maxChars.
 *
 * Bank statement PDF text follows a repeating pattern:
 *   Date\nXX Feb 26\n.\nDescription\n...\n.\n...\nBalance (£)\nN,NNN.NN\n.
 *
 * We split at the ".\nDate\n" boundary to avoid cutting a transaction record
 * in half — which causes the LLM to mis-assign amounts between rows.
 *
 * Falls back to line-boundary splitting if no record boundaries are found.
 */
function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  // Try to split at record boundaries.
  // Lloyds Bank PDF text uses: "N,NNN.NN \n. \nDate \n" between records.
  // We match the ". \n" separator followed by "Date " to split cleanly.
  const recordBoundaryPattern = /\. \n(?=Date )/g;
  const boundaries: number[] = [];
  let match;
  while ((match = recordBoundaryPattern.exec(text)) !== null) {
    boundaries.push(match.index + 2); // +2 to include the ".\n", split BEFORE "Date\n"
  }

  if (boundaries.length > 0) {
    const chunks: string[] = [];
    let start = 0;

    for (const boundary of boundaries) {
      // If adding the next record would exceed maxChars, finalize current chunk
      if (boundary - start > maxChars && start < boundary) {
        // Find the last boundary that fits within maxChars
        let bestSplit = start;
        for (const b of boundaries) {
          if (b <= start) continue;
          if (b - start > maxChars) break;
          bestSplit = b;
        }

        if (bestSplit > start) {
          chunks.push(text.slice(start, bestSplit).trim());
          start = bestSplit;
        } else {
          // No boundary fits — force split at this boundary anyway
          chunks.push(text.slice(start, boundary).trim());
          start = boundary;
        }
      }
    }

    // Remaining text
    if (start < text.length) {
      const remaining = text.slice(start).trim();
      if (remaining) chunks.push(remaining);
    }

    // Validate we didn't produce a single chunk equal to the original
    if (chunks.length > 1) {
      return chunks;
    }
  }

  // Fallback: split at line boundaries
  const chunks: string[] = [];
  const lines = text.split("\n");
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

/**
 * Build a fingerprint for deduplication.
 * Uses description + amount + date + balance to uniquely identify a row.
 * Balance is critical: recurring payments to the same merchant for the same
 * amount (e.g. weekly salary) differ only by date and running balance.
 */
function itemFingerprint(item: Record<string, unknown>): string {
  const desc = String(item.description ?? "").toLowerCase().trim();

  // Find the first meaningful amount (works across bank, credit card, loan schemas)
  const amountFields = [
    "debitAmount", "creditAmount", "amount", "paymentAmount",
  ];
  let amt = "";
  for (const field of amountFields) {
    if (item[field] != null) {
      amt = String(item[field]);
      break;
    }
  }

  // Include date if available
  const date = String(item.date ?? item.transactionDate ?? "");

  // Include balance — this distinguishes recurring same-amount transactions
  const balance = String(item.balance ?? item.remainingBalance ?? "");

  return `${desc}|${amt}|${date}|${balance}`;
}

/**
 * Generic chunked extraction pipeline.
 * Splits text into overlapping chunks → extracts per chunk → deduplicates
 * overlap items → validates → re-numbers sequences.
 */
async function extractLineItems<T extends { sequenceNumber: number }>(
  text: string,
  systemPrompt: string,
  arraySchema: z.ZodArray<z.ZodTypeAny>,
  itemSchema: z.ZodTypeAny,
  label: string
): Promise<T[]> {
  const openai = getOpenAIClient();
  const chunks = chunkText(text, MAX_CHUNK_CHARS);

  if (chunks.length === 1) {
    return extractChunk<T>(openai, systemPrompt, text, 0, arraySchema, itemSchema, label);
  }

  console.log(`[line-item-extractor:${label}] Splitting ${text.length} chars into ${chunks.length} chunks`);
  const allItems: T[] = [];
  const seenFingerprints = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[line-item-extractor:${label}] Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);

    // Pass last items from previous chunk as context for continuity
    const prevItems = i > 0 ? allItems.slice(-3) : undefined;
    const items = await extractChunk<T>(openai, systemPrompt, chunks[i], allItems.length, arraySchema, itemSchema, label, prevItems);

    // Deduplicate: the LLM might still re-extract items from the continuation context
    let dupes = 0;
    for (const item of items) {
      const fp = itemFingerprint(item as unknown as Record<string, unknown>);
      if (seenFingerprints.has(fp)) {
        dupes++;
        continue;
      }
      seenFingerprints.add(fp);
      allItems.push(item);
    }

    if (dupes > 0) {
      console.log(`[line-item-extractor:${label}] Chunk ${i + 1}: ${items.length} extracted, ${dupes} duplicates removed`);
    }
  }

  // Re-number sequence numbers to be continuous
  allItems.forEach((item, idx) => {
    item.sequenceNumber = idx + 1;
  });

  return allItems;
}

// ============ PUBLIC API ============

/**
 * Extracts ALL line items from bank statement text using GPT-4o-mini.
 * Automatically chunks large statements to avoid OpenAI timeout.
 */
export async function extractBankLineItems(
  text: string
): Promise<BankExtractionResult> {
  return extractLineItems(
    text,
    BANK_EXTRACTION_PROMPT,
    bankExtractionResultSchema,
    bankLineItemSchema,
    "bank"
  );
}

/**
 * Extracts ALL line items from credit card statement text using GPT-4o-mini.
 * Automatically chunks large statements to avoid OpenAI timeout.
 */
export async function extractCreditCardLineItems(
  text: string
): Promise<CreditCardExtractionResult> {
  return extractLineItems(
    text,
    CREDIT_CARD_EXTRACTION_PROMPT,
    creditCardExtractionResultSchema,
    creditCardLineItemSchema,
    "credit-card"
  );
}

/**
 * Extracts ALL line items from loan/mortgage statement text using GPT-4o-mini.
 * Automatically chunks large statements to avoid OpenAI timeout.
 */
export async function extractLoanLineItems(
  text: string
): Promise<LoanExtractionResult> {
  return extractLineItems(
    text,
    LOAN_EXTRACTION_PROMPT,
    loanExtractionResultSchema,
    loanLineItemSchema,
    "loan"
  );
}
