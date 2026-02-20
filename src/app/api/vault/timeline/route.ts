import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * GET /api/vault/timeline
 * Returns all statements for the user across all sources with transaction stats
 * and aggregate counts for the stats bar.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Query all statements for the user ordered by statementDate DESC (nulls last)
    const statementList = await db
      .select({
        id: statements.id,
        sourceType: statements.sourceType,
        originalFilename: statements.originalFilename,
        statementDate: statements.statementDate,
        transactionCount: statements.transactionCount,
        pdfStoragePath: statements.pdfStoragePath,
      })
      .from(statements)
      .where(eq(statements.userId, userId))
      .orderBy(desc(statements.statementDate));

    if (statementList.length === 0) {
      return NextResponse.json({
        statements: [],
        totalSources: 0,
        totalStatements: 0,
        totalPdfs: 0,
      });
    }

    // Get transaction stats per statement (same pattern as /api/sources/[sourceType]/statements/route.ts)
    const statementIds = statementList.map((s) => s.id);
    const txStats = await db
      .select({
        statementId: transactions.statementId,
        converted:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} = 'converted' THEN 1 ELSE 0 END)::int`.as(
            "converted"
          ),
        skipped:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} = 'not_subscription' THEN 1 ELSE 0 END)::int`.as(
            "skipped"
          ),
        pending:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} IN ('unreviewed', 'potential_subscription') THEN 1 ELSE 0 END)::int`.as(
            "pending"
          ),
      })
      .from(transactions)
      .where(inArray(transactions.statementId, statementIds))
      .groupBy(transactions.statementId);

    // Build stats map
    const statsMap = new Map<
      string,
      { converted: number; skipped: number; pending: number }
    >();
    for (const row of txStats) {
      statsMap.set(row.statementId, {
        converted: row.converted || 0,
        skipped: row.skipped || 0,
        pending: row.pending || 0,
      });
    }

    // Map results to response shape — never expose pdfStoragePath to client
    const mappedStatements = statementList.map((stmt) => {
      const stats = statsMap.get(stmt.id) || {
        converted: 0,
        skipped: 0,
        pending: 0,
      };

      return {
        id: stmt.id,
        sourceType: stmt.sourceType,
        originalFilename: stmt.originalFilename,
        // Serialize dates properly — same pattern as sources route
        statementDate:
          stmt.statementDate instanceof Date
            ? stmt.statementDate.toISOString()
            : stmt.statementDate ?? null,
        transactionCount: stmt.transactionCount || 0,
        // Derive hasPdf from pdfStoragePath — never expose raw path
        hasPdf: stmt.pdfStoragePath !== null,
        stats,
      };
    });

    // Calculate aggregate stats
    const totalSources = new Set(statementList.map((s) => s.sourceType)).size;
    const totalStatements = statementList.length;
    const totalPdfs = statementList.filter(
      (s) => s.pdfStoragePath !== null
    ).length;

    return NextResponse.json({
      statements: mappedStatements,
      totalSources,
      totalStatements,
      totalPdfs,
    });
  } catch (error) {
    console.error("Get vault timeline error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
