import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, statements } from "@/lib/db/schema";
import { updateAccountSchema } from "@/lib/validations/account";
import { eq, and, isNull, ne } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find account by id AND userId (security check)
    const account = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, session.user.id)
      ),
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can edit
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        {
          error:
            "Your trial has expired. Please upgrade to edit accounts.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateAccountSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check account exists and belongs to user
    const existing = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Strip accountType — account type is locked after creation
    const data = result.data;
    delete data.accountType;

    // Source link conflict check — exclude self
    if (data.linkedSourceType != null) {
      const conflicting = await db.query.financialAccounts.findFirst({
        where: and(
          eq(financialAccounts.userId, session.user.id),
          eq(financialAccounts.linkedSourceType, data.linkedSourceType),
          ne(financialAccounts.id, id)
        ),
      });

      if (conflicting) {
        return NextResponse.json(
          {
            error: `Source "${data.linkedSourceType}" is already linked to another account`,
          },
          { status: 409 }
        );
      }
    }

    // interestRate convention: form sends percentage (e.g. 4.99),
    // DB stores decimal (0.0499). Divide by 100 before update.
    let interestRateForDb: string | null | undefined = undefined;
    if (data.interestRate != null) {
      interestRateForDb = String(Number(data.interestRate) / 100);
    } else if ("interestRate" in data) {
      interestRateForDb = null;
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (interestRateForDb !== undefined) {
      updatePayload.interestRate = interestRateForDb;
    }
    if (data.creditLimit != null) {
      updatePayload.creditLimit = String(data.creditLimit);
    }

    // Update account
    const [updated] = await db
      .update(financialAccounts)
      .set(updatePayload)
      .where(eq(financialAccounts.id, id))
      .returning();

    // Bulk-update statements when linkedSourceType changes
    const oldSourceType = existing.linkedSourceType;
    const newSourceType = data.linkedSourceType;

    const sourceTypeChanged =
      "linkedSourceType" in data && newSourceType !== oldSourceType;

    if (sourceTypeChanged) {
      // Unlink statements from old source
      if (oldSourceType) {
        await db
          .update(statements)
          .set({ accountId: null })
          .where(
            and(
              eq(statements.userId, session.user.id),
              eq(statements.sourceType, oldSourceType),
              eq(statements.accountId, id)
            )
          );
      }

      // Link unlinked statements to new source
      if (newSourceType) {
        await db
          .update(statements)
          .set({ accountId: id })
          .where(
            and(
              eq(statements.userId, session.user.id),
              eq(statements.sourceType, newSourceType),
              isNull(statements.accountId)
            )
          );
      }
    }

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can edit
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        {
          error:
            "Your trial has expired. Please upgrade to delete accounts.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check account exists and belongs to user
    const existing = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Delete account — statements.account_id becomes NULL via DB onDelete: "set null"
    await db
      .delete(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, id),
          eq(financialAccounts.userId, session.user.id)
        )
      );

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
