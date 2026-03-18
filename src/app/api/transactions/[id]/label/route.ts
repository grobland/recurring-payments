import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, userTransactionLabels } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { labelTransactionSchema } from "@/lib/validations/recurring";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/transactions/[id]/label
 * Upserts a user label for a transaction into user_transaction_labels.
 *
 * Body: { label: "recurring" | "not_recurring" | "ignore", notes?: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        {
          error:
            "Your trial has expired. Please upgrade to label transactions.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = labelTransactionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { label, notes } = result.data;

    // Verify transaction exists and belongs to user
    const [transaction] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, session.user.id)
        )
      );

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Upsert label — update on conflict
    const [labelRecord] = await db
      .insert(userTransactionLabels)
      .values({
        userId: session.user.id,
        transactionId: id,
        label,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userTransactionLabels.userId, userTransactionLabels.transactionId],
        set: {
          label,
          notes: notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, label: labelRecord });
  } catch (error) {
    console.error("Label transaction error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
