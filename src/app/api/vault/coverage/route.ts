import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { eq, gte, lte, and, or, isNull, sql } from "drizzle-orm";
import { startOfMonth, subMonths, addMonths, format, parseISO } from "date-fns";

/**
 * GET /api/vault/coverage
 * Returns a per-source coverage grid showing which source+month
 * combinations have PDFs, data only, or nothing.
 *
 * Query params:
 *   from  - Start month in yyyy-MM format (default: 11 months ago)
 *   to    - End month in yyyy-MM format (default: current month)
 *
 * Response shape: { sources: CoverageSource[], gapCount: number, months: string[], dateRange: { earliest, latest } }
 * Never exposes pdfStoragePath to the client — only derives cell state from it.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse date range from query params (default to last 12 months)
    const now = new Date();
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const windowStart = fromParam
      ? startOfMonth(parseISO(fromParam + "-01"))
      : startOfMonth(subMonths(now, 11));

    const windowEnd = toParam
      ? startOfMonth(parseISO(toParam + "-01"))
      : startOfMonth(now);

    // Build ordered list of month labels (yyyy-MM) for the window
    const months: string[] = [];
    let cursor = windowStart;
    while (cursor <= windowEnd) {
      months.push(format(cursor, "yyyy-MM"));
      cursor = addMonths(cursor, 1);
    }

    // Fetch statements in the date window.
    // Include statements whose statementDate falls in the window OR whose
    // statementDate is NULL (legacy rows) — those will be mapped using
    // processedAt or createdAt as a fallback month indicator.
    const windowStatements = await db
      .select({
        id: statements.id,
        sourceType: statements.sourceType,
        statementDate: statements.statementDate,
        transactionCount: statements.transactionCount,
        pdfStoragePath: statements.pdfStoragePath,
        processedAt: statements.processedAt,
        createdAt: statements.createdAt,
      })
      .from(statements)
      .where(
        and(
          eq(statements.userId, userId),
          or(
            and(
              gte(statements.statementDate, windowStart),
              lte(statements.statementDate, windowEnd)
            ),
            isNull(statements.statementDate)
          )
        )
      );

    // Get all distinct sources for the user (so sources with no statements
    // in the window still get a row)
    const allSourceRows = await db
      .selectDistinct({ sourceType: statements.sourceType })
      .from(statements)
      .where(eq(statements.userId, userId));

    const allSources = allSourceRows.map((r) => r.sourceType);

    // Also fetch the global earliest/latest statement dates for the "All" preset
    const [dateRangeRow] = await db
      .select({
        earliest: sql<string>`MIN(${statements.statementDate})`,
        latest: sql<string>`MAX(${statements.statementDate})`,
      })
      .from(statements)
      .where(eq(statements.userId, userId));

    // Group window statements by "sourceType::yyyy-MM" key
    // For each cell key we may have multiple statements — we keep the preferred one
    // (a statement with PDF takes precedence over one without)
    interface CellRecord {
      statementId: string;
      transactionCount: number;
      statementDate: string | null;
      hasPdf: boolean;
    }

    const cellMap = new Map<string, CellRecord>();

    for (const stmt of windowStatements) {
      // Resolve which date to use for month bucketing.
      // Prefer statementDate; fall back to processedAt then createdAt for
      // legacy rows where statementDate was never populated.
      const dateForBucket =
        stmt.statementDate ??
        stmt.processedAt ??
        stmt.createdAt;

      if (!dateForBucket) continue;

      const bucketDate =
        dateForBucket instanceof Date ? dateForBucket : new Date(dateForBucket);

      // Skip if the fallback date falls outside the requested window
      if (bucketDate < windowStart || bucketDate > windowEnd) continue;

      const monthLabel = format(bucketDate, "yyyy-MM");
      const key = `${stmt.sourceType}::${monthLabel}`;
      const hasPdf = stmt.pdfStoragePath !== null;

      // Use statementDate when available; otherwise expose the fallback date
      // so the client knows roughly when this statement belongs to.
      const resolvedDate = stmt.statementDate instanceof Date
        ? stmt.statementDate
        : stmt.statementDate
          ? new Date(stmt.statementDate)
          : bucketDate;
      const resolvedDateIso = resolvedDate.toISOString();

      const existing = cellMap.get(key);
      if (!existing) {
        cellMap.set(key, {
          statementId: stmt.id,
          transactionCount: stmt.transactionCount || 0,
          statementDate: resolvedDateIso,
          hasPdf,
        });
      } else if (hasPdf && !existing.hasPdf) {
        // Prefer the statement that has a PDF
        cellMap.set(key, {
          statementId: stmt.id,
          transactionCount: stmt.transactionCount || 0,
          statementDate: resolvedDateIso,
          hasPdf,
        });
      }
    }

    // Build the sources array — one entry per distinct source, 12 cells each
    let gapCount = 0;

    const sources = allSources.map((sourceType) => {
      const cells = months.map((month) => {
        const key = `${sourceType}::${month}`;
        const record = cellMap.get(key);

        if (!record) {
          gapCount++;
          return {
            month,
            state: "missing" as const,
            statementId: null,
            transactionCount: 0,
            statementDate: null,
          };
        }

        return {
          month,
          state: record.hasPdf ? ("pdf" as const) : ("data" as const),
          statementId: record.statementId,
          transactionCount: record.transactionCount,
          statementDate: record.statementDate,
        };
      });

      return { sourceType, cells };
    });

    // Format earliest/latest for the client to build the "All" preset
    const dateRange = {
      earliest: dateRangeRow?.earliest
        ? format(new Date(dateRangeRow.earliest), "yyyy-MM")
        : null,
      latest: dateRangeRow?.latest
        ? format(new Date(dateRangeRow.latest), "yyyy-MM")
        : null,
    };

    const response = {
      sources,
      gapCount,
      months,
      dateRange,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get vault coverage error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
