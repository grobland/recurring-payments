import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can edit
    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to restore subscriptions." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check subscription exists, belongs to user, and is deleted
    const existing = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, session.user.id),
        isNotNull(subscriptions.deletedAt)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found or not deleted" },
        { status: 404 }
      );
    }

    // Restore (clear deletedAt)
    const [restored] = await db
      .update(subscriptions)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    // Fetch with category for response
    const subscriptionWithCategory = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, restored.id),
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
    console.error("Restore subscription error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
