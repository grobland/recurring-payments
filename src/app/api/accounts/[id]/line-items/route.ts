import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  statementLineItems,
  statements,
  financialAccounts,
} from "@/lib/db/schema";
import { and, eq, gte, lte, lt, or, ilike, desc, sql } from "drizzle-orm";

const PAGE_SIZE = 50;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/[id]/line-items
 *
 * Returns paginated, filterable line items across all statements
 * linked to the given account. Keyset pagination on (transactionDate DESC, id DESC).
 *
 * Query params:
 *   search      — ILIKE on description
 *   dateFrom    — ISO date string lower bound
 *   dateTo      — ISO date string upper bound
 *   type        — "debit" | "credit" | "all" (filters by amount sign)
 *   cursorDate  — pagination cursor (transactionDate of last item)
 *   cursorId    — pagination cursor (id of last item)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId } = await params;
    const { searchParams } = new URL(request.url);

    // Verify account ownership
    const account = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.userId, session.user.id)
      ),
      columns: { id: true, currency: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Parse filters
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const type = searchParams.get("type"); // "debit" | "credit" | "all"
    const cursorDate = searchParams.get("cursorDate");
    const cursorId = searchParams.get("cursorId");

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(statementLineItems.userId, session.user.id),
      eq(statements.accountId, accountId),
    ];

    // Search filter
    if (search?.trim()) {
      conditions.push(ilike(statementLineItems.description, `%${search.trim()}%`));
    }

    // Date range
    if (dateFrom) {
      try {
        const d = new Date(dateFrom);
        if (!isNaN(d.getTime())) {
          conditions.push(gte(statementLineItems.transactionDate, d));
        }
      } catch { /* skip */ }
    }

    if (dateTo) {
      try {
        const d = new Date(dateTo);
        if (!isNaN(d.getTime())) {
          conditions.push(lte(statementLineItems.transactionDate, d));
        }
      } catch { /* skip */ }
    }

    // Debit / credit filter
    if (type === "debit") {
      conditions.push(sql`${statementLineItems.amount} < 0`);
    } else if (type === "credit") {
      conditions.push(sql`${statementLineItems.amount} > 0`);
    }

    // Keyset cursor
    if (cursorDate && cursorId) {
      try {
        const d = new Date(cursorDate);
        if (!isNaN(d.getTime())) {
          conditions.push(
            or(
              lt(statementLineItems.transactionDate, d),
              and(
                eq(statementLineItems.transactionDate, d),
                lt(statementLineItems.id, cursorId)
              )
            )!
          );
        }
      } catch { /* skip */ }
    }

    // Query
    const results = await db
      .select({
        id: statementLineItems.id,
        statementId: statementLineItems.statementId,
        sequenceNumber: statementLineItems.sequenceNumber,
        transactionDate: statementLineItems.transactionDate,
        description: statementLineItems.description,
        amount: statementLineItems.amount,
        currency: statementLineItems.currency,
        balance: statementLineItems.balance,
        documentType: statementLineItems.documentType,
        details: statementLineItems.details,
        createdAt: statementLineItems.createdAt,
        // From statement join
        sourceType: statements.sourceType,
        originalFilename: statements.originalFilename,
      })
      .from(statementLineItems)
      .innerJoin(statements, eq(statementLineItems.statementId, statements.id))
      .where(and(...conditions))
      .orderBy(
        desc(statementLineItems.transactionDate),
        desc(statementLineItems.id)
      )
      .limit(PAGE_SIZE + 1);

    const hasMore = results.length > PAGE_SIZE;
    const page = hasMore ? results.slice(0, PAGE_SIZE) : results;

    // Build next cursor
    let nextCursor: { transactionDate: string; id: string } | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      nextCursor = {
        transactionDate: last.transactionDate?.toISOString() ?? "",
        id: last.id,
      };
    }

    return NextResponse.json({
      lineItems: page,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get account line items error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
