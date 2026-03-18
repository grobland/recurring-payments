import { describe, it, expect, vi } from "vitest";
import { resolveMerchant } from "@/lib/services/merchant-resolver";
import type { MerchantResolution } from "@/lib/services/merchant-resolver";

/**
 * Mock DB builder helper.
 *
 * Drizzle uses a chained query builder: db.select().from().innerJoin().where().orderBy().limit()
 * We build a sequenced mock so the first select call returns the exact-match result
 * and the second select call returns the fuzzy-match result.
 */
function makeSequencedDb(
  selectResults: unknown[][],
  insertResult: unknown[] = []
) {
  let selectCallCount = 0;

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      const result = selectResults[selectCallCount] ?? [];
      selectCallCount++;
      return Promise.resolve(result);
    }),
  };

  const insertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue(insertResult),
  };

  const db = {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
  };

  return db as unknown as Parameters<typeof resolveMerchant>[0];
}

describe("resolveMerchant", () => {
  const userId = "user-abc-123";

  it("returns exact match when alias found in first query", async () => {
    const exactResult = [
      { merchantEntityId: "entity-1", merchantName: "Netflix" },
    ];
    const db = makeSequencedDb([exactResult]);

    const resolution: MerchantResolution = await resolveMerchant(
      db,
      userId,
      "Netflix"
    );

    expect(resolution.matchType).toBe("exact");
    expect(resolution.merchantEntityId).toBe("entity-1");
    expect(resolution.merchantName).toBe("Netflix");
    expect(resolution.similarity).toBeUndefined();
  });

  it("returns fuzzy match when exact fails but fuzzy succeeds", async () => {
    const fuzzyResult = [
      {
        merchantEntityId: "entity-2",
        merchantName: "Spotify",
        similarity: 0.75,
      },
    ];
    // First select (exact) returns [], second (fuzzy) returns fuzzyResult
    const db = makeSequencedDb([[], fuzzyResult]);

    const resolution: MerchantResolution = await resolveMerchant(
      db,
      userId,
      "spotfy" // intentional typo to simulate fuzzy scenario
    );

    expect(resolution.matchType).toBe("fuzzy");
    expect(resolution.merchantEntityId).toBe("entity-2");
    expect(resolution.merchantName).toBe("Spotify");
    expect(resolution.similarity).toBe(0.75);
  });

  it("creates a new merchant entity when no match found", async () => {
    const newEntityResult = [{ id: "new-entity", name: "unknown merchant" }];
    // Both selects return []
    const db = makeSequencedDb([[], []], newEntityResult);

    const resolution: MerchantResolution = await resolveMerchant(
      db,
      userId,
      "unknown merchant"
    );

    expect(resolution.matchType).toBe("new");
    expect(resolution.merchantEntityId).toBe("new-entity");
    expect(resolution.merchantName).toBe("unknown merchant");
    expect(resolution.similarity).toBeUndefined();

    // Verify insert was called (both entity and alias)
    expect(db.insert).toHaveBeenCalled();
  });

  it("does not call insert when exact match is found", async () => {
    const exactResult = [
      { merchantEntityId: "entity-1", merchantName: "Amazon" },
    ];
    const db = makeSequencedDb([exactResult]);

    await resolveMerchant(db, userId, "Amazon");

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("does not call insert when fuzzy match is found", async () => {
    const fuzzyResult = [
      {
        merchantEntityId: "entity-3",
        merchantName: "Amazon Prime",
        similarity: 0.6,
      },
    ];
    const db = makeSequencedDb([[], fuzzyResult]);

    await resolveMerchant(db, userId, "amazon prme");

    expect(db.insert).not.toHaveBeenCalled();
  });
});
