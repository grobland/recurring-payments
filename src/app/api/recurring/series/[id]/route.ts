import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  recurringSeries,
  recurringSeriesTransactions,
  transactions,
  merchantEntities,
  recurringMasterSeriesLinks,
  recurringMasters,
} from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/recurring/series/[id]
 * Returns series detail with linked transactions and master info.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch series — user-scoped
    const [series] = await db
      .select({
        id: recurringSeries.id,
        userId: recurringSeries.userId,
        merchantEntityId: recurringSeries.merchantEntityId,
        detectedFrequency: recurringSeries.detectedFrequency,
        intervalDays: recurringSeries.intervalDays,
        dayOfMonth: recurringSeries.dayOfMonth,
        amountType: recurringSeries.amountType,
        avgAmount: recurringSeries.avgAmount,
        minAmount: recurringSeries.minAmount,
        maxAmount: recurringSeries.maxAmount,
        amountStddev: recurringSeries.amountStddev,
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

    // Fetch merchant name if merchantEntityId is set
    let merchantName: string | null = null;
    if (series.merchantEntityId) {
      const [merchant] = await db
        .select({ name: merchantEntities.name })
        .from(merchantEntities)
        .where(eq(merchantEntities.id, series.merchantEntityId));
      merchantName = merchant?.name ?? null;
    }

    // Fetch linked transactions ordered by date desc
    const linkedTransactions = await db
      .select({
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        merchantName: transactions.merchantName,
        amount: transactions.amount,
        currency: transactions.currency,
        description: transactions.description,
        matchConfidence: recurringSeriesTransactions.matchConfidence,
      })
      .from(recurringSeriesTransactions)
      .innerJoin(
        transactions,
        eq(recurringSeriesTransactions.transactionId, transactions.id)
      )
      .where(eq(recurringSeriesTransactions.seriesId, id))
      .orderBy(desc(transactions.transactionDate));

    // Check if series is linked to a master
    const [masterLink] = await db
      .select({
        masterId: recurringMasterSeriesLinks.recurringMasterId,
        masterName: recurringMasters.name,
        isPrimary: recurringMasterSeriesLinks.isPrimary,
      })
      .from(recurringMasterSeriesLinks)
      .innerJoin(
        recurringMasters,
        eq(recurringMasterSeriesLinks.recurringMasterId, recurringMasters.id)
      )
      .where(eq(recurringMasterSeriesLinks.seriesId, id));

    const linkedMaster = masterLink
      ? { id: masterLink.masterId, name: masterLink.masterName, isPrimary: masterLink.isPrimary }
      : null;

    return NextResponse.json({
      data: {
        ...series,
        merchantName,
        linkedMaster,
        firstSeenAt: series.firstSeenAt?.toISOString() ?? null,
        lastSeenAt: series.lastSeenAt?.toISOString() ?? null,
        nextExpectedAt: series.nextExpectedAt?.toISOString() ?? null,
        createdAt: series.createdAt.toISOString(),
        updatedAt: series.updatedAt.toISOString(),
        transactions: linkedTransactions.map((t) => ({
          ...t,
          transactionDate: t.transactionDate.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get recurring series detail error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
