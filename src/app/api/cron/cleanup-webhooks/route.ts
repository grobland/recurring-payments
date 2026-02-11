import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Delete events where expiresAt < now
    const result = await db
      .delete(webhookEvents)
      .where(lt(webhookEvents.expiresAt, now))
      .returning({ deletedId: webhookEvents.id });

    const deletedCount = result.length;
    console.log(`Webhook cleanup: Deleted ${deletedCount} expired events`);

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Webhook cleanup failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
