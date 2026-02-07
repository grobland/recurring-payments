import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, categories, alerts } from "@/lib/db/schema";
import { detectPriceChange } from "@/lib/utils/anomaly-detection";
import { updateSubscriptionSchema } from "@/lib/validations/subscription";
import { calculateNormalizedMonthly } from "@/lib/utils/normalize";
import { eq, and, isNull, or } from "drizzle-orm";
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

    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id)
      ),
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
        importAudit: {
          columns: {
            id: true,
            statementSource: true,
            createdAt: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Get subscription error:", error);
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
        { error: "Your trial has expired. Please upgrade to edit subscriptions." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check subscription exists and belongs to user
    const existing = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
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

    // Detect price increase BEFORE updating
    const oldAmount = parseFloat(existing.amount);
    const newAmount = data.amount !== undefined ? data.amount : oldAmount;

    if (data.amount !== undefined && data.amount !== oldAmount) {
      const priceChange = detectPriceChange(oldAmount, newAmount);

      if (priceChange.isSignificant) {
        // Create price increase alert (fire-and-forget, don't block update)
        db.insert(alerts)
          .values({
            userId: session.user.id,
            subscriptionId: id,
            type: "price_increase",
            metadata: {
              oldAmount: priceChange.oldAmount,
              newAmount: priceChange.newAmount,
              currency: data.currency ?? existing.currency,
              subscriptionName: data.name ?? existing.name,
            },
          })
          .catch((err) => {
            console.error("Failed to create price increase alert:", err);
          });
      }
    }

    // Calculate normalized monthly if amount or frequency changed
    let normalizedMonthlyAmount: string | undefined;
    if (data.amount !== undefined || data.frequency !== undefined) {
      const amount = data.amount ?? parseFloat(existing.amount);
      const frequency = data.frequency ?? existing.frequency;
      normalizedMonthlyAmount = calculateNormalizedMonthly(amount, frequency);
    }

    // Update subscription
    const [updated] = await db
      .update(subscriptions)
      .set({
        ...data,
        url: data.url === "" ? null : data.url,
        amount: data.amount?.toFixed(2),
        normalizedMonthlyAmount,
        needsUpdate: false, // Clear needs update flag when edited
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    // Fetch with category for response
    const subscriptionWithCategory = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, updated.id),
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

    return NextResponse.json({ subscription: subscriptionWithCategory });
  } catch (error) {
    console.error("Update subscription error:", error);
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
        { error: "Your trial has expired. Please upgrade to delete subscriptions." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check subscription exists and belongs to user
    const existing = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id),
        isNull(subscriptions.deletedAt)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(subscriptions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id));

    return NextResponse.json({
      message: "Subscription deleted",
      id,
    });
  } catch (error) {
    console.error("Delete subscription error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
