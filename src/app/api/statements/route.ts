import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, financialAccounts } from "@/lib/db/schema";
import { and, eq, desc, lt, or } from "drizzle-orm";

const PAGE_SIZE = 20;

/**
 * GET /api/statements
 * Returns a paginated list of statements for the authenticated user.
 *
 * Query params:
 *   - accountId: optional UUID to filter by account
 *   - cursorDate: ISO date string for keyset pagination (createdAt)
 *   - cursorId: UUID for keyset pagination (id)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const cursorDate = searchParams.get("cursorDate");
    const cursorId = searchParams.get("cursorId");

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(statements.userId, session.user.id),
    ];

    if (accountId) {
      conditions.push(eq(statements.accountId, accountId));
    }

    // Keyset cursor pagination using (createdAt DESC, id DESC)
    // Next page condition: (createdAt < cursorDate) OR (createdAt = cursorDate AND id < cursorId)
    if (cursorDate && cursorId) {
      try {
        const cursorDateObj = new Date(cursorDate);
        if (!isNaN(cursorDateObj.getTime())) {
          conditions.push(
            or(
              lt(statements.createdAt, cursorDateObj),
              and(
                eq(statements.createdAt, cursorDateObj),
                lt(statements.id, cursorId)
              )
            )!
          );
        }
      } catch {
        // Invalid cursor date, skip cursor
      }
    }

    const results = await db
      .select({
        id: statements.id,
        fileName: statements.originalFilename,
        sourceType: statements.sourceType,
        uploadDate: statements.createdAt,
        status: statements.processingStatus,
        accountId: statements.accountId,
        accountName: financialAccounts.name,
        transactionCount: statements.transactionCount,
        statementDate: statements.statementDate,
      })
      .from(statements)
      .leftJoin(
        financialAccounts,
        eq(statements.accountId, financialAccounts.id)
      )
      .where(and(...conditions))
      .orderBy(desc(statements.createdAt), desc(statements.id))
      .limit(PAGE_SIZE + 1);

    const hasMore = results.length > PAGE_SIZE;
    const page = hasMore ? results.slice(0, PAGE_SIZE) : results;

    // Build next cursor from last item
    let nextCursor: { date: string; id: string } | null = null;
    if (hasMore && page.length > 0) {
      const lastItem = page[page.length - 1];
      nextCursor = {
        date: lastItem.uploadDate.toISOString(),
        id: lastItem.id,
      };
    }

    return NextResponse.json({
      data: page.map((s) => ({
        id: s.id,
        fileName: s.fileName,
        sourceType: s.sourceType,
        uploadDate: s.uploadDate.toISOString(),
        status: s.status,
        accountId: s.accountId ?? null,
        accountName: s.accountName ?? null,
        transactionCount: s.transactionCount,
        statementDate: s.statementDate?.toISOString() ?? null,
      })),
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Get statements error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
