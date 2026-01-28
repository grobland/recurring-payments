import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { parseDocumentForSubscriptions, detectDuplicates } from "@/lib/openai/pdf-parser";
import { isUserActive } from "@/lib/auth/helpers";
import OpenAI from "openai";

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

    // Convert files to base64
    const base64Images: string[] = [];
    let totalPages = 0;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      if (file.type === "application/pdf") {
        // For PDFs, we'd need to convert to images first
        // For now, we'll just pass the first page as an image
        // In production, use a PDF-to-image library like pdf-lib or pdfjs
        // For MVP, we'll treat the PDF as a single page
        base64Images.push(base64);
        totalPages += 1;
      } else {
        base64Images.push(base64);
        totalPages += 1;
      }
    }

    // Parse documents using AI
    const mimeType = files[0].type === "application/pdf" ? "application/pdf" : files[0].type;
    const parseResult = await parseDocumentForSubscriptions(base64Images, mimeType);

    // Get existing subscriptions for duplicate detection
    const existingSubscriptions = await db.query.subscriptions.findMany({
      where: (table) =>
        eq(table.userId, session.user!.id) && isNull(table.deletedAt),
      columns: {
        id: true,
        name: true,
        amount: true,
        currency: true,
      },
    });

    // Detect duplicates
    const duplicates = detectDuplicates(
      parseResult.subscriptions,
      existingSubscriptions
    );

    // Mark subscriptions with duplicate info
    const subscriptionsWithDuplicates = parseResult.subscriptions.map((sub, index) => {
      const duplicate = duplicates.get(index);
      return {
        ...sub,
        isDuplicate: !!duplicate,
        duplicateOf: duplicate?.existingName,
        duplicateSimilarity: duplicate?.similarity,
      };
    });

    return NextResponse.json({
      subscriptions: subscriptionsWithDuplicates,
      pageCount: parseResult.pageCount,
      processingTime: parseResult.processingTime,
      detectedCount: parseResult.subscriptions.length,
      duplicateCount: duplicates.size,
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

    return NextResponse.json(
      { error: "Failed to process documents. Please try again." },
      { status: 500 }
    );
  }
}
