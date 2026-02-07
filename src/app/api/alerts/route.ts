import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch non-dismissed alerts, newest first
    // Use `with` to avoid N+1 queries
    const userAlerts = await db.query.alerts.findMany({
      where: and(
        eq(alerts.userId, session.user.id),
        isNull(alerts.dismissedAt)
      ),
      orderBy: [desc(alerts.createdAt)],
      limit: 50, // Reasonable cap
      with: {
        subscription: {
          columns: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            nextRenewalDate: true,
          },
        },
      },
    });

    return NextResponse.json({ alerts: userAlerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
