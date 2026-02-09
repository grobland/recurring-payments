import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionTags, tags } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const toggleTagSchema = z.object({
  tagId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: transactionId } = await context.params;

    // Parse and validate request body
    const body = await request.json();
    const result = toggleTagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tagId, action } = result.data;

    // Verify transaction belongs to user
    const transaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, session.user.id)
      ),
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify tag belongs to user
    const tag = await db.query.tags.findFirst({
      where: and(eq(tags.id, tagId), eq(tags.userId, session.user.id)),
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 400 });
    }

    if (action === "add") {
      // Insert tag (upsert pattern - ignore if already exists)
      await db
        .insert(transactionTags)
        .values({
          transactionId,
          tagId,
        })
        .onConflictDoNothing();
    } else {
      // Remove tag
      await db
        .delete(transactionTags)
        .where(
          and(
            eq(transactionTags.transactionId, transactionId),
            eq(transactionTags.tagId, tagId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toggle transaction tag error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
