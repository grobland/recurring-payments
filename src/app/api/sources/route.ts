import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { eachMonthOfInterval, format, parseISO } from "date-fns";
import type { SourceCoverage } from "@/types/source";

/**
 * GET /api/sources
 * Returns coverage statistics for all statement sources
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Aggregate statement data grouped by sourceType
    // Uses subqueries for transaction stats to avoid N+1 queries
    const sourceStats = await db
      .select({
        sourceType: statements.sourceType,
        earliestStatementDate: sql<Date>`MIN(${statements.statementDate})`.as(
          "earliest_statement_date"
        ),
        latestStatementDate: sql<Date>`MAX(${statements.statementDate})`.as(
          "latest_statement_date"
        ),
        statementCount: sql<number>`COUNT(*)::int`.as("statement_count"),
        lastImportDate: sql<Date>`MAX(${statements.createdAt})`.as(
          "last_import_date"
        ),
      })
      .from(statements)
      .where(eq(statements.userId, userId))
      .groupBy(statements.sourceType)
      .orderBy(desc(sql`MAX(${statements.createdAt})`));

    if (sourceStats.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    // Get all statement dates per source for gap detection
    const statementDates = await db
      .select({
        sourceType: statements.sourceType,
        statementDate: statements.statementDate,
      })
      .from(statements)
      .where(eq(statements.userId, userId))
      .orderBy(statements.sourceType, statements.statementDate);

    // Group statement dates by source
    const datesBySource = new Map<string, Date[]>();
    for (const row of statementDates) {
      if (!row.statementDate) continue;
      const dates = datesBySource.get(row.sourceType) || [];
      dates.push(row.statementDate);
      datesBySource.set(row.sourceType, dates);
    }

    // Get transaction stats grouped by source type
    // Join through statements to get sourceType
    const transactionStats = await db
      .select({
        sourceType: statements.sourceType,
        transactionCount: sql<number>`COUNT(${transactions.id})::int`.as(
          "transaction_count"
        ),
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
      .innerJoin(statements, eq(transactions.statementId, statements.id))
      .where(eq(transactions.userId, userId))
      .groupBy(statements.sourceType);

    // Build map of transaction stats by source
    const statsMap = new Map<
      string,
      {
        transactionCount: number;
        converted: number;
        skipped: number;
        pending: number;
      }
    >();
    for (const row of transactionStats) {
      statsMap.set(row.sourceType, {
        transactionCount: row.transactionCount || 0,
        converted: row.converted || 0,
        skipped: row.skipped || 0,
        pending: row.pending || 0,
      });
    }

    // Build source coverage response
    const sources: SourceCoverage[] = sourceStats.map((source) => {
      const txStats = statsMap.get(source.sourceType) || {
        transactionCount: 0,
        converted: 0,
        skipped: 0,
        pending: 0,
      };

      // Calculate gaps
      const dates = datesBySource.get(source.sourceType) || [];
      const gaps = calculateGaps(dates);

      return {
        sourceType: source.sourceType,
        earliestStatementDate: source.earliestStatementDate?.toISOString() || "",
        latestStatementDate: source.latestStatementDate?.toISOString() || "",
        statementCount: source.statementCount || 0,
        transactionCount: txStats.transactionCount,
        lastImportDate: source.lastImportDate?.toISOString() || "",
        stats: {
          converted: txStats.converted,
          skipped: txStats.skipped,
          pending: txStats.pending,
        },
        gaps,
      };
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Get sources error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Calculate missing months between earliest and latest statement dates
 * @param dates - Array of statement dates (must have at least 2 for gap detection)
 * @returns Array of missing months in YYYY-MM format
 */
function calculateGaps(dates: Date[]): string[] {
  if (dates.length < 2) {
    return [];
  }

  // Get the date range
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const earliest = sortedDates[0];
  const latest = sortedDates[sortedDates.length - 1];

  // Generate all expected months in the range
  const allMonths = eachMonthOfInterval({ start: earliest, end: latest });
  const expectedMonths = new Set(allMonths.map((d) => format(d, "yyyy-MM")));

  // Get actual months from statement dates
  const actualMonths = new Set(sortedDates.map((d) => format(d, "yyyy-MM")));

  // Find gaps (expected months not in actual)
  const gaps: string[] = [];
  for (const month of expectedMonths) {
    if (!actualMonths.has(month)) {
      gaps.push(month);
    }
  }

  return gaps.sort();
}
