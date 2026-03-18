import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantEntities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateMerchantSchema = z.object({
  name: z.string().min(1).max(255),
});

/**
 * PATCH /api/recurring/merchants/[id]
 * Updates the merchant entity name.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const body = await request.json();
    const result = updateMerchantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = result.data;
    const normalizedName = name.toLowerCase().trim();

    const [existing] = await db
      .select()
      .from(merchantEntities)
      .where(and(eq(merchantEntities.id, id), eq(merchantEntities.userId, userId)));

    if (!existing) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(merchantEntities)
      .set({
        name: name.trim(),
        normalizedName,
        updatedAt: new Date(),
      })
      .where(and(eq(merchantEntities.id, id), eq(merchantEntities.userId, userId)))
      .returning();

    return NextResponse.json({
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update merchant entity error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

/**
 * DELETE /api/recurring/merchants/[id]
 * Deletes a merchant entity (cascades to aliases).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const [existing] = await db
      .select()
      .from(merchantEntities)
      .where(and(eq(merchantEntities.id, id), eq(merchantEntities.userId, userId)));

    if (!existing) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    await db
      .delete(merchantEntities)
      .where(and(eq(merchantEntities.id, id), eq(merchantEntities.userId, userId)));

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Delete merchant entity error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
