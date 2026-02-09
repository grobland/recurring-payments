import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements, transactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/statements/[id]
 * Returns a single statement with its transaction stats
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get statement details
    const [statement] = await db
      .select({
        id: statements.id,
        originalFilename: statements.originalFilename,
        sourceType: statements.sourceType,
        statementDate: statements.statementDate,
        uploadedAt: statements.createdAt,
        transactionCount: statements.transactionCount,
      })
      .from(statements)
      .where(
        and(eq(statements.id, id), eq(statements.userId, session.user.id))
      );

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Get transaction stats for this statement
    const [txStats] = await db
      .select({
        converted:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} = 'converted' THEN 1 ELSE 0 END)::int`.as(
            "converted"
          ),
        skipped:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} = 'not_subscription' THEN 1 ELSE 0 END)::int`.as(
            "skipped"
          ),
        pending:
          sql<number>`SUM(CASE WHEN ${transactions.tagStatus} IN ('unreviewed', 'potential_subscription') THEN 1 ELSE 0 END)::int`.as(
            "pending"
          ),
      })
      .from(transactions)
      .where(eq(transactions.statementId, id));

    const stats = {
      converted: txStats?.converted || 0,
      skipped: txStats?.skipped || 0,
      pending: txStats?.pending || 0,
    };

    return NextResponse.json({
      statement: {
        id: statement.id,
        originalFilename: statement.originalFilename,
        sourceType: statement.sourceType,
        statementDate: statement.statementDate?.toISOString() || null,
        uploadedAt: statement.uploadedAt.toISOString(),
        transactionCount: statement.transactionCount || 0,
        stats,
      },
    });
  } catch (error) {
    console.error("Get statement error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
