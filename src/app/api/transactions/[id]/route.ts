import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { StatementTransaction } from "@/types/source";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/transactions/[id]
 * Returns a single transaction by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [transaction] = await db
      .select({
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        merchantName: transactions.merchantName,
        amount: transactions.amount,
        currency: transactions.currency,
        tagStatus: transactions.tagStatus,
        convertedToSubscriptionId: transactions.convertedToSubscriptionId,
      })
      .from(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, session.user.id))
      );

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const result: StatementTransaction = {
      id: transaction.id,
      transactionDate: transaction.transactionDate.toISOString(),
      merchantName: transaction.merchantName,
      amount: transaction.amount,
      currency: transaction.currency,
      tagStatus: transaction.tagStatus,
      convertedToSubscriptionId: transaction.convertedToSubscriptionId,
    };

    return NextResponse.json({ transaction: result });
  } catch (error) {
    console.error("Get transaction error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
