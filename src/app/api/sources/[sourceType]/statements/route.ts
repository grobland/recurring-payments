import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import type { StatementSummary } from "@/types/source";

interface RouteParams {
  params: Promise<{
    sourceType: string;
  }>;
}

/**
 * GET /api/sources/[sourceType]/statements
 * Returns all statements for a specific source type with transaction stats
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceType: encodedSourceType } = await params;
    // URL decode the sourceType (e.g., "Chase%20Sapphire" -> "Chase Sapphire")
    const sourceType = decodeURIComponent(encodedSourceType);

    // Get all statements for this source type with transaction stats
    // Using a subquery for transaction counts per statement
    const statementList = await db
      .select({
        id: statements.id,
        originalFilename: statements.originalFilename,
        statementDate: statements.statementDate,
        uploadedAt: statements.createdAt,
        transactionCount: statements.transactionCount,
        pdfStoragePath: statements.pdfStoragePath,
      })
      .from(statements)
      .where(
        and(
          eq(statements.userId, session.user.id),
          eq(statements.sourceType, sourceType)
        )
      )
      .orderBy(desc(statements.statementDate));

    if (statementList.length === 0) {
      return NextResponse.json({ statements: [] });
    }

    // Get transaction stats per statement
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

    // Build response
    const result: StatementSummary[] = statementList.map((stmt) => {
      const stats = statsMap.get(stmt.id) || {
        converted: 0,
        skipped: 0,
        pending: 0,
      };

      return {
        id: stmt.id,
        originalFilename: stmt.originalFilename,
        statementDate: stmt.statementDate instanceof Date ? stmt.statementDate.toISOString() : (stmt.statementDate || ""),
        uploadedAt: stmt.uploadedAt instanceof Date ? stmt.uploadedAt.toISOString() : (stmt.uploadedAt || ""),
        transactionCount: stmt.transactionCount || 0,
        stats,
        hasPdf: stmt.pdfStoragePath !== null,
      };
    });

    return NextResponse.json({ statements: result });
  } catch (error) {
    console.error("Get source statements error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
