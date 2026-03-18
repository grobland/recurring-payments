import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  recurringSeries,
  reviewQueueItems,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/recurring/series/[id]/ignore
 * Marks a recurring series as inactive and resolves any linked review queue items.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to manage recurring series." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify series exists and belongs to user
    const [series] = await db
      .select({ id: recurringSeries.id })
      .from(recurringSeries)
      .where(
        and(
          eq(recurringSeries.id, id),
          eq(recurringSeries.userId, session.user.id)
        )
      );

    if (!series) {
      return NextResponse.json(
        { error: "Recurring series not found" },
        { status: 404 }
      );
    }

    // Deactivate the series
    await db
      .update(recurringSeries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(recurringSeries.id, id),
          eq(recurringSeries.userId, session.user.id)
        )
      );

    // Resolve any unresolved review queue items linked to this series
    await db
      .update(reviewQueueItems)
      .set({ resolvedAt: new Date(), resolution: "ignored" })
      .where(
        and(
          eq(reviewQueueItems.seriesId, id),
          isNull(reviewQueueItems.resolvedAt)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ignore recurring series error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
