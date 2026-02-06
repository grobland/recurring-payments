import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
// eq, isNull used via query builder helpers
import { parseDocumentForSubscriptions, parseTextForSubscriptions, type DetectedSubscription } from "@/lib/openai/pdf-parser";
import { isUserActive } from "@/lib/auth/helpers";
import { calculateSimilarity, type SubscriptionRecord, type SimilarityResult } from "@/lib/utils/similarity";
import OpenAI from "openai";

// Threshold for considering a subscription as a potential duplicate
const DUPLICATE_THRESHOLD = 70;

/**
 * Interface for enhanced duplicate match info returned to client
 */
interface DuplicateMatch {
  existingId: string;
  existingName: string;
  existingAmount: string;
  existingCurrency: string;
  existingFrequency: string;
  score: number;
  matches: Record<string, boolean>;
}

/**
 * Detects potential duplicates using the weighted similarity algorithm.
 * Returns a Map of detected subscription index -> best matching existing subscription.
 */
function detectDuplicatesEnhanced(
  detected: DetectedSubscription[],
  existing: { id: string; name: string; amount: string; currency: string; frequency: string }[]
): Map<number, DuplicateMatch> {
  const duplicates = new Map<number, DuplicateMatch>();

  detected.forEach((sub, index) => {
    let bestMatch: DuplicateMatch | null = null;
    let bestScore = 0;

    for (const existingSub of existing) {
      // Build SubscriptionRecord for comparison
      const detectedRecord: SubscriptionRecord = {
        name: sub.name,
        amount: sub.amount,
        currency: sub.currency,
        frequency: sub.frequency,
      };

      const existingRecord: SubscriptionRecord = {
        name: existingSub.name,
        amount: parseFloat(existingSub.amount),
        currency: existingSub.currency,
        frequency: existingSub.frequency as "monthly" | "yearly",
      };

      const result: SimilarityResult = calculateSimilarity(detectedRecord, existingRecord);

      // Only consider matches at or above the threshold
      if (result.score >= DUPLICATE_THRESHOLD && result.score > bestScore) {
        bestScore = result.score;
        bestMatch = {
          existingId: existingSub.id,
          existingName: existingSub.name,
          existingAmount: existingSub.amount,
          existingCurrency: existingSub.currency,
          existingFrequency: existingSub.frequency,
          score: result.score,
          matches: result.matches,
        };
      }
    }

    if (bestMatch) {
      duplicates.set(index, bestMatch);
    }
  });

  return duplicates;
}

// Helper to extract text from PDF using pdf2json (serverless-compatible)
async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Dynamic import for pdf2json
      import("pdf2json").then(({ default: PDFParser }) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: unknown) => {
          const error = errData as { parserError?: Error } | Error;
          const message = 'parserError' in error ? error.parserError?.message : (error as Error).message;
          console.error("PDF parsing error:", message);
          reject(new Error(`PDF text extraction failed: ${message || 'Unknown error'}`));
        });

        pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
          try {
            // Extract text from all pages
            let fullText = "";
            for (const page of pdfData.Pages) {
              for (const textItem of page.Texts) {
                for (const r of textItem.R) {
                  fullText += decodeURIComponent(r.T) + " ";
                }
              }
              fullText += "\n";
            }
            resolve(fullText.trim());
          } catch (error) {
            reject(new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });

        pdfParser.parseBuffer(pdfBuffer);
      }).catch(reject);
    } catch (error) {
      console.error("PDF text extraction error:", error);
      reject(new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can import
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to import subscriptions." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10MB limit` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" has an unsupported format. Please use PDF, PNG, JPEG, or WebP.` },
          { status: 400 }
        );
      }
    }

    // Process files - extract text from PDFs, use images directly for image files
    const base64Images: string[] = [];
    let extractedText = "";
    let totalPages = 0;
    let hasPdf = false;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();

      if (file.type === "application/pdf") {
        // Extract text from PDF
        hasPdf = true;
        const pdfBuffer = Buffer.from(arrayBuffer);
        const text = await extractTextFromPdf(pdfBuffer);
        extractedText += text + "\n";
        totalPages += 1;
      } else {
        // Image files - use directly
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        base64Images.push(base64);
        totalPages += 1;
      }
    }

    // Parse documents using AI
    let parseResult;
    if (hasPdf && extractedText.trim()) {
      // For PDFs, use text-based parsing
      parseResult = await parseTextForSubscriptions(extractedText);
    } else {
      // For images, use vision-based parsing
      const mimeType = files[0].type;
      parseResult = await parseDocumentForSubscriptions(base64Images, mimeType);
    }

    // Get existing subscriptions for duplicate detection (only active ones)
    const existingSubscriptions = await db.query.subscriptions.findMany({
      where: (table, { and, eq, isNull }) =>
        and(
          eq(table.userId, session.user!.id),
          eq(table.status, "active"),
          isNull(table.deletedAt)
        ),
      columns: {
        id: true,
        name: true,
        amount: true,
        currency: true,
        frequency: true,
      },
    });

    // Detect duplicates using enhanced weighted similarity algorithm
    const duplicates = detectDuplicatesEnhanced(
      parseResult.subscriptions,
      existingSubscriptions
    );

    // Mark subscriptions with enhanced duplicate info
    const subscriptionsWithDuplicates = parseResult.subscriptions.map((sub, index) => {
      const duplicateMatch = duplicates.get(index);
      return {
        ...sub,
        duplicateMatch: duplicateMatch || null,
      };
    });

    return NextResponse.json({
      subscriptions: subscriptionsWithDuplicates,
      pageCount: parseResult.pageCount,
      processingTime: parseResult.processingTime,
      detectedCount: parseResult.subscriptions.length,
      duplicateCount: duplicates.size,
      // Include raw extraction data for persistence
      rawExtractionData: {
        subscriptions: parseResult.subscriptions,
        model: "gpt-4o",
        processingTime: parseResult.processingTime,
        pageCount: parseResult.pageCount,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Import error:", error);

    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Service temporarily busy. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (error.status === 408 || error.message?.includes('timeout')) {
        return NextResponse.json(
          { error: "Processing took too long. Please try with a smaller file." },
          { status: 408 }
        );
      }
    }

    // Return more specific error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}
