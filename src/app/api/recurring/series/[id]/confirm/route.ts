import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  recurringSeries,
  recurringMasters,
  recurringMasterSeriesLinks,
  recurringEvents,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { confirmSeriesSchema } from "@/lib/validations/recurring";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/recurring/series/[id]/confirm
 * Confirms a recurring series by either creating a new master or linking to an existing one.
 * All writes occur in a single db.transaction().
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to confirm recurring series." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = confirmSeriesSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, recurringKind, existingMasterId } = result.data;

    // Verify series exists and belongs to user
    const [series] = await db
      .select({
        id: recurringSeries.id,
        isActive: recurringSeries.isActive,
        avgAmount: recurringSeries.avgAmount,
        detectedFrequency: recurringSeries.detectedFrequency,
        dayOfMonth: recurringSeries.dayOfMonth,
        currency: recurringSeries.currency,
        confidence: recurringSeries.confidence,
        merchantEntityId: recurringSeries.merchantEntityId,
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

    if (!series.isActive) {
      return NextResponse.json(
        { error: "Cannot confirm an inactive recurring series" },
        { status: 422 }
      );
    }

    let masterId: string;
    let action: "created" | "linked";

    if (existingMasterId) {
      // Verify the existing master belongs to the user
      const [existingMaster] = await db
        .select({ id: recurringMasters.id })
        .from(recurringMasters)
        .where(
          and(
            eq(recurringMasters.id, existingMasterId),
            eq(recurringMasters.userId, session.user.id)
          )
        );

      if (!existingMaster) {
        return NextResponse.json(
          { error: "Recurring master not found" },
          { status: 404 }
        );
      }

      // Link series to the existing master in a transaction
      await db.transaction(async (tx) => {
        await tx
          .insert(recurringMasterSeriesLinks)
          .values({
            recurringMasterId: existingMasterId,
            seriesId: id,
            isPrimary: false,
          })
          .onConflictDoNothing();

        await tx.insert(recurringEvents).values({
          userId: session.user.id,
          recurringMasterId: existingMasterId,
          eventType: "linked",
          metadata: { seriesId: id },
        });
      });

      masterId = existingMasterId;
      action = "linked";
    } else {
      // Create a new recurring master derived from series fields
      const currency = series.currency ?? "GBP";

      const newMasterId = await db.transaction(async (tx) => {
        const [newMaster] = await tx
          .insert(recurringMasters)
          .values({
            userId: session.user.id,
            merchantEntityId: series.merchantEntityId ?? null,
            name,
            recurringKind,
            status: "active",
            currency,
            expectedAmount: series.avgAmount ?? null,
            billingFrequency: series.detectedFrequency ?? null,
            billingDayOfMonth: series.dayOfMonth ?? null,
            confidence: series.confidence ?? null,
            updatedAt: new Date(),
          })
          .returning({ id: recurringMasters.id });

        await tx.insert(recurringMasterSeriesLinks).values({
          recurringMasterId: newMaster.id,
          seriesId: id,
          isPrimary: true,
        });

        await tx.insert(recurringEvents).values({
          userId: session.user.id,
          recurringMasterId: newMaster.id,
          eventType: "created",
          metadata: { seriesId: id, name, recurringKind },
        });

        return newMaster.id;
      });

      masterId = newMasterId;
      action = "created";
    }

    return NextResponse.json({ success: true, masterId, action });
  } catch (error) {
    console.error("Confirm recurring series error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
