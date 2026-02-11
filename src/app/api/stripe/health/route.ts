import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { sql, gt, and, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = await db.execute(sql`SELECT 1 as health`);
    if (!dbCheck.rows?.[0]) {
      throw new Error("Database health check failed");
    }

    // Query recent webhook events (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEvents)
      .where(gt(webhookEvents.processedAt, fiveMinutesAgo));

    const recentCount = Number(recentEvents[0]?.count ?? 0);

    // Query recent failures (last 5 minutes)
    const recentFailures = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEvents)
      .where(
        and(
          gt(webhookEvents.processedAt, fiveMinutesAgo),
          eq(webhookEvents.status, "failed")
        )
      );

    const failureCount = Number(recentFailures[0]?.count ?? 0);

    // Calculate failure rate
    const failureRate = recentCount > 0 ? failureCount / recentCount : 0;
    const isHealthy = failureRate < 0.1; // Less than 10% failure rate

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
          recentEvents: recentCount,
          recentFailures: failureCount,
          failureRate: (failureRate * 100).toFixed(2) + "%",
        },
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
