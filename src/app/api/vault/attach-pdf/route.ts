import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { isUserActive } from "@/lib/auth/helpers";
import { and, eq } from "drizzle-orm";
import { uploadStatementPdf } from "@/lib/storage/pdf-storage";

// Maximum file size: 50MB (same as batch upload)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/vault/attach-pdf
 * Attaches a PDF to an existing statement record without re-running
 * transaction extraction. Used when a yellow cell (data exists, no PDF)
 * is clicked in the coverage grid.
 *
 * FormData fields:
 *   - file: File (PDF, required, max 50MB)
 *   - statementId: string (required)
 *
 * Returns: { success: true, pdfStored: true }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can upload
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to attach PDFs." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const statementId = formData.get("statementId") as string | null;

    // Validate: file must be present
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate: must be a PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Validate: must be under 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate: statementId must be present
    if (!statementId || statementId.trim().length === 0) {
      return NextResponse.json(
        { error: "Statement ID is required" },
        { status: 400 }
      );
    }

    // Verify statement ownership — same pattern as /api/statements/[id]/pdf-url/route.ts
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, statementId.trim()),
        eq(statements.userId, session.user.id)
      ),
      columns: {
        id: true,
        sourceType: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Upload PDF to Supabase Storage
    const storageResult = await uploadStatementPdf(
      file,
      session.user.id,
      statement.sourceType
    );

    if (!storageResult) {
      return NextResponse.json(
        { error: "Storage upload failed" },
        { status: 500 }
      );
    }

    // Update the statement record with the storage path
    await db
      .update(statements)
      .set({ pdfStoragePath: storageResult.path })
      .where(eq(statements.id, statement.id));

    return NextResponse.json({ success: true, pdfStored: true });
  } catch (error) {
    console.error("Attach PDF error:", error);
    return NextResponse.json(
      { error: "Failed to attach PDF" },
      { status: 500 }
    );
  }
}
