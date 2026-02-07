import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Acknowledge an alert (mark as reviewed)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and existence
    const existingAlert = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.id, id),
        eq(alerts.userId, session.user.id)
      ),
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Mark as acknowledged
    const [updatedAlert] = await db
      .update(alerts)
      .set({ acknowledgedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();

    return NextResponse.json({ alert: updatedAlert });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}

// DELETE - Dismiss an alert (soft delete)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and existence
    const existingAlert = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.id, id),
        eq(alerts.userId, session.user.id)
      ),
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Soft delete by setting dismissedAt
    const [dismissedAlert] = await db
      .update(alerts)
      .set({ dismissedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();

    return NextResponse.json({ alert: dismissedAlert });
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return NextResponse.json(
      { error: "Failed to dismiss alert" },
      { status: 500 }
    );
  }
}
