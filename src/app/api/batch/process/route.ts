import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseTextForSubscriptions } from "@/lib/openai/pdf-parser";
import { generateTransactionFingerprint } from "@/lib/utils/file-hash";

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
      // Use existing AI parser (returns subscriptions, but we treat as all transactions)
      // TODO: Update parseTextForSubscriptions to return ALL line items, not just subscriptions
      const parseResult = await parseTextForSubscriptions(extractedText);

      // Transform parsed results to transactions
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
          categoryGuess: null, // Will be populated in future phases
          rawText: item.rawText || null,
          aiMetadata: {
            extractedAt: new Date().toISOString(),
            model: "gpt-4o",
          },
        };
      });

      // Count high-confidence items tagged as potential_subscription
      const potentialCount = transactionRecords.filter(
        (t) => t.tagStatus === "potential_subscription"
      ).length;

      // Derive statementDate from earliest transaction date (if not already set)
      let derivedStatementDate: Date | undefined;
      if (transactionRecords.length > 0) {
        const dates = transactionRecords.map((t) => t.transactionDate.getTime());
        derivedStatementDate = new Date(Math.min(...dates));
      }

      // Insert transactions (if any)
      if (transactionRecords.length > 0) {
        await db.insert(transactions).values(transactionRecords);
      }

      // Update statement as complete (include statementDate only if not already set)
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
