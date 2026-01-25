import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { addDays } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateReminderSchema = z.object({
  action: z.enum(["enable", "disable", "skip", "snooze", "unskip"]),
  snoozeDays: z.number().min(1).max(30).optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const result = updateReminderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify subscription belongs to user
    const existing = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const { action, snoozeDays } = result.data;
    let updateData: Partial<typeof subscriptions.$inferInsert> = {
      updatedAt: new Date(),
    };

    switch (action) {
      case "enable":
        updateData.reminderEnabled = true;
        updateData.skipNextReminder = false;
        updateData.reminderSnoozedUntil = null;
        break;
      case "disable":
        updateData.reminderEnabled = false;
        break;
      case "skip":
        updateData.skipNextReminder = true;
        break;
      case "unskip":
        updateData.skipNextReminder = false;
        break;
      case "snooze":
        if (!snoozeDays) {
          return NextResponse.json(
            { error: "snoozeDays is required for snooze action" },
            { status: 400 }
          );
        }
        updateData.reminderSnoozedUntil = addDays(new Date(), snoozeDays);
        break;
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning();

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error("Update reminder settings error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
