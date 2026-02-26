import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, statements } from "@/lib/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { startOfMonth, subMonths, format } from "date-fns";

/**
 * GET /api/accounts/[id]/coverage
 * Returns a 12-month coverage grid scoped to a single financial account.
 * Filters statements by accountId FK (not linkedSourceType string).
 *
 * Response shape: { sources: CoverageSource[], gapCount: number, months: string[] }
 * Returns at most 1 source entry (the linked source) with exactly 12 cells.
 * If account has no statements, returns empty sources array with 12 month labels.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    // Verify account ownership
    const account = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, userId)
      ),
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Compute the 12-month window: months[0] = 11 months ago, months[11] = current month
    // MUST match vault coverage exactly — CoverageGrid assumes 12 cells
    const now = new Date();
    const windowStart = startOfMonth(subMonths(now, 11));

    // Build the ordered list of 12 month labels (yyyy-MM)
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      months.push(format(startOfMonth(subMonths(now, i)), "yyyy-MM"));
    }

    // If account has no linked source type, return empty sources with month labels
    // CoverageGrid still needs months for header rendering
    if (!account.linkedSourceType) {
      // Still check if there are any statements linked via FK (edge case: manual linking)
      const linkedStatements = await db
        .select({ id: statements.id })
        .from(statements)
        .where(eq(statements.accountId, id))
        .limit(1);

      if (linkedStatements.length === 0) {
        return NextResponse.json({
          sources: [],
          gapCount: 0,
          months,
        });
      }
    }

    // Query statements linked to this account via accountId FK (not sourceType string)
    // CRITICAL: Use statements.accountId = id, NOT statements.sourceType = linkedSourceType
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
          eq(statements.accountId, id),
          gte(statements.statementDate, windowStart)
        )
      );

    // If no statements linked to account, return empty sources
    if (windowStatements.length === 0 && !account.linkedSourceType) {
      return NextResponse.json({
        sources: [],
        gapCount: 0,
        months,
      });
    }

    // Determine the source type label — use account's linkedSourceType or derive from statements
    const sourceTypeLabel =
      account.linkedSourceType ??
      windowStatements[0]?.sourceType ??
      account.name;

    // Group window statements by "sourceType::yyyy-MM" key
    // For each cell key we may have multiple statements — prefer statement with PDF
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
      const key = `${sourceTypeLabel}::${monthLabel}`;
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

    // Build single source entry with 12 cells
    let gapCount = 0;

    const cells = months.map((month) => {
      const key = `${sourceTypeLabel}::${month}`;
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

    const sources = [{ sourceType: sourceTypeLabel, cells }];

    return NextResponse.json({ sources, gapCount, months });
  } catch (error) {
    console.error("Get account coverage error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
