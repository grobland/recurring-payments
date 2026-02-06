import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringPatterns } from "@/lib/db/schema";
import { dismissPatternSchema } from "@/lib/validations/patterns";

/**
 * POST /api/patterns/dismiss
 * Dismiss a pattern suggestion (soft delete with dismissedAt timestamp).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsed = dismissPatternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { patternId } = parsed.data;

    // Get pattern and verify ownership
    const [pattern] = await db
      .select()
      .from(recurringPatterns)
      .where(
        and(
          eq(recurringPatterns.id, patternId),
          eq(recurringPatterns.userId, userId),
          isNull(recurringPatterns.dismissedAt),
          isNull(recurringPatterns.acceptedAt)
        )
      )
      .limit(1);

    if (!pattern) {
      return NextResponse.json(
        { error: "Pattern not found or already processed" },
        { status: 404 }
      );
    }

    // Soft delete by setting dismissedAt
    await db
      .update(recurringPatterns)
      .set({
        dismissedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(recurringPatterns.id, patternId));

    return NextResponse.json({
      success: true,
      patternId,
    });
  } catch (error) {
    console.error("Dismiss pattern error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss pattern" },
      { status: 500 }
    );
  }
}
