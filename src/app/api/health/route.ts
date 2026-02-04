import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks = {
    status: "healthy" as "healthy" | "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "unknown" as "ok" | "error", latency: 0 },
      api: { status: "ok" as const },
    },
  };

  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.checks.database = {
      status: "ok",
      latency: Date.now() - start,
    };
  } catch (error) {
    checks.checks.database = {
      status: "error",
      latency: 0,
    };
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "healthy" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
