import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log(
    `[refresh-analytics] Starting materialized view refresh at ${new Date().toISOString()}`
  );

  try {
    // Refresh materialized view concurrently (non-blocking)
    await db.execute(
      sql`REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_mv`
    );

    const refreshDuration = Date.now() - startTime;
    console.log(
      `[refresh-analytics] View refreshed in ${refreshDuration}ms`
    );

    // Optional: VACUUM ANALYZE to reclaim space and update statistics
    // Wrap in try-catch to not fail if vacuum fails (it may on some hosted DBs)
    try {
      await db.execute(sql`VACUUM ANALYZE user_analytics_mv`);
      console.log("[refresh-analytics] VACUUM ANALYZE completed");
    } catch (vacuumError) {
      console.warn(
        "[refresh-analytics] VACUUM ANALYZE skipped:",
        vacuumError instanceof Error ? vacuumError.message : "Unknown error"
      );
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: totalDuration,
      refreshDuration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[refresh-analytics] Failed to refresh:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh analytics materialized view",
        details: error instanceof Error ? error.message : "Unknown error",
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also handle POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
