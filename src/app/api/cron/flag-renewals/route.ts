import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { lt, eq, and, isNull } from "drizzle-orm";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find active subscriptions where nextRenewalDate has passed and needsUpdate is false
    // Then flag them as needing update
    const flaggedSubscriptions = await db
      .update(subscriptions)
      .set({
        needsUpdate: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(subscriptions.status, "active"),
          eq(subscriptions.needsUpdate, false),
          lt(subscriptions.nextRenewalDate, now),
          isNull(subscriptions.deletedAt)
        )
      )
      .returning({ id: subscriptions.id, name: subscriptions.name });

    const count = flaggedSubscriptions.length;

    if (count > 0) {
      console.log(
        `Flag renewals cron: Flagged ${count} subscriptions as needing update:`,
        flaggedSubscriptions.map((s) => s.name).join(", ")
      );
    }

    return NextResponse.json({
      success: true,
      message: `Flagged ${count} subscriptions as needing update`,
      flaggedCount: count,
      subscriptions: flaggedSubscriptions,
    });
  } catch (error) {
    console.error("Flag renewals cron error:", error);
    return NextResponse.json(
      { error: "Flag renewals failed" },
      { status: 500 }
    );
  }
}
