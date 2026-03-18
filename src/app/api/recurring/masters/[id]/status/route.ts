import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringMasters, recurringEvents } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { statusChangeSchema } from "@/lib/validations/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Map from status value to recurring event type
const STATUS_EVENT_MAP: Record<string, string> = {
  active: "reactivated",
  paused: "paused",
  cancelled: "cancelled",
  dormant: "dormant",
  needs_review: "needs_review",
};

/**
 * POST /api/recurring/masters/[id]/status
 * Changes the status of a recurring master and logs an audit event.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to change recurring master status." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = statusChangeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status } = result.data;

    // Verify master exists and belongs to user
    const [existing] = await db
      .select({ id: recurringMasters.id, status: recurringMasters.status })
      .from(recurringMasters)
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));

    if (!existing) {
      return NextResponse.json({ error: "Recurring master not found" }, { status: 404 });
    }

    const previousStatus = existing.status;
    const eventType = STATUS_EVENT_MAP[status] ?? "updated";

    // Update status
    await db
      .update(recurringMasters)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));

    // Log audit event
    await db.insert(recurringEvents).values({
      userId: session.user.id,
      recurringMasterId: id,
      eventType,
      metadata: { previousStatus, newStatus: status },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Change recurring master status error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
