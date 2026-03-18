import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  recurringMasters,
  recurringMasterSeriesLinks,
  recurringSeries,
  merchantEntities,
  recurringEvents,
} from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { updateMasterSchema } from "@/lib/validations/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recurring/masters/[id]
 * Returns a recurring master with linked series and event history.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch master scoped to user
    const [master] = await db
      .select()
      .from(recurringMasters)
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));

    if (!master) {
      return NextResponse.json({ error: "Recurring master not found" }, { status: 404 });
    }

    // Fetch merchant name if available
    let merchantName: string | null = null;
    if (master.merchantEntityId) {
      const [merchant] = await db
        .select({ name: merchantEntities.name })
        .from(merchantEntities)
        .where(eq(merchantEntities.id, master.merchantEntityId));
      merchantName = merchant?.name ?? null;
    }

    // Fetch linked series
    const series = await db
      .select({
        id: recurringSeries.id,
        merchantEntityId: recurringSeries.merchantEntityId,
        detectedFrequency: recurringSeries.detectedFrequency,
        avgAmount: recurringSeries.avgAmount,
        currency: recurringSeries.currency,
        confidence: recurringSeries.confidence,
        transactionCount: recurringSeries.transactionCount,
        firstSeenAt: recurringSeries.firstSeenAt,
        lastSeenAt: recurringSeries.lastSeenAt,
        isActive: recurringSeries.isActive,
        isPrimary: recurringMasterSeriesLinks.isPrimary,
        linkedAt: recurringMasterSeriesLinks.linkedAt,
      })
      .from(recurringMasterSeriesLinks)
      .innerJoin(recurringSeries, eq(recurringMasterSeriesLinks.seriesId, recurringSeries.id))
      .where(eq(recurringMasterSeriesLinks.recurringMasterId, id));

    // Fetch event history (most recent 50)
    const events = await db
      .select()
      .from(recurringEvents)
      .where(eq(recurringEvents.recurringMasterId, id))
      .orderBy(desc(recurringEvents.createdAt))
      .limit(50);

    return NextResponse.json({
      data: {
        ...master,
        merchantName,
        nextExpectedDate: master.nextExpectedDate?.toISOString() ?? null,
        lastChargeDate: master.lastChargeDate?.toISOString() ?? null,
        createdAt: master.createdAt.toISOString(),
        updatedAt: master.updatedAt.toISOString(),
        series: series.map((s) => ({
          ...s,
          firstSeenAt: s.firstSeenAt?.toISOString() ?? null,
          lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
          linkedAt: s.linkedAt.toISOString(),
        })),
        events: events.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get recurring master error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

/**
 * PATCH /api/recurring/masters/[id]
 * Updates a recurring master's metadata.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to update recurring masters." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateMasterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify master exists and belongs to user
    const [existing] = await db
      .select()
      .from(recurringMasters)
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));

    if (!existing) {
      return NextResponse.json({ error: "Recurring master not found" }, { status: 404 });
    }

    const data = result.data;

    // Build update object with only provided fields
    const updateValues: Partial<typeof recurringMasters.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.recurringKind !== undefined) updateValues.recurringKind = data.recurringKind;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.currency !== undefined) updateValues.currency = data.currency;
    if (data.expectedAmount !== undefined) updateValues.expectedAmount = data.expectedAmount != null ? String(data.expectedAmount) : null;
    if (data.billingFrequency !== undefined) updateValues.billingFrequency = data.billingFrequency;
    if (data.billingDayOfMonth !== undefined) updateValues.billingDayOfMonth = data.billingDayOfMonth;
    if (data.importanceRating !== undefined) updateValues.importanceRating = data.importanceRating;
    if (data.url !== undefined) updateValues.url = data.url;
    if (data.notes !== undefined) updateValues.notes = data.notes;

    const [updated] = await db
      .update(recurringMasters)
      .set(updateValues)
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)))
      .returning();

    // Determine changed fields for event metadata
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (data[key] !== undefined && existing[key as keyof typeof existing] !== data[key as keyof typeof data]) {
        changedFields[key] = {
          from: existing[key as keyof typeof existing],
          to: data[key as keyof typeof data],
        };
      }
    }

    await db.insert(recurringEvents).values({
      userId: session.user.id,
      recurringMasterId: id,
      eventType: "updated",
      metadata: { changedFields },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update recurring master error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
