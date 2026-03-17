import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, statementLineItems } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/statements/[id]/line-items
 *
 * Returns all line items for a statement, ordered by sequenceNumber.
 * Read-only endpoint — no POST/PUT/PATCH/DELETE exposed.
 *
 * The statement_line_items table is an immutable ledger.
 * Items are created during PDF processing and never modified.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: statementId } = await params;

    // Verify statement exists and belongs to user
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, statementId),
        eq(statements.userId, session.user.id)
      ),
      columns: {
        id: true,
        sourceType: true,
        processingStatus: true,
        accountId: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Fetch line items ordered by sequence number
    const lineItems = await db
      .select()
      .from(statementLineItems)
      .where(
        and(
          eq(statementLineItems.statementId, statementId),
          eq(statementLineItems.userId, session.user.id)
        )
      )
      .orderBy(asc(statementLineItems.sequenceNumber));

    // Determine document type from line items (all items for a statement share the same type)
    const documentType = lineItems.length > 0 ? lineItems[0].documentType : null;

    return NextResponse.json({
      lineItems,
      lineItemCount: lineItems.length,
      documentType,
      statementId,
    });
  } catch (error) {
    console.error("Get statement line items error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
