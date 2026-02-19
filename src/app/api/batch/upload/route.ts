import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { isUserActive } from "@/lib/auth/helpers";
import { eq, and } from "drizzle-orm";
import { uploadStatementPdf } from "@/lib/storage/pdf-storage";

// Maximum file size: 50MB (larger than import for batch uploads)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can upload
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to import statements." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const hash = formData.get("hash") as string | null;
    const sourceType = formData.get("sourceType") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported for batch upload" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    if (!hash || typeof hash !== "string" || hash.length !== 64) {
      return NextResponse.json(
        { error: "Invalid or missing hash" },
        { status: 400 }
      );
    }

    if (!sourceType || sourceType.trim().length === 0) {
      return NextResponse.json(
        { error: "Statement source is required" },
        { status: 400 }
      );
    }

    // Check for duplicate (client should have checked, but double-verify)
    const existingStatement = await db.query.statements.findFirst({
      where: and(
        eq(statements.userId, session.user.id),
        eq(statements.pdfHash, hash)
      ),
      columns: { id: true },
    });

    if (existingStatement) {
      return NextResponse.json({
        isDuplicate: true,
        statementId: existingStatement.id,
        message: "Statement already exists",
      });
    }

    // Create statement record (pending processing)
    const [newStatement] = await db
      .insert(statements)
      .values({
        userId: session.user.id,
        sourceType: sourceType.trim(),
        pdfHash: hash,
        originalFilename: file.name,
        fileSizeBytes: file.size,
        processingStatus: "pending",
      })
      .returning({ id: statements.id });

    // Upload PDF to Supabase Storage (non-fatal — import continues even if storage fails)
    let pdfStoragePath: string | null = null;
    try {
      const storageResult = await uploadStatementPdf(file, session.user.id, sourceType.trim());
      if (storageResult) {
        pdfStoragePath = storageResult.path;
        await db
          .update(statements)
          .set({ pdfStoragePath })
          .where(eq(statements.id, newStatement.id));
      }
    } catch (storageErr) {
      console.error("Storage upload failed (non-fatal):", storageErr);
    }

    return NextResponse.json({
      statementId: newStatement.id,
      status: "pending",
      message: "Statement created, ready for processing",
      pdfStored: pdfStoragePath !== null,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Handle unique constraint violation (race condition on duplicate)
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "This file was already uploaded" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
