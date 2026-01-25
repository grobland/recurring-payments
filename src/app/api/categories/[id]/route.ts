import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, subscriptions } from "@/lib/db/schema";
import { updateCategorySchema } from "@/lib/validations/category";
import { eq, and } from "drizzle-orm";
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

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if user has access (default category or user's own)
    if (category.userId !== null && category.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Get category error:", error);
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
        { error: "Your trial has expired. Please upgrade to edit categories." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check category exists and belongs to user (can't edit default categories)
    const existing = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found or cannot be edited" },
        { status: 404 }
      );
    }

    const data = result.data;

    // Update category
    const [updated] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("Update category error:", error);
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
        { error: "Your trial has expired. Please upgrade to delete categories." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check category exists and belongs to user (can't delete default categories)
    const existing = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found or cannot be deleted" },
        { status: 404 }
      );
    }

    // Set categoryId to null for subscriptions using this category
    await db
      .update(subscriptions)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(eq(subscriptions.categoryId, id));

    // Delete category
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
