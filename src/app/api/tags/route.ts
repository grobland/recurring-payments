import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { createTagSchema } from "@/lib/validations/tag";
import { eq, and, asc } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's tags sorted by name
    const userTags = await db.query.tags.findMany({
      where: eq(tags.userId, session.user.id),
      orderBy: [asc(tags.name)],
    });

    return NextResponse.json({ tags: userTags });
  } catch (error) {
    console.error("Get tags error:", error);
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
        { error: "Your trial has expired. Please upgrade to create tags." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = createTagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check if tag name already exists for this user
    const existing = await db.query.tags.findFirst({
      where: and(
        eq(tags.userId, session.user.id),
        eq(tags.name, data.name)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    // Create tag
    const [tag] = await db
      .insert(tags)
      .values({
        userId: session.user.id,
        name: data.name,
        color: data.color,
      })
      .returning();

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
