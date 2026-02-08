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
      },
    });

    return NextResponse.json({
      isDuplicate: !!existing,
      existing: existing
        ? {
            id: existing.id,
            sourceType: existing.sourceType,
            filename: existing.originalFilename,
            uploadedAt: existing.createdAt,
            status: existing.processingStatus,
            transactionCount: existing.transactionCount,
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
