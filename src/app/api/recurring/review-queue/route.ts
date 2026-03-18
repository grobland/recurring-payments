import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  reviewQueueItems,
  recurringSeries,
  recurringMasters,
  merchantEntities,
} from "@/lib/db/schema";
import { and, eq, isNull, desc, asc, or, lt, gt } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/recurring/review-queue
 * Returns a paginated list of unresolved review queue items for the authenticated user.
 *
 * Query params:
 *   - itemType: filter by item type ("new_series" | "amount_change" | "descriptor_change" | "unmatched")
 *   - cursorConfidence: decimal 0-1 for keyset pagination
 *   - cursorId: UUID for keyset pagination
 *   - pageSize: number 1-50 (default: 20)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get("itemType");
    const cursorConfidence = searchParams.get("cursorConfidence");
    const cursorId = searchParams.get("cursorId");
    const pageSizeParam = searchParams.get("pageSize");

    const pageSize = Math.min(
      Math.max(1, parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );

    // Build conditions — only unresolved items
    const conditions: ReturnType<typeof eq>[] = [
      eq(reviewQueueItems.userId, session.user.id),
      isNull(reviewQueueItems.resolvedAt),
    ];

    if (itemType) {
      conditions.push(eq(reviewQueueItems.itemType, itemType));
    }

    // Keyset cursor pagination using (confidence DESC, id ASC)
    // Highest confidence first (most actionable)
    if (cursorConfidence && cursorId) {
      const confValue = parseFloat(cursorConfidence);
      if (!isNaN(confValue)) {
        conditions.push(
          or(
            lt(reviewQueueItems.confidence, String(confValue)),
            and(
              eq(reviewQueueItems.confidence, String(confValue)),
              gt(reviewQueueItems.id, cursorId)
            )
          )!
        );
      }
    }

    const results = await db
      .select({
        id: reviewQueueItems.id,
        userId: reviewQueueItems.userId,
        itemType: reviewQueueItems.itemType,
        seriesId: reviewQueueItems.seriesId,
        recurringMasterId: reviewQueueItems.recurringMasterId,
        transactionId: reviewQueueItems.transactionId,
        confidence: reviewQueueItems.confidence,
        suggestedAction: reviewQueueItems.suggestedAction,
        createdAt: reviewQueueItems.createdAt,
        // Series context
        seriesDetectedFrequency: recurringSeries.detectedFrequency,
        seriesAvgAmount: recurringSeries.avgAmount,
        seriesCurrency: recurringSeries.currency,
        // Merchant context
        merchantName: merchantEntities.name,
        // Suggested master context
        suggestedMasterName: recurringMasters.name,
      })
      .from(reviewQueueItems)
      .leftJoin(recurringSeries, eq(reviewQueueItems.seriesId, recurringSeries.id))
      .leftJoin(
        merchantEntities,
        eq(recurringSeries.merchantEntityId, merchantEntities.id)
      )
      .leftJoin(recurringMasters, eq(reviewQueueItems.recurringMasterId, recurringMasters.id))
      .where(and(...conditions))
      .orderBy(desc(reviewQueueItems.confidence), asc(reviewQueueItems.id))
      .limit(pageSize + 1);

    const hasMore = results.length > pageSize;
    const page = hasMore ? results.slice(0, pageSize) : results;

    let nextCursor: { confidence: string; id: string } | null = null;
    if (hasMore && page.length > 0) {
      const lastItem = page[page.length - 1];
      nextCursor = {
        confidence: lastItem.confidence ?? "0",
        id: lastItem.id,
      };
    }

    return NextResponse.json({
      data: page.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Get review queue error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
