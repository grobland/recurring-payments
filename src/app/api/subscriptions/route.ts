import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, categories } from "@/lib/db/schema";
import {
  createSubscriptionSchema,
  subscriptionFiltersSchema,
} from "@/lib/validations/subscription";
import { calculateNormalizedMonthly } from "@/lib/utils/normalize";
import { eq, and, isNull, or, ilike, desc, asc } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Validate filters
    const filtersResult = subscriptionFiltersSchema.safeParse(params);
    if (!filtersResult.success) {
      return NextResponse.json(
        { error: filtersResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const filters = filtersResult.data;

    // Build where conditions
    const conditions = [eq(subscriptions.userId, session.user.id)];

    // Exclude soft-deleted unless requested
    if (!filters.includeDeleted) {
      conditions.push(isNull(subscriptions.deletedAt));
    }

    // Always exclude merged subscriptions (they're handled separately via undo)
    conditions.push(isNull(subscriptions.mergedAt));

    // Filter by status
    if (filters.status) {
      conditions.push(eq(subscriptions.status, filters.status));
    }

    // Filter by category
    if (filters.categoryId) {
      conditions.push(eq(subscriptions.categoryId, filters.categoryId));
    }

    // Filter by frequency
    if (filters.frequency) {
      conditions.push(eq(subscriptions.frequency, filters.frequency));
    }

    // Search by name
    if (filters.search) {
      conditions.push(ilike(subscriptions.name, `%${filters.search}%`));
    }

    // Determine sort order
    const orderFn = filters.sortOrder === "desc" ? desc : asc;
    const orderBy = (() => {
      switch (filters.sortBy) {
        case "name":
          return orderFn(subscriptions.name);
        case "amount":
          return orderFn(subscriptions.normalizedMonthlyAmount);
        case "createdAt":
          return orderFn(subscriptions.createdAt);
        case "nextRenewalDate":
        default:
          return orderFn(subscriptions.nextRenewalDate);
      }
    })();

    // Query subscriptions with category
    const userSubscriptions = await db.query.subscriptions.findMany({
      where: and(...conditions),
      orderBy,
      with: {
        category: {
          columns: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ subscriptions: userSubscriptions });
  } catch (error) {
    console.error("Get subscriptions error:", error);
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

    // Check if user can edit (active trial or subscription)
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to add subscriptions." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = createSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // If categoryId provided, verify it exists and belongs to user (or is default)
    if (data.categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, data.categoryId),
          or(
            isNull(categories.userId),
            eq(categories.userId, session.user.id)
          )
        ),
      });

      if (!category) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    // Calculate normalized monthly amount
    const normalizedMonthlyAmount = calculateNormalizedMonthly(
      data.amount,
      data.frequency
    );

    // Create subscription
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId: session.user.id,
        name: data.name,
        description: data.description,
        notes: data.notes,
        url: data.url || null,
        categoryId: data.categoryId,
        amount: data.amount.toFixed(2),
        currency: data.currency,
        frequency: data.frequency,
        normalizedMonthlyAmount,
        nextRenewalDate: data.nextRenewalDate,
        startDate: data.startDate,
        status: data.status,
        reminderEnabled: data.reminderEnabled,
        reminderDaysBefore: data.reminderDaysBefore,
      })
      .returning();

    // Fetch with category for response
    const subscriptionWithCategory = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscription.id),
      with: {
        category: {
          columns: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(
      { subscription: subscriptionWithCategory },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
