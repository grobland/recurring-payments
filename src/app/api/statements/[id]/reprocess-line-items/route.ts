import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  statements,
  statementLineItems,
  financialAccounts,
  type BankLineItemDetails,
  type CreditCardLineItemDetails,
  type LoanLineItemDetails,
  type DocumentType,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { extractBankLineItems, extractCreditCardLineItems, extractLoanLineItems } from "@/lib/openai/line-item-extractor";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "statements";

/** Extract text from a PDF buffer using pdf2json */
async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    import("pdf2json")
      .then(({ default: PDFParser }) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: unknown) => {
          const error = errData as { parserError?: Error } | Error;
          const message =
            "parserError" in error
              ? error.parserError?.message
              : (error as Error).message;
          reject(new Error(`PDF parse error: ${message}`));
        });

        pdfParser.on(
          "pdfParser_dataReady",
          (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
            let fullText = "";
            for (const page of pdfData.Pages ?? []) {
              for (const textItem of page.Texts ?? []) {
                for (const run of textItem.R ?? []) {
                  if (run.T) {
                    fullText += decodeURIComponent(run.T) + " ";
                  }
                }
                fullText += "\n";
              }
            }
            resolve(fullText.trim());
          }
        );

        pdfParser.parseBuffer(buffer);
      })
      .catch(reject);
  });
}

/**
 * POST /api/statements/[id]/reprocess-line-items
 *
 * Re-runs line item extraction on an already-processed statement.
 * Downloads the PDF from Supabase Storage, extracts text, then
 * extracts line items with GPT-4o-mini.
 *
 * Skips if the statement already has line items.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = await params;

    // Verify statement belongs to user
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, statementId),
        eq(statements.userId, session.user.id)
      ),
      columns: {
        id: true,
        processingStatus: true,
        pdfStoragePath: true,
        accountId: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    if (!statement.pdfStoragePath) {
      return NextResponse.json(
        { error: "Statement has no stored PDF" },
        { status: 400 }
      );
    }

    // Delete existing line items if present (re-extraction replaces the whole set)
    const deleted = await db
      .delete(statementLineItems)
      .where(eq(statementLineItems.statementId, statementId))
      .returning({ id: statementLineItems.id });

    if (deleted.length > 0) {
      console.log(`[reprocess-line-items] Deleted ${deleted.length} existing line items for ${statementId}`);
    }

    // Resolve account type
    let documentType: DocumentType = "bank_debit";
    let accountCurrency = "GBP";

    if (statement.accountId) {
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.id, statement.accountId),
        columns: { accountType: true, currency: true },
      });
      if (account) {
        documentType = account.accountType as DocumentType;
        accountCurrency = account.currency;
      }
    }

    if (!["bank_debit", "credit_card", "loan"].includes(documentType)) {
      return NextResponse.json(
        { error: `Extraction not yet supported for type: ${documentType}` },
        { status: 400 }
      );
    }

    // Download PDF from Supabase Storage
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Storage client not configured" },
        { status: 500 }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(statement.pdfStoragePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Failed to download PDF from storage", details: downloadError?.message },
        { status: 500 }
      );
    }

    // Extract text from PDF
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extractedText = await extractPdfText(buffer);

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        { error: "Extracted text too short — PDF may be image-based", textLength: extractedText.length },
        { status: 400 }
      );
    }

    // Extract line items based on document type
    const startTime = Date.now();
    console.log(`[reprocess-line-items] Starting ${documentType} extraction for ${statementId} (${extractedText.length} chars)`);

    let lineItemRecords: Array<{
      statementId: string;
      userId: string;
      sequenceNumber: number;
      transactionDate: Date | null;
      description: string;
      amount: string | null;
      currency: string;
      balance: string | null;
      documentType: "bank_debit" | "credit_card" | "loan";
      details: BankLineItemDetails | CreditCardLineItemDetails | LoanLineItemDetails;
    }>;

    if (documentType === "bank_debit") {
      const lineItems = await extractBankLineItems(extractedText);
      lineItemRecords = lineItems.map((item) => ({
        statementId,
        userId: session.user!.id,
        sequenceNumber: item.sequenceNumber,
        transactionDate: item.date ? new Date(item.date + "T00:00:00Z") : null,
        description: item.description,
        amount:
          item.debitAmount != null
            ? (-item.debitAmount).toString()
            : item.creditAmount != null
              ? item.creditAmount.toString()
              : null,
        currency: accountCurrency,
        balance: item.balance?.toString() ?? null,
        documentType: "bank_debit" as const,
        details: {
          debitAmount: item.debitAmount?.toString() ?? null,
          creditAmount: item.creditAmount?.toString() ?? null,
          reference: item.reference ?? null,
          type: item.type ?? null,
          rawDescription: item.rawDescription ?? null,
        } satisfies BankLineItemDetails,
      }));
    } else if (documentType === "credit_card") {
      const lineItems = await extractCreditCardLineItems(extractedText);
      lineItemRecords = lineItems.map((item) => ({
        statementId,
        userId: session.user!.id,
        sequenceNumber: item.sequenceNumber,
        transactionDate: item.transactionDate ? new Date(item.transactionDate + "T00:00:00Z") : null,
        description: item.description,
        amount: item.amount?.toString() ?? null,
        currency: accountCurrency,
        balance: null,
        documentType: "credit_card" as const,
        details: {
          postingDate: item.postingDate ?? null,
          merchantCategory: item.merchantCategory ?? null,
          foreignCurrencyAmount: item.foreignCurrencyAmount?.toString() ?? null,
          foreignCurrency: item.foreignCurrency ?? null,
          reference: item.reference ?? null,
          rawDescription: item.rawDescription ?? null,
        } satisfies CreditCardLineItemDetails,
      }));
    } else {
      // loan
      const lineItems = await extractLoanLineItems(extractedText);
      lineItemRecords = lineItems.map((item) => ({
        statementId,
        userId: session.user!.id,
        sequenceNumber: item.sequenceNumber,
        transactionDate: item.date ? new Date(item.date + "T00:00:00Z") : null,
        description: item.description,
        amount: item.paymentAmount?.toString() ?? null,
        currency: accountCurrency,
        balance: item.remainingBalance?.toString() ?? null,
        documentType: "loan" as const,
        details: {
          principalAmount: item.principalAmount?.toString() ?? null,
          interestAmount: item.interestAmount?.toString() ?? null,
          feesAmount: item.feesAmount?.toString() ?? null,
          remainingBalance: item.remainingBalance?.toString() ?? null,
          rawDescription: item.rawDescription ?? null,
        } satisfies LoanLineItemDetails,
      }));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[reprocess-line-items] Extracted ${lineItemRecords.length} line items in ${elapsed}s`);

    if (lineItemRecords.length === 0) {
      return NextResponse.json({
        success: true,
        lineItemCount: 0,
        processingTime: `${elapsed}s`,
        message: "No line items extracted",
      });
    }

    await db.insert(statementLineItems).values(lineItemRecords);

    return NextResponse.json({
      success: true,
      lineItemCount: lineItemRecords.length,
      processingTime: `${elapsed}s`,
      documentType,
    });
  } catch (error) {
    console.error("[reprocess-line-items] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to reprocess line items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
