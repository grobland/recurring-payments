import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantEntities, merchantAliases } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";

const createMerchantSchema = z.object({
  name: z.string().min(1).max(255),
  aliasText: z.string().min(1).max(255),
});

/**
 * GET /api/recurring/merchants
 * Returns merchant entities with their aliases for the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all merchant entities for this user
    const entities = await db
      .select()
      .from(merchantEntities)
      .where(eq(merchantEntities.userId, userId))
      .orderBy(asc(merchantEntities.name));

    // Fetch all aliases for this user
    const aliases = await db
      .select()
      .from(merchantAliases)
      .where(eq(merchantAliases.userId, userId))
      .orderBy(asc(merchantAliases.aliasText));

    // Group aliases by merchant entity
    const aliasesByEntity: Record<string, typeof aliases> = {};
    for (const alias of aliases) {
      const entityId = alias.merchantEntityId;
      if (!aliasesByEntity[entityId]) {
        aliasesByEntity[entityId] = [];
      }
      aliasesByEntity[entityId].push(alias);
    }

    const data = entities.map((entity) => ({
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      aliases: (aliasesByEntity[entity.id] ?? []).map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get merchant entities error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

/**
 * POST /api/recurring/merchants
 * Creates a new merchant entity with an initial alias.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createMerchantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const { name, aliasText } = result.data;

    // Normalize the name: lowercase + trim
    const normalizedName = name.toLowerCase().trim();

    // Create entity + alias in a transaction
    const [entity] = await db
      .insert(merchantEntities)
      .values({
        userId,
        name: name.trim(),
        normalizedName,
      })
      .returning();

    const [alias] = await db
      .insert(merchantAliases)
      .values({
        merchantEntityId: entity.id,
        userId,
        aliasText: aliasText.trim(),
        isUserDefined: true,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          ...entity,
          createdAt: entity.createdAt.toISOString(),
          updatedAt: entity.updatedAt.toISOString(),
          aliases: [{ ...alias, createdAt: alias.createdAt.toISOString() }],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create merchant entity error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
