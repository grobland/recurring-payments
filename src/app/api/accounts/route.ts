import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialAccounts, statements } from "@/lib/db/schema";
import { createAccountSchema } from "@/lib/validations/account";
import { eq, and, asc, isNull } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's accounts ordered by type then name
    const accounts = await db.query.financialAccounts.findMany({
      where: eq(financialAccounts.userId, session.user.id),
      orderBy: [
        asc(financialAccounts.accountType),
        asc(financialAccounts.name),
      ],
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
            "Your trial has expired. Please upgrade to create accounts.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = createAccountSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // ACCT-07: Source link conflict check — one sourceType per user
    if (data.linkedSourceType) {
      const conflicting = await db.query.financialAccounts.findFirst({
        where: and(
          eq(financialAccounts.userId, session.user.id),
          eq(financialAccounts.linkedSourceType, data.linkedSourceType)
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
    // DB stores decimal (0.0499). Divide by 100 before insert.
    let interestRateForDb: string | null = null;
    if (data.accountType === "loan" && data.interestRate != null) {
      interestRateForDb = String(Number(data.interestRate) / 100);
    }

    // Create account
    const [account] = await db
      .insert(financialAccounts)
      .values({
        userId: session.user.id,
        name: data.name,
        accountType: data.accountType,
        institution: data.institution ?? null,
        linkedSourceType: data.linkedSourceType ?? null,
        creditLimit:
          data.creditLimit != null ? String(data.creditLimit) : null,
        interestRate: interestRateForDb,
        loanTermMonths: data.loanTermMonths ?? null,
        updatedAt: new Date(),
      })
      .returning();

    // ACCT-07: Bulk-link existing unlinked statements for this source
    if (data.linkedSourceType) {
      await db
        .update(statements)
        .set({ accountId: account.id })
        .where(
          and(
            eq(statements.userId, session.user.id),
            eq(statements.sourceType, data.linkedSourceType),
            isNull(statements.accountId)
          )
        );
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

