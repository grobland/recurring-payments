import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { startOfMonth, subMonths, format } from "date-fns";

/**
 * GET /api/vault/coverage
 * Returns a per-source x 12-month coverage grid showing which
 * source+month combinations have PDFs, data only, or nothing.
 *
 * Response shape: { sources: CoverageSource[], gapCount: number, months: string[] }
 * Each source has exactly 12 cells ordered oldest to newest.
 * Never exposes pdfStoragePath to the client — only derives cell state from it.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Compute the 12-month window: months[0] = 11 months ago, months[11] = current month
    const now = new Date();
    const windowStart = startOfMonth(subMonths(now, 11));

    // Build the ordered list of 12 month labels (yyyy-MM)
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      months.push(format(startOfMonth(subMonths(now, i)), "yyyy-MM"));
    }

    // Single query: fetch all statements for the user in the 12-month window
    // (statementDate >= windowStart). We need pdfStoragePath only to derive state.
    const windowStatements = await db
      .select({
        id: statements.id,
        sourceType: statements.sourceType,
        statementDate: statements.statementDate,
        transactionCount: statements.transactionCount,
        pdfStoragePath: statements.pdfStoragePath,
      })
      .from(statements)
      .where(
        and(
          eq(statements.userId, userId),
          gte(statements.statementDate, windowStart)
        )
      );

    // Separately query all distinct sourceTypes for the user (includes those
    // with only older statements — they still get a row in the grid)
    const allSourceRows = await db
      .selectDistinct({ sourceType: statements.sourceType })
      .from(statements)
      .where(eq(statements.userId, userId));

    const allSources = allSourceRows.map((r) => r.sourceType);

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
      // Skip statements with null statementDate — they have no month to map to
      if (!stmt.statementDate) continue;

      const monthLabel = format(
        stmt.statementDate instanceof Date
          ? stmt.statementDate
          : new Date(stmt.statementDate),
        "yyyy-MM"
      );
      const key = `${stmt.sourceType}::${monthLabel}`;
      const hasPdf = stmt.pdfStoragePath !== null;

      const existing = cellMap.get(key);
      if (!existing) {
        cellMap.set(key, {
          statementId: stmt.id,
          transactionCount: stmt.transactionCount || 0,
          statementDate:
            stmt.statementDate instanceof Date
              ? stmt.statementDate.toISOString()
              : String(stmt.statementDate),
          hasPdf,
        });
      } else if (hasPdf && !existing.hasPdf) {
        // Prefer the statement that has a PDF
        cellMap.set(key, {
          statementId: stmt.id,
          transactionCount: stmt.transactionCount || 0,
          statementDate:
            stmt.statementDate instanceof Date
              ? stmt.statementDate.toISOString()
              : String(stmt.statementDate),
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

    const response = {
      sources,
      gapCount,
      months,
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
