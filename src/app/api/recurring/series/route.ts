import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringSeries, merchantEntities } from "@/lib/db/schema";
import { and, eq, desc, lt, or, gte } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/recurring/series
 * Returns a paginated list of recurring series for the authenticated user.
 *
 * Query params:
 *   - status: "active" | "inactive" | "all" (default: "active")
 *   - minConfidence: decimal 0-1 to filter by confidence (optional)
 *   - cursorDate: ISO date string for keyset pagination (updatedAt)
 *   - cursorId: UUID for keyset pagination (id)
 *   - pageSize: number 1-50 (default: 20)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to view recurring series." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "active";
    const minConfidenceParam = searchParams.get("minConfidence");
    const cursorDate = searchParams.get("cursorDate");
    const cursorId = searchParams.get("cursorId");
    const pageSizeParam = searchParams.get("pageSize");

    // Validate and clamp pageSize
    const pageSize = Math.min(
      Math.max(1, parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(recurringSeries.userId, session.user.id),
    ];

    // Filter by active status
    if (status === "active") {
      conditions.push(eq(recurringSeries.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(recurringSeries.isActive, false));
    }
    // "all" → no filter on isActive

    // Filter by minimum confidence
    if (minConfidenceParam) {
      const minConfidence = parseFloat(minConfidenceParam);
      if (!isNaN(minConfidence) && minConfidence >= 0 && minConfidence <= 1) {
        conditions.push(gte(recurringSeries.confidence, String(minConfidence)));
      }
    }

    // Keyset cursor pagination using (updatedAt DESC, id DESC)
    if (cursorDate && cursorId) {
      try {
        const cursorDateObj = new Date(cursorDate);
        if (!isNaN(cursorDateObj.getTime())) {
          conditions.push(
            or(
              lt(recurringSeries.updatedAt, cursorDateObj),
              and(
                eq(recurringSeries.updatedAt, cursorDateObj),
                lt(recurringSeries.id, cursorId)
              )
            )!
          );
        }
      } catch {
        // Invalid cursor date, skip cursor
      }
    }

    const results = await db
      .select({
        id: recurringSeries.id,
        userId: recurringSeries.userId,
        merchantEntityId: recurringSeries.merchantEntityId,
        merchantName: merchantEntities.name,
        detectedFrequency: recurringSeries.detectedFrequency,
        intervalDays: recurringSeries.intervalDays,
        dayOfMonth: recurringSeries.dayOfMonth,
        amountType: recurringSeries.amountType,
        avgAmount: recurringSeries.avgAmount,
        minAmount: recurringSeries.minAmount,
        maxAmount: recurringSeries.maxAmount,
        currency: recurringSeries.currency,
        confidence: recurringSeries.confidence,
        transactionCount: recurringSeries.transactionCount,
        firstSeenAt: recurringSeries.firstSeenAt,
        lastSeenAt: recurringSeries.lastSeenAt,
        nextExpectedAt: recurringSeries.nextExpectedAt,
        isActive: recurringSeries.isActive,
        createdAt: recurringSeries.createdAt,
        updatedAt: recurringSeries.updatedAt,
      })
      .from(recurringSeries)
      .leftJoin(
        merchantEntities,
        eq(recurringSeries.merchantEntityId, merchantEntities.id)
      )
      .where(and(...conditions))
      .orderBy(desc(recurringSeries.updatedAt), desc(recurringSeries.id))
      .limit(pageSize + 1);

    const hasMore = results.length > pageSize;
    const page = hasMore ? results.slice(0, pageSize) : results;

    // Build next cursor from last item
    let nextCursor: { date: string; id: string } | null = null;
    if (hasMore && page.length > 0) {
      const lastItem = page[page.length - 1];
      nextCursor = {
        date: lastItem.updatedAt.toISOString(),
        id: lastItem.id,
      };
    }

    return NextResponse.json({
      data: page.map((s) => ({
        ...s,
        firstSeenAt: s.firstSeenAt?.toISOString() ?? null,
        lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
        nextExpectedAt: s.nextExpectedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Get recurring series error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
