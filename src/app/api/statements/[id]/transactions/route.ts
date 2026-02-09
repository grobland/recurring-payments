import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { StatementTransaction } from "@/types/source";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/statements/[id]/transactions
 * Returns all transactions for a specific statement
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = await params;

    // Verify statement belongs to user
    const statement = await db
      .select({ id: statements.id })
      .from(statements)
      .where(
        and(
          eq(statements.id, statementId),
          eq(statements.userId, session.user.id)
        )
      )
      .limit(1);

    if (statement.length === 0) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Get all transactions for this statement
    const txList = await db
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
      .where(eq(transactions.statementId, statementId))
      .orderBy(desc(transactions.transactionDate));

    // Build response
    const result: StatementTransaction[] = txList.map((tx) => ({
      id: tx.id,
      transactionDate: tx.transactionDate.toISOString(),
      merchantName: tx.merchantName,
      amount: tx.amount,
      currency: tx.currency,
      tagStatus: tx.tagStatus,
      convertedToSubscriptionId: tx.convertedToSubscriptionId,
    }));

    return NextResponse.json({ transactions: result });
  } catch (error) {
    console.error("Get statement transactions error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
