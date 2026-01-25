import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { createCategorySchema } from "@/lib/validations/category";
import { eq, or, isNull, asc } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get default categories (userId is null) and user's custom categories
    const userCategories = await db.query.categories.findMany({
      where: or(
        isNull(categories.userId),
        eq(categories.userId, session.user.id)
      ),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    });

    return NextResponse.json({ categories: userCategories });
  } catch (error) {
    console.error("Get categories error:", error);
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
        { error: "Your trial has expired. Please upgrade to create categories." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = createCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const slug = generateSlug(data.name);

    // Check for duplicate slug for this user
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, slug),
    });

    if (existing && (existing.userId === session.user.id || existing.userId === null)) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    // Get max sort order for user's categories
    const userCats = await db.query.categories.findMany({
      where: eq(categories.userId, session.user.id),
    });
    const maxSortOrder = userCats.reduce(
      (max, cat) => Math.max(max, cat.sortOrder),
      100 // Start custom categories after default ones
    );

    // Create category
    const [category] = await db
      .insert(categories)
      .values({
        userId: session.user.id,
        name: data.name,
        slug,
        icon: data.icon,
        color: data.color,
        isDefault: false,
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
