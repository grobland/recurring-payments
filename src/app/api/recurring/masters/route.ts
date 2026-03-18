import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recurringMasters, merchantEntities, recurringEvents } from "@/lib/db/schema";
import { and, eq, desc, lt, or, ilike } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { createMasterSchema } from "@/lib/validations/recurring";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/recurring/masters
 * Returns a paginated list of recurring masters for the authenticated user.
 *
 * Query params:
 *   - kind: filter by recurringKind
 *   - status: filter by status (default: "active")
 *   - search: case-insensitive name search
 *   - cursorDate: ISO date string for keyset pagination (updatedAt)
 *   - cursorId: UUID for keyset pagination (id)
 *   - pageSize: number 1-50 (default: 20)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const status = searchParams.get("status") ?? "active";
    const search = searchParams.get("search");
    const cursorDate = searchParams.get("cursorDate");
    const cursorId = searchParams.get("cursorId");
    const pageSizeParam = searchParams.get("pageSize");

    const pageSize = Math.min(
      Math.max(1, parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(recurringMasters.userId, session.user.id),
    ];

    if (status !== "all") {
      conditions.push(eq(recurringMasters.status, status as "active" | "paused" | "cancelled" | "dormant" | "needs_review"));
    }

    if (kind) {
      conditions.push(eq(recurringMasters.recurringKind, kind as "subscription" | "utility" | "insurance" | "loan" | "rent_mortgage" | "membership" | "installment" | "other_recurring"));
    }

    if (search) {
      conditions.push(ilike(recurringMasters.name, `%${search}%`));
    }

    // Keyset cursor pagination using (updatedAt DESC, id DESC)
    if (cursorDate && cursorId) {
      try {
        const cursorDateObj = new Date(cursorDate);
        if (!isNaN(cursorDateObj.getTime())) {
          conditions.push(
            or(
              lt(recurringMasters.updatedAt, cursorDateObj),
              and(
                eq(recurringMasters.updatedAt, cursorDateObj),
                lt(recurringMasters.id, cursorId)
              )
            )!
          );
        }
      } catch {
        // Invalid cursor date, skip cursor
      }
    }

    const results = await db
      .select({
        id: recurringMasters.id,
        userId: recurringMasters.userId,
        merchantEntityId: recurringMasters.merchantEntityId,
        merchantName: merchantEntities.name,
        categoryId: recurringMasters.categoryId,
        name: recurringMasters.name,
        description: recurringMasters.description,
        notes: recurringMasters.notes,
        url: recurringMasters.url,
        recurringKind: recurringMasters.recurringKind,
        status: recurringMasters.status,
        amountType: recurringMasters.amountType,
        expectedAmount: recurringMasters.expectedAmount,
        expectedAmountMin: recurringMasters.expectedAmountMin,
        expectedAmountMax: recurringMasters.expectedAmountMax,
        currency: recurringMasters.currency,
        billingFrequency: recurringMasters.billingFrequency,
        billingDayOfMonth: recurringMasters.billingDayOfMonth,
        nextExpectedDate: recurringMasters.nextExpectedDate,
        lastChargeDate: recurringMasters.lastChargeDate,
        confidence: recurringMasters.confidence,
        importanceRating: recurringMasters.importanceRating,
        createdAt: recurringMasters.createdAt,
        updatedAt: recurringMasters.updatedAt,
      })
      .from(recurringMasters)
      .leftJoin(merchantEntities, eq(recurringMasters.merchantEntityId, merchantEntities.id))
      .where(and(...conditions))
      .orderBy(desc(recurringMasters.updatedAt), desc(recurringMasters.id))
      .limit(pageSize + 1);

    const hasMore = results.length > pageSize;
    const page = hasMore ? results.slice(0, pageSize) : results;

    let nextCursor: { date: string; id: string } | null = null;
    if (hasMore && page.length > 0) {
      const lastItem = page[page.length - 1];
      nextCursor = {
        date: lastItem.updatedAt.toISOString(),
        id: lastItem.id,
      };
    }

    return NextResponse.json({
      data: page.map((m) => ({
        ...m,
        nextExpectedDate: m.nextExpectedDate?.toISOString() ?? null,
        lastChargeDate: m.lastChargeDate?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Get recurring masters error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

/**
 * POST /api/recurring/masters
 * Creates a manual recurring master for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to create recurring masters." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createMasterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    const [master] = await db
      .insert(recurringMasters)
      .values({
        userId: session.user.id,
        name: data.name,
        recurringKind: data.recurringKind,
        description: data.description ?? null,
        currency: data.currency,
        expectedAmount: data.expectedAmount != null ? String(data.expectedAmount) : null,
        billingFrequency: data.billingFrequency ?? null,
        billingDayOfMonth: data.billingDayOfMonth ?? null,
        importanceRating: data.importanceRating ?? null,
        url: data.url ?? null,
        notes: data.notes ?? null,
        status: "active",
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(recurringEvents).values({
      userId: session.user.id,
      recurringMasterId: master.id,
      eventType: "created",
      metadata: { name: master.name, recurringKind: master.recurringKind, source: "manual" },
    });

    return NextResponse.json({ data: master }, { status: 201 });
  } catch (error) {
    console.error("Create recurring master error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
