import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, transactions, statements } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * GET /api/accounts/[id]/spending
 * Returns aggregate spending statistics for transactions from statements
 * linked to the specified account.
 *
 * Response shape:
 * {
 *   totalSpent: number,
 *   monthlyAverage: number,
 *   topMerchant: string | null,
 *   topMerchantAmount: number,
 *   monthlyBreakdown: { month: string, amount: number }[]
 * }
 *
 * CRITICAL: Drizzle returns decimal columns as strings — always use parseFloat().
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

    // Query 1: Monthly breakdown
    // SUM per calendar month for all transactions from statements linked to this account
    const monthlyRows = await db
      .select({
        month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactions.transactionDate}), 'YYYY-MM')`,
        total: sql<string>`SUM(${transactions.amount}::numeric)`,
      })
      .from(transactions)
      .innerJoin(statements, eq(transactions.statementId, statements.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(statements.accountId, id)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${transactions.transactionDate}) ASC`);

    // Query 2: Top merchant by total spend
    const merchantRows = await db
      .select({
        merchantName: transactions.merchantName,
        total: sql<string>`SUM(${transactions.amount}::numeric)`,
      })
      .from(transactions)
      .innerJoin(statements, eq(transactions.statementId, statements.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(statements.accountId, id)
        )
      )
      .groupBy(transactions.merchantName)
      .orderBy(sql`SUM(${transactions.amount}::numeric) DESC`)
      .limit(1);

    // Build monthly breakdown — CRITICAL: parseFloat() on decimal string values
    const monthlyBreakdown = monthlyRows.map((row) => ({
      month: row.month,
      amount: parseFloat(row.total ?? "0"),
    }));

    // Compute aggregates
    const totalSpent = monthlyBreakdown.reduce((sum, row) => sum + row.amount, 0);
    const monthlyAverage =
      monthlyBreakdown.length > 0 ? totalSpent / monthlyBreakdown.length : 0;

    const topMerchant = merchantRows[0]?.merchantName ?? null;
    const topMerchantAmount = parseFloat(merchantRows[0]?.total ?? "0");

    return NextResponse.json({
      totalSpent,
      monthlyAverage,
      topMerchant,
      topMerchantAmount,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error("Get account spending error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
