import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionTags, tags } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const bulkTagSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1, "At least one transaction required"),
  tagId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const result = bulkTagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { transactionIds, tagId, action } = result.data;

    // Verify all transactions belong to user (security check)
    const userTransactions = await db.query.transactions.findMany({
      where: and(
        inArray(transactions.id, transactionIds),
        eq(transactions.userId, session.user.id)
      ),
      columns: { id: true },
    });

    const validTransactionIds = userTransactions.map((t) => t.id);

    if (validTransactionIds.length === 0) {
      return NextResponse.json(
        { error: "No valid transactions found" },
        { status: 404 }
      );
    }

    // Verify tag belongs to user
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, tagId), eq(tags.userId, session.user.id)),
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    let updatedCount = 0;

    if (action === "add") {
      // Insert tags for all transactions (upsert pattern - ignore if already exists)
      const values = validTransactionIds.map((transactionId) => ({
        transactionId,
        tagId,
      }));

      const insertResult = await db
        .insert(transactionTags)
        .values(values)
        .onConflictDoNothing();

      // Note: onConflictDoNothing doesn't return affected rows count reliably
      // So we report the count of valid transactions we attempted to tag
      updatedCount = validTransactionIds.length;
    } else {
      // Remove tag from all transactions
      const deleteResult = await db
        .delete(transactionTags)
        .where(
          and(
            inArray(transactionTags.transactionId, validTransactionIds),
            eq(transactionTags.tagId, tagId)
          )
        );

      updatedCount = validTransactionIds.length;
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Bulk tag transactions error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
