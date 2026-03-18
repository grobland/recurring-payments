/**
 * StatementParser abstraction for line item extraction.
 *
 * Provides a stable interface for extracting line items from statement text.
 * The GenericStatementParser wraps the existing OpenAI-powered extractors.
 * Future provider-specific parsers (Chase, HSBC, etc.) can implement
 * StatementParser without changing pipeline code.
 */

import type { DocumentType } from "@/lib/db/schema";
import type {
  BankExtractionResult,
  CreditCardExtractionResult,
  LoanExtractionResult,
} from "@/lib/validations/line-item";
import {
  extractBankLineItems,
  extractCreditCardLineItems,
  extractLoanLineItems,
} from "./line-item-extractor";

/**
 * Union of all possible line item extraction results.
 * The concrete type depends on the documentType passed to extractLineItems.
 */
export type LineItemExtractionResult =
  | BankExtractionResult
  | CreditCardExtractionResult
  | LoanExtractionResult;

/**
 * Interface for statement text parsers.
 *
 * Implementations take raw PDF-extracted text and a document type,
 * and return a typed array of line items via the appropriate extractor.
 */
export interface StatementParser {
  extractLineItems(
    text: string,
    documentType: DocumentType
  ): Promise<LineItemExtractionResult>;
}

/**
 * Generic statement parser that delegates to the existing OpenAI extractors
 * based on document type.
 *
 * This is the default implementation used by the ingestion pipeline.
 * It wraps extractBankLineItems, extractCreditCardLineItems, and
 * extractLoanLineItems from line-item-extractor.ts.
 */
export class GenericStatementParser implements StatementParser {
  async extractLineItems(
    text: string,
    documentType: DocumentType
  ): Promise<LineItemExtractionResult> {
    switch (documentType) {
      case "bank_debit":
        return extractBankLineItems(text);
      case "credit_card":
        return extractCreditCardLineItems(text);
      case "loan":
        return extractLoanLineItems(text);
      default: {
        const _exhaustiveCheck: never = documentType;
        throw new Error(`Unsupported document type: ${_exhaustiveCheck}`);
      }
    }
  }
}
