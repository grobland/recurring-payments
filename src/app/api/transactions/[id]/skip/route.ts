import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/transactions/[id]/skip
 * Mark a transaction as "not_subscription" (skipped)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and update
    const [transaction] = await db
      .update(transactions)
      .set({ tagStatus: "not_subscription" })
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, session.user.id))
      )
      .returning({ id: transactions.id });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, transactionId: transaction.id });
  } catch (error) {
    console.error("Skip transaction error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
