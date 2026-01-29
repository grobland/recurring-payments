import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { parseDocumentForSubscriptions, detectDuplicates } from "@/lib/openai/pdf-parser";
import { isUserActive } from "@/lib/auth/helpers";
import OpenAI from "openai";

// Helper to convert PDF to images using unpdf (serverless-compatible)
async function convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const images: Buffer[] = [];

    // Render each page as PNG
    for (let i = 1; i <= pdf.numPages; i++) {
      const imageData = await renderPageAsImage(pdf, i, { scale: 2.0 });
      images.push(Buffer.from(imageData));
    }

    return images;
  } catch (error) {
    console.error("PDF conversion error:", error);
    throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    // Convert files to base64 images (converting PDFs to images)
    const base64Images: string[] = [];
    let totalPages = 0;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();

      if (file.type === "application/pdf") {
        // Convert PDF pages to PNG images
        const pdfBuffer = Buffer.from(arrayBuffer);
        const pages = await convertPdfToImages(pdfBuffer);

        for (const page of pages) {
          const base64 = page.toString("base64");
          base64Images.push(base64);
          totalPages += 1;
        }
      } else {
        // Image files - use directly
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        base64Images.push(base64);
        totalPages += 1;
      }
    }

    // Parse documents using AI - always use PNG for converted PDFs
    const mimeType = "image/png";
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

    // Return more specific error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}
