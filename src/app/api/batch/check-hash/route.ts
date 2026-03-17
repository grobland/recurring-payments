import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hash } = await request.json();

    if (!hash || typeof hash !== "string" || hash.length !== 64) {
      return NextResponse.json(
        { error: "Invalid hash format. Expected 64-character hex string." },
        { status: 400 }
      );
    }

    // Check if hash exists for this user
    const existing = await db.query.statements.findFirst({
      where: and(
        eq(statements.userId, session.user.id),
        eq(statements.pdfHash, hash)
      ),
      columns: {
        id: true,
        sourceType: true,
        originalFilename: true,
        createdAt: true,
        processingStatus: true,
        transactionCount: true,
        pdfStoragePath: true,
      },
    });

    // A statement is only a "true" duplicate if it already has its PDF stored.
    // If the statement exists but the PDF is missing (e.g. overwritten by a
    // previous storage bug), allow re-upload so the PDF can be re-attached.
    const hasPdf = !!existing?.pdfStoragePath;

    return NextResponse.json({
      isDuplicate: !!existing && hasPdf,
      // When the statement exists but has no PDF, tell the client so it can
      // re-upload and re-attach the PDF to the existing record.
      needsPdfReattach: !!existing && !hasPdf,
      existingStatementId: existing?.id ?? null,
      existing: existing
        ? {
            id: existing.id,
            sourceType: existing.sourceType,
            filename: existing.originalFilename,
            uploadedAt: existing.createdAt,
            status: existing.processingStatus,
            transactionCount: existing.transactionCount,
            hasPdf,
          }
        : null,
    });
  } catch (error) {
    console.error("Check hash error:", error);
    return NextResponse.json(
      { error: "Failed to check hash" },
      { status: 500 }
    );
  }
}
