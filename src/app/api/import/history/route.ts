import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importAudits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query import audits for current user
    const audits = await db.query.importAudits.findMany({
      where: eq(importAudits.userId, session.user.id),
      orderBy: desc(importAudits.createdAt),
      limit: 10,
      columns: {
        id: true,
        statementSource: true,
        createdAt: true,
        confirmedCount: true,
        rejectedCount: true,
      },
    });

    // Transform to match expected response format
    const imports = audits.map((audit) => ({
      id: audit.id,
      statementSource: audit.statementSource || "Unknown",
      createdAt: audit.createdAt.toISOString(),
      subscriptionsCreated: audit.confirmedCount,
      subscriptionsSkipped: audit.rejectedCount,
    }));

    return NextResponse.json({ imports });
  } catch (error) {
    console.error("Get import history error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
