import { db as defaultDb } from "@/lib/db";
import { merchantEntities, merchantAliases } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Type alias for the db client to keep the function testable
type DbClient = typeof defaultDb;

export type MerchantResolution = {
  merchantEntityId: string;
  merchantName: string;
  matchType: "exact" | "fuzzy" | "new";
  similarity?: number; // only set for fuzzy matches
};

/**
 * Resolve a normalized transaction descriptor to a merchant entity.
 *
 * Resolution flow:
 *  1. Exact alias match (case-insensitive)
 *  2. Fuzzy match via pg_trgm similarity() with threshold >= 0.4
 *  3. Auto-create new merchant entity + alias if no match found
 *
 * The db parameter is injected to keep this function unit-testable.
 */
export async function resolveMerchant(
  db: DbClient,
  userId: string,
  normalizedDescriptor: string
): Promise<MerchantResolution> {
  const lowerDescriptor = normalizedDescriptor.toLowerCase();

  // Step 1 — Exact alias match
  const exactMatch = await db
    .select({
      merchantEntityId: merchantAliases.merchantEntityId,
      merchantName: merchantEntities.name,
    })
    .from(merchantAliases)
    .innerJoin(
      merchantEntities,
      eq(merchantAliases.merchantEntityId, merchantEntities.id)
    )
    .where(
      and(
        eq(merchantAliases.userId, userId),
        eq(sql`lower(${merchantAliases.aliasText})`, lowerDescriptor)
      )
    )
    .limit(1);

  if (exactMatch.length > 0) {
    return {
      merchantEntityId: exactMatch[0].merchantEntityId,
      merchantName: exactMatch[0].merchantName,
      matchType: "exact",
    };
  }

  // Step 2 — Fuzzy match via pg_trgm
  const fuzzyMatch = await db
    .select({
      merchantEntityId: merchantAliases.merchantEntityId,
      merchantName: merchantEntities.name,
      similarity: sql<number>`similarity(lower(${merchantAliases.aliasText}), ${lowerDescriptor})`,
    })
    .from(merchantAliases)
    .innerJoin(
      merchantEntities,
      eq(merchantAliases.merchantEntityId, merchantEntities.id)
    )
    .where(
      and(
        eq(merchantAliases.userId, userId),
        sql`similarity(lower(${merchantAliases.aliasText}), ${lowerDescriptor}) >= 0.4`
      )
    )
    .orderBy(
      sql`similarity(lower(${merchantAliases.aliasText}), ${lowerDescriptor}) DESC`
    )
    .limit(1);

  if (fuzzyMatch.length > 0) {
    return {
      merchantEntityId: fuzzyMatch[0].merchantEntityId,
      merchantName: fuzzyMatch[0].merchantName,
      matchType: "fuzzy",
      similarity: fuzzyMatch[0].similarity,
    };
  }

  // Step 3 — Create new merchant entity + alias
  const [newEntity] = await db
    .insert(merchantEntities)
    .values({
      userId,
      name: normalizedDescriptor,
      normalizedName: lowerDescriptor,
      category: null,
    })
    .onConflictDoUpdate({
      target: [merchantEntities.userId, merchantEntities.normalizedName],
      set: { updatedAt: new Date() },
    })
    .returning({ id: merchantEntities.id, name: merchantEntities.name });

  // Create alias for this descriptor (onConflictDoNothing handles race conditions)
  await db
    .insert(merchantAliases)
    .values({
      merchantEntityId: newEntity.id,
      userId,
      aliasText: normalizedDescriptor,
      isUserDefined: false,
    })
    .onConflictDoNothing();

  return {
    merchantEntityId: newEntity.id,
    merchantName: newEntity.name,
    matchType: "new",
  };
}

/**
 * Convenience wrapper that uses the default db instance.
 * Use `resolveMerchant` directly in tests (inject mock db).
 */
export async function resolveMerchantWithDefaultDb(
  userId: string,
  normalizedDescriptor: string
): Promise<MerchantResolution> {
  return resolveMerchant(defaultDb, userId, normalizedDescriptor);
}
