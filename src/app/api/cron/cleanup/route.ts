import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { lt, isNotNull, and } from "drizzle-orm";

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
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find and permanently delete subscriptions that have been soft-deleted for more than 30 days
    const deletedSubscriptions = await db
      .delete(subscriptions)
      .where(
        and(
          isNotNull(subscriptions.deletedAt),
          lt(subscriptions.deletedAt, thirtyDaysAgo)
        )
      )
      .returning({ id: subscriptions.id });

    const count = deletedSubscriptions.length;

    console.log(`Cleanup cron: Permanently deleted ${count} subscriptions`);

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${count} subscriptions`,
      deletedCount: count,
    });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
