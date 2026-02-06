import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

// Validation schemas
const mergeRequestSchema = z.object({
  targetId: z.string().uuid("Invalid target subscription ID"),
  sourceId: z.string().uuid("Invalid source subscription ID"),
  selectedFields: z.object({
    name: z.enum(["target", "source"]),
    amount: z.enum(["target", "source"]),
    frequency: z.enum(["target", "source"]),
    category: z.enum(["target", "source"]),
    nextRenewalDate: z.enum(["target", "source"]),
  }),
});

const undoRequestSchema = z.object({
  sourceId: z.string().uuid("Invalid source subscription ID"),
});

// 24 hours in milliseconds
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/subscriptions/merge
 * Merge two subscriptions - target keeps selected fields, source is soft deleted
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can edit
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to merge subscriptions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = mergeRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { targetId, sourceId, selectedFields } = result.data;

    // Verify both subscriptions exist and belong to user
    const [target, source] = await Promise.all([
      db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.id, targetId),
          eq(subscriptions.userId, session.user.id)
        ),
        with: {
          category: true,
        },
      }),
      db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.id, sourceId),
          eq(subscriptions.userId, session.user.id)
        ),
        with: {
          category: true,
        },
      }),
    ]);

    if (!target || !source) {
      return NextResponse.json(
        { error: "One or both subscriptions not found" },
        { status: 404 }
      );
    }

    if (target.mergedAt || source.mergedAt) {
      return NextResponse.json(
        { error: "Cannot merge already-merged subscriptions" },
        { status: 400 }
      );
    }

    // Build update object for target based on selected fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (selectedFields.name === "source") {
      updateData.name = source.name;
    }
    if (selectedFields.amount === "source") {
      updateData.amount = source.amount;
      updateData.currency = source.currency;
    }
    if (selectedFields.frequency === "source") {
      updateData.frequency = source.frequency;
      // Recalculate normalized monthly amount
      const amount = parseFloat(
        selectedFields.amount === "source" ? source.amount : target.amount
      );
      updateData.normalizedMonthlyAmount =
        source.frequency === "yearly"
          ? (amount / 12).toFixed(2)
          : amount.toFixed(2);
    }
    if (selectedFields.category === "source") {
      updateData.categoryId = source.categoryId;
    }
    if (selectedFields.nextRenewalDate === "source") {
      updateData.nextRenewalDate = source.nextRenewalDate;
    }

    // Update target with selected values and soft delete source
    await Promise.all([
      // Update target subscription
      db
        .update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.id, targetId)),
      // Soft delete source (mark as merged)
      db
        .update(subscriptions)
        .set({
          mergedAt: new Date(),
          mergedIntoId: targetId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sourceId)),
    ]);

    // Fetch updated target for response
    const updatedTarget = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, targetId),
      with: {
        category: {
          columns: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ subscription: updatedTarget });
  } catch (error) {
    console.error("Merge subscription error:", error);
    return NextResponse.json(
      { error: "An error occurred while merging subscriptions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscriptions/merge
 * Undo a merge by restoring the source subscription
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = undoRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sourceId } = result.data;

    // Find the merged source subscription
    const source = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, sourceId),
        eq(subscriptions.userId, session.user.id),
        isNotNull(subscriptions.mergedAt)
      ),
      with: {
        category: {
          columns: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Merged subscription not found" },
        { status: 404 }
      );
    }

    // Check 24hr window
    const mergedAt = new Date(source.mergedAt!);
    const now = new Date();
    const timeSinceMerge = now.getTime() - mergedAt.getTime();

    if (timeSinceMerge > UNDO_WINDOW_MS) {
      return NextResponse.json(
        { error: "Undo window expired. Merges can only be undone within 24 hours." },
        { status: 400 }
      );
    }

    // Restore the source subscription
    await db
      .update(subscriptions)
      .set({
        mergedAt: null,
        mergedIntoId: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sourceId));

    // Fetch restored subscription
    const restored = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, sourceId),
      with: {
        category: {
          columns: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ subscription: restored });
  } catch (error) {
    console.error("Undo merge error:", error);
    return NextResponse.json(
      { error: "An error occurred while undoing merge" },
      { status: 500 }
    );
  }
}
