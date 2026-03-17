import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  statements,
  transactions,
  statementLineItems,
  financialAccounts,
  type BankLineItemDetails,
  type CreditCardLineItemDetails,
  type LoanLineItemDetails,
  type DocumentType,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseTextForSubscriptions } from "@/lib/openai/pdf-parser";
import { extractBankLineItems, extractCreditCardLineItems, extractLoanLineItems } from "@/lib/openai/line-item-extractor";
import { generateTransactionFingerprint } from "@/lib/utils/file-hash";
import { parseFilenameDate } from "@/lib/utils/parse-filename-date";

// Helper to extract text from PDF buffer server-side using pdf2json
async function extractPdfTextServer(buffer: Buffer): Promise<string> {
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
          reject(new Error(`PDF parsing failed: ${message || "Unknown error"}`));
        });

        pdfParser.on(
          "pdfParser_dataReady",
          (pdfData: {
            Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }>;
          }) => {
            let fullText = "";
            for (const page of pdfData.Pages) {
              for (const textItem of page.Texts) {
                for (const r of textItem.R) {
                  try {
                    fullText += decodeURIComponent(r.T) + " ";
                  } catch {
                    // Fall back to raw text if URI decoding fails
                    fullText += r.T + " ";
                  }
                }
              }
              fullText += "\n";
            }
            resolve(fullText.trim());
          }
        );

        pdfParser.parseBuffer(buffer);
      })
      .catch(reject);
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept FormData with PDF file
    const formData = await request.formData();
    const statementId = formData.get("statementId") as string | null;
    const file = formData.get("file") as File | null;

    if (!statementId) {
      return NextResponse.json(
        { error: "Statement ID is required" },
        { status: 400 }
      );
    }

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Extract text from PDF server-side
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractPdfTextServer(buffer);

    // Verify statement belongs to user and is pending
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, statementId),
        eq(statements.userId, session.user.id)
      ),
      columns: {
        id: true,
        processingStatus: true,
        statementDate: true,
        originalFilename: true,
        accountId: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    if (statement.processingStatus === "complete") {
      return NextResponse.json(
        { error: "Statement already processed" },
        { status: 400 }
      );
    }

    // Update status to processing
    await db
      .update(statements)
      .set({ processingStatus: "processing" })
      .where(eq(statements.id, statementId));

    try {
      // ── Resolve account type for line item extraction ──────────────
      let documentType: DocumentType = "bank_debit";
      let accountCurrency = "GBP"; // fallback

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

      // ── Run BOTH extractions in parallel ──────────────────────────
      // Subscription detection (existing) + full line item extraction (new)
      // run concurrently to avoid doubling processing time.
      const extractionStart = Date.now();
      console.log(`[batch/process] Starting parallel extraction (text: ${extractedText.length} chars, type: ${documentType})`);

      const subscriptionPromise = parseTextForSubscriptions(extractedText);

      type LineItemResult = { type: DocumentType; items: unknown[] } | null;
      let lineItemPromise: Promise<LineItemResult>;

      const wrapExtraction = async (
        type: DocumentType,
        fn: () => Promise<unknown[]>
      ): Promise<LineItemResult> => {
        try {
          const items = await fn();
          return { type, items };
        } catch (err) {
          console.error(
            `[batch/process] Line item extraction (${type}) failed (non-fatal):`,
            err instanceof Error ? err.message : err
          );
          return null;
        }
      };

      if (documentType === "bank_debit") {
        lineItemPromise = wrapExtraction("bank_debit", () => extractBankLineItems(extractedText));
      } else if (documentType === "credit_card") {
        lineItemPromise = wrapExtraction("credit_card", () => extractCreditCardLineItems(extractedText));
      } else if (documentType === "loan") {
        lineItemPromise = wrapExtraction("loan", () => extractLoanLineItems(extractedText));
      } else {
        lineItemPromise = Promise.resolve(null);
      }

      const [parseResult, lineItemResult] = await Promise.all([
        subscriptionPromise,
        lineItemPromise,
      ]);
      console.log(`[batch/process] Parallel extraction done in ${((Date.now() - extractionStart) / 1000).toFixed(1)}s — subs: ${parseResult.subscriptions.length}, lineItems: ${lineItemResult?.items?.length ?? 0}`);

      // ── Process subscription results (existing logic) ─────────────
      const transactionRecords = parseResult.subscriptions.map((item) => {
        const transactionDate = item.transactionDate
          ? new Date(item.transactionDate)
          : new Date();

        return {
          statementId,
          userId: session.user!.id,
          transactionDate,
          merchantName: item.name,
          amount: item.amount.toString(),
          currency: item.currency,
          description: item.rawText || null,
          fingerprint: generateTransactionFingerprint(
            item.name,
            item.amount,
            transactionDate,
            item.currency
          ),
          tagStatus:
            item.confidence >= 80
              ? ("potential_subscription" as const)
              : ("unreviewed" as const),
          confidenceScore: item.confidence,
          categoryGuess: null,
          rawText: item.rawText || null,
          aiMetadata: {
            extractedAt: new Date().toISOString(),
            model: "gpt-4o-mini",
          },
        };
      });

      const potentialCount = transactionRecords.filter(
        (t) => t.tagStatus === "potential_subscription"
      ).length;

      // Derive statementDate from earliest transaction date (if not already set)
      let derivedStatementDate: Date | undefined;
      if (transactionRecords.length > 0) {
        const dates = transactionRecords.map((t) => t.transactionDate.getTime());
        derivedStatementDate = new Date(Math.min(...dates));
      }

      if (!derivedStatementDate && statement.originalFilename) {
        const filenameDate = parseFilenameDate(statement.originalFilename);
        if (filenameDate) {
          derivedStatementDate = filenameDate;
        }
      }

      // Insert transactions (if any)
      if (transactionRecords.length > 0) {
        await db.insert(transactions).values(transactionRecords);
      }

      // ── Insert line items (if extraction succeeded) ───────────────
      let lineItemCount = 0;

      if (lineItemResult && lineItemResult.items.length > 0) {
        // Build records based on document type
        const records = lineItemResult.items.map((rawItem) => {
          if (lineItemResult.type === "bank_debit") {
            const item = rawItem as import("@/lib/validations/line-item").BankLineItem;
            return {
              statementId,
              userId: session.user!.id,
              sequenceNumber: item.sequenceNumber,
              transactionDate: item.date ? new Date(item.date + "T00:00:00Z") : null,
              description: item.description,
              amount: item.debitAmount != null
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
            };
          } else if (lineItemResult.type === "credit_card") {
            const item = rawItem as import("@/lib/validations/line-item").CreditCardLineItem;
            return {
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
            };
          } else {
            // loan
            const item = rawItem as import("@/lib/validations/line-item").LoanLineItem;
            return {
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
            };
          }
        });

        try {
          await db.insert(statementLineItems).values(records);
          lineItemCount = records.length;
        } catch (insertError) {
          console.error(
            "[batch/process] Line item DB insert failed (non-fatal):",
            insertError instanceof Error ? insertError.message : insertError
          );
        }
      }

      // Update statement as complete
      await db
        .update(statements)
        .set({
          processingStatus: "complete",
          transactionCount: transactionRecords.length,
          processedAt: new Date(),
          ...(!statement.statementDate && derivedStatementDate
            ? { statementDate: derivedStatementDate }
            : {}),
        })
        .where(eq(statements.id, statementId));

      return NextResponse.json({
        success: true,
        statementId,
        transactionCount: transactionRecords.length,
        lineItemCount,
        potentialCount,
        processingTime: parseResult.processingTime,
      });
    } catch (parseError) {
      // Update statement as failed
      await db
        .update(statements)
        .set({
          processingStatus: "failed",
          processingError:
            parseError instanceof Error ? parseError.message : "Unknown error",
        })
        .where(eq(statements.id, statementId));

      console.error("Processing error:", parseError);
      return NextResponse.json(
        { error: "Failed to process statement" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: "Failed to process statement" },
      { status: 500 }
    );
  }
}
