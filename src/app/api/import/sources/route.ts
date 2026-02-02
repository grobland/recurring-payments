import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { importAudits } from "@/lib/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch distinct sources (order doesn't matter for dropdown, dedup happens in JS)
    const sources = await db
      .selectDistinct({ source: importAudits.statementSource })
      .from(importAudits)
      .where(
        and(
          eq(importAudits.userId, session.user.id),
          isNotNull(importAudits.statementSource)
        )
      )
      .limit(50);

    // Normalize to lowercase for deduplication, keep original casing
    const normalized = new Map<string, string>();
    sources.forEach((s) => {
      if (s.source) {
        const lower = s.source.toLowerCase();
        if (!normalized.has(lower)) {
          normalized.set(lower, s.source);
        }
      }
    });

    return NextResponse.json({
      sources: Array.from(normalized.values()),
    });
  } catch (error) {
    console.error("Fetch sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
