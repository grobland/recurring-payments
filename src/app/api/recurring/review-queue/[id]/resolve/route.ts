import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  reviewQueueItems,
  recurringMasters,
  recurringMasterSeriesLinks,
  recurringSeries,
  recurringSeriesTransactions,
  userTransactionLabels,
  recurringEvents,
  merchantEntities,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { resolveReviewSchema } from "@/lib/validations/recurring";
import { inferRecurringKind } from "@/lib/services/recurrence-linker";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/recurring/review-queue/[id]/resolve
 * Resolves a review queue item with one of four resolution types.
 * All writes occur in a single db.transaction() per DB pool constraint.
 *
 * Resolutions:
 *   - "confirmed": create new recurring master + link series
 *   - "linked": link series to an existing master (targetMasterId required)
 *   - "ignored": mark series as inactive
 *   - "not_recurring": label all series transactions as not_recurring + deactivate series
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to resolve review queue items." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = resolveReviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { resolution, targetMasterId, notes } = result.data;

    // Verify review item exists, belongs to user, and is unresolved
    const [reviewItem] = await db
      .select()
      .from(reviewQueueItems)
      .where(
        and(
          eq(reviewQueueItems.id, id),
          eq(reviewQueueItems.userId, session.user.id),
          isNull(reviewQueueItems.resolvedAt)
        )
      );

    if (!reviewItem) {
      return NextResponse.json(
        { error: "Review queue item not found or already resolved" },
        { status: 404 }
      );
    }

    // If "linked" resolution, validate targetMasterId upfront
    if (resolution === "linked") {
      if (!targetMasterId) {
        return NextResponse.json(
          { error: "targetMasterId is required for linked resolution" },
          { status: 400 }
        );
      }

      const [targetMaster] = await db
        .select({ id: recurringMasters.id })
        .from(recurringMasters)
        .where(
          and(
            eq(recurringMasters.id, targetMasterId),
            eq(recurringMasters.userId, session.user.id)
          )
        );

      if (!targetMaster) {
        return NextResponse.json(
          { error: "Target recurring master not found" },
          { status: 404 }
        );
      }
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      if (resolution === "confirmed") {
        // Fetch series to derive master fields
        const [series] = await tx
          .select({
            id: recurringSeries.id,
            merchantEntityId: recurringSeries.merchantEntityId,
            detectedFrequency: recurringSeries.detectedFrequency,
            amountType: recurringSeries.amountType,
            avgAmount: recurringSeries.avgAmount,
            currency: recurringSeries.currency,
            confidence: recurringSeries.confidence,
            dayOfMonth: recurringSeries.dayOfMonth,
          })
          .from(recurringSeries)
          .where(
            and(
              eq(recurringSeries.id, reviewItem.seriesId!),
              eq(recurringSeries.userId, session.user.id)
            )
          );

        // Determine master name from merchant entity or fallback
        let masterName = "Unknown Recurring";
        if (series?.merchantEntityId) {
          const [merchant] = await tx
            .select({ name: merchantEntities.name })
            .from(merchantEntities)
            .where(eq(merchantEntities.id, series.merchantEntityId));
          if (merchant?.name) masterName = merchant.name;
        }

        const recurringKind = series?.detectedFrequency
          ? inferRecurringKind(
              series.detectedFrequency,
              series.amountType === "variable" ? "variable" : "fixed",
              null
            )
          : "other_recurring";

        const currency = series?.currency ?? "GBP";

        // Create new recurring master
        const [newMaster] = await tx
          .insert(recurringMasters)
          .values({
            userId: session.user.id,
            merchantEntityId: series?.merchantEntityId ?? null,
            name: masterName,
            recurringKind,
            status: "active",
            currency,
            expectedAmount: series?.avgAmount ?? null,
            billingFrequency: series?.detectedFrequency ?? null,
            billingDayOfMonth: series?.dayOfMonth ?? null,
            confidence: series?.confidence ?? null,
            updatedAt: now,
          })
          .returning({ id: recurringMasters.id });

        // Link series to new master
        if (reviewItem.seriesId) {
          await tx.insert(recurringMasterSeriesLinks).values({
            recurringMasterId: newMaster.id,
            seriesId: reviewItem.seriesId,
            isPrimary: true,
          });
        }

        // Log event on new master
        await tx.insert(recurringEvents).values({
          userId: session.user.id,
          recurringMasterId: newMaster.id,
          eventType: "created",
          metadata: {
            source: "review_queue",
            reviewQueueItemId: id,
            seriesId: reviewItem.seriesId,
          },
        });
      } else if (resolution === "linked") {
        // Link series to existing target master
        if (reviewItem.seriesId) {
          await tx
            .insert(recurringMasterSeriesLinks)
            .values({
              recurringMasterId: targetMasterId!,
              seriesId: reviewItem.seriesId,
              isPrimary: false,
            })
            .onConflictDoNothing();
        }

        // Log event on target master
        await tx.insert(recurringEvents).values({
          userId: session.user.id,
          recurringMasterId: targetMasterId!,
          eventType: "linked",
          metadata: {
            seriesId: reviewItem.seriesId,
            source: "review_queue",
            reviewQueueItemId: id,
          },
        });
      } else if (resolution === "ignored") {
        // Deactivate the series
        if (reviewItem.seriesId) {
          await tx
            .update(recurringSeries)
            .set({ isActive: false, updatedAt: now })
            .where(
              and(
                eq(recurringSeries.id, reviewItem.seriesId),
                eq(recurringSeries.userId, session.user.id)
              )
            );
        }
      } else if (resolution === "not_recurring") {
        // Label all transactions in the series as not_recurring
        if (reviewItem.seriesId) {
          const seriesTransactions = await tx
            .select({ transactionId: recurringSeriesTransactions.transactionId })
            .from(recurringSeriesTransactions)
            .where(eq(recurringSeriesTransactions.seriesId, reviewItem.seriesId));

          for (const { transactionId } of seriesTransactions) {
            await tx
              .insert(userTransactionLabels)
              .values({
                userId: session.user.id,
                transactionId,
                label: "not_recurring",
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: [userTransactionLabels.userId, userTransactionLabels.transactionId],
                set: { label: "not_recurring", updatedAt: now },
              });
          }

          // Deactivate the series
          await tx
            .update(recurringSeries)
            .set({ isActive: false, updatedAt: now })
            .where(
              and(
                eq(recurringSeries.id, reviewItem.seriesId),
                eq(recurringSeries.userId, session.user.id)
              )
            );
        }
      }

      // Log review_resolved event (always)
      const masterId = resolution === "linked" ? targetMasterId : reviewItem.recurringMasterId;
      if (masterId) {
        await tx.insert(recurringEvents).values({
          userId: session.user.id,
          recurringMasterId: masterId,
          eventType: "review_resolved",
          metadata: { resolution, reviewQueueItemId: id },
        });
      }

      // Mark review item as resolved
      await tx
        .update(reviewQueueItems)
        .set({
          resolvedAt: now,
          resolution,
          resolutionNotes: notes ?? null,
        })
        .where(eq(reviewQueueItems.id, id));
    });

    return NextResponse.json({ success: true, resolution });
  } catch (error) {
    console.error("Resolve review queue item error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
