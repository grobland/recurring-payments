import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { updateTagSchema } from "@/lib/validations/tag";
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

    // Find tag by id AND userId (security check)
    const tag = await db.query.tags.findFirst({
      where: and(
        eq(tags.id, id),
        eq(tags.userId, session.user.id)
      ),
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Get tag error:", error);
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
        { error: "Your trial has expired. Please upgrade to edit tags." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateTagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check tag exists and belongs to user
    const existing = await db.query.tags.findFirst({
      where: and(
        eq(tags.id, id),
        eq(tags.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    const data = result.data;

    // If name is being updated, check for duplicates
    if (data.name && data.name !== existing.name) {
      const duplicate = await db.query.tags.findFirst({
        where: and(
          eq(tags.userId, session.user.id),
          eq(tags.name, data.name)
        ),
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A tag with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update tag
    const [updated] = await db
      .update(tags)
      .set(data)
      .where(eq(tags.id, id))
      .returning();

    return NextResponse.json({ tag: updated });
  } catch (error) {
    console.error("Update tag error:", error);
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
        { error: "Your trial has expired. Please upgrade to delete tags." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check tag exists and belongs to user
    const existing = await db.query.tags.findFirst({
      where: and(
        eq(tags.id, id),
        eq(tags.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Delete tag (cascade deletes transactionTags due to foreign key constraint)
    await db.delete(tags).where(eq(tags.id, id));

    return NextResponse.json({ message: "Tag deleted" });
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
