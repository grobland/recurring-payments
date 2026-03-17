import { z } from "zod";

// ============ BANK STATEMENT LINE ITEM SCHEMA ============

/**
 * Zod schema for a single bank line item as returned by GPT-4o.
 * The AI maps various bank-specific labels to these normalized fields.
 */
export const bankLineItemSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  date: z.string().nullable(), // ISO 8601 date string or null for non-dated lines
  description: z.string().min(1, "Description is required"),
  debitAmount: z.number().nullable(), // Money out (positive number or null)
  creditAmount: z.number().nullable(), // Money in (positive number or null)
  balance: z.number().nullable(), // Running balance after this line
  reference: z.string().nullable().optional(), // Cheque number, reference, etc.
  type: z.string().nullable().optional(), // Transaction type (DD, SO, FPO, etc.)
  rawDescription: z.string().nullable().optional(), // Original text before normalization
});

export const bankExtractionResultSchema = z.array(bankLineItemSchema);

export type BankLineItem = z.infer<typeof bankLineItemSchema>;
export type BankExtractionResult = z.infer<typeof bankExtractionResultSchema>;

// ============ CREDIT CARD LINE ITEM SCHEMA ============

export const creditCardLineItemSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  transactionDate: z.string().nullable(), // Date the transaction occurred
  postingDate: z.string().nullable().optional(), // Date posted to account
  description: z.string().min(1, "Description is required"),
  amount: z.number().nullable(), // Charge amount (positive = charge, negative = credit/refund)
  foreignCurrencyAmount: z.number().nullable().optional(),
  foreignCurrency: z.string().nullable().optional(), // ISO 4217 code
  merchantCategory: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  rawDescription: z.string().nullable().optional(),
});

export const creditCardExtractionResultSchema = z.array(creditCardLineItemSchema);

export type CreditCardLineItem = z.infer<typeof creditCardLineItemSchema>;
export type CreditCardExtractionResult = z.infer<typeof creditCardExtractionResultSchema>;

// ============ LOAN LINE ITEM SCHEMA ============

export const loanLineItemSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  date: z.string().nullable(),
  description: z.string().min(1, "Description is required"),
  paymentAmount: z.number().nullable(), // Total payment
  principalAmount: z.number().nullable().optional(),
  interestAmount: z.number().nullable().optional(),
  feesAmount: z.number().nullable().optional(),
  remainingBalance: z.number().nullable().optional(),
  rawDescription: z.string().nullable().optional(),
});

export const loanExtractionResultSchema = z.array(loanLineItemSchema);

export type LoanLineItem = z.infer<typeof loanLineItemSchema>;
export type LoanExtractionResult = z.infer<typeof loanExtractionResultSchema>;
