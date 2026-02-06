import { describe, it, expect } from "vitest";
import {
  calculateSimilarity,
  type SubscriptionRecord,
  type SimilarityWeights,
} from "@/lib/utils/similarity";

describe("calculateSimilarity", () => {
  const baseRecord: SubscriptionRecord = {
    name: "Netflix",
    amount: 15.99,
    currency: "USD",
    frequency: "monthly",
    categoryId: "cat-1",
    statementSource: "Chase Credit Card",
  };

  describe("exact matches", () => {
    it("returns 100% for identical subscriptions", () => {
      const result = calculateSimilarity(baseRecord, { ...baseRecord });

      expect(result.score).toBe(100);
      expect(result.matches.name).toBe(true);
      expect(result.matches.amount).toBe(true);
      expect(result.matches.frequency).toBe(true);
      expect(result.matches.category).toBe(true);
      expect(result.matches.source).toBe(true);
    });
  });

  describe("name matching", () => {
    it("returns ~50% for name-only match with different everything else", () => {
      const different: SubscriptionRecord = {
        name: "Netflix",
        amount: 100.0,
        currency: "EUR",
        frequency: "yearly",
        categoryId: "cat-2",
        statementSource: "Different Bank",
      };

      const result = calculateSimilarity(baseRecord, different);

      // Name weight is 50%, so with only name matching we expect ~50%
      // But source also has partial Jaro-Winkler score, so slightly different
      expect(result.score).toBeGreaterThanOrEqual(45);
      expect(result.score).toBeLessThanOrEqual(55);
      expect(result.matches.name).toBe(true);
      expect(result.matches.amount).toBe(false);
      expect(result.matches.frequency).toBe(false);
    });

    it("handles case-insensitive name matching", () => {
      const uppercased: SubscriptionRecord = {
        ...baseRecord,
        name: "NETFLIX",
      };

      const result = calculateSimilarity(baseRecord, uppercased);

      expect(result.score).toBe(100);
      expect(result.matches.name).toBe(true);
    });

    it("handles mixed case name matching", () => {
      const mixedCase: SubscriptionRecord = {
        ...baseRecord,
        name: "NeTfLiX",
      };

      const result = calculateSimilarity(baseRecord, mixedCase);

      expect(result.score).toBe(100);
      expect(result.matches.name).toBe(true);
    });

    it("provides partial match for similar names using Jaro-Winkler", () => {
      const similar: SubscriptionRecord = {
        ...baseRecord,
        name: "Netflix Premium",
      };

      const result = calculateSimilarity(baseRecord, similar);

      // Jaro-Winkler should give high score for "Netflix" vs "Netflix Premium"
      expect(result.score).toBeGreaterThan(80);
      expect(result.matches.name).toBe(true);
    });

    it("handles completely different names", () => {
      const different: SubscriptionRecord = {
        ...baseRecord,
        name: "Spotify",
      };

      const result = calculateSimilarity(baseRecord, different);

      // Names are very different, so overall score should be lower
      expect(result.matches.name).toBe(false);
    });
  });

  describe("amount matching with tolerance", () => {
    it("matches amounts within 5% tolerance (4.9% diff)", () => {
      // 15.99 * 0.049 = 0.78, so 15.99 + 0.78 = 16.77 should match
      const withinTolerance: SubscriptionRecord = {
        ...baseRecord,
        amount: 16.77,
      };

      const result = calculateSimilarity(baseRecord, withinTolerance);

      expect(result.matches.amount).toBe(true);
    });

    it("does not match amounts outside 5% tolerance (5.1% diff)", () => {
      // 15.99 * 0.051 = 0.81, so 15.99 + 0.81 = 16.80 should NOT match
      const outsideTolerance: SubscriptionRecord = {
        ...baseRecord,
        amount: 16.81,
      };

      const result = calculateSimilarity(baseRecord, outsideTolerance);

      expect(result.matches.amount).toBe(false);
    });

    it("matches exact amounts", () => {
      const result = calculateSimilarity(baseRecord, { ...baseRecord });

      expect(result.matches.amount).toBe(true);
    });

    it("handles amount tolerance symmetrically (lower amount)", () => {
      // 15.99 * 0.049 = 0.78, so 15.99 - 0.78 = 15.21 should match
      const lowerAmount: SubscriptionRecord = {
        ...baseRecord,
        amount: 15.21,
      };

      const result = calculateSimilarity(baseRecord, lowerAmount);

      expect(result.matches.amount).toBe(true);
    });
  });

  describe("currency mismatch handling", () => {
    it("does not match amounts when currencies differ", () => {
      const differentCurrency: SubscriptionRecord = {
        ...baseRecord,
        currency: "EUR",
      };

      const result = calculateSimilarity(baseRecord, differentCurrency);

      // Same numeric amount but different currencies should NOT match
      expect(result.matches.amount).toBe(false);
    });

    it("matches amounts only when currencies are the same", () => {
      const sameCurrency: SubscriptionRecord = {
        ...baseRecord,
        amount: 16.0, // Within 5% of 15.99
      };

      const result = calculateSimilarity(baseRecord, sameCurrency);

      expect(result.matches.amount).toBe(true);
    });
  });

  describe("frequency matching", () => {
    it("matches same frequency", () => {
      const result = calculateSimilarity(baseRecord, { ...baseRecord });

      expect(result.matches.frequency).toBe(true);
    });

    it("does not match different frequencies", () => {
      const yearly: SubscriptionRecord = {
        ...baseRecord,
        frequency: "yearly",
      };

      const result = calculateSimilarity(baseRecord, yearly);

      expect(result.matches.frequency).toBe(false);
    });
  });

  describe("null/missing field handling", () => {
    it("scores neutral (contributes 0.5) when both categoryIds are null", () => {
      const noCategory1: SubscriptionRecord = {
        ...baseRecord,
        categoryId: null,
      };
      const noCategory2: SubscriptionRecord = {
        ...baseRecord,
        categoryId: null,
      };

      const result = calculateSimilarity(noCategory1, noCategory2);

      // Category contributes 5% weight, with null it should be neutral (0.5)
      // This affects overall score slightly
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(95);
    });

    it("scores neutral when one categoryId is null", () => {
      const noCategory: SubscriptionRecord = {
        ...baseRecord,
        categoryId: null,
      };

      const result = calculateSimilarity(baseRecord, noCategory);

      // Category mismatch: one has id, one is null
      expect(result.matches.category).toBe(false);
    });

    it("scores neutral when both statementSources are null", () => {
      const noSource1: SubscriptionRecord = {
        ...baseRecord,
        statementSource: null,
      };
      const noSource2: SubscriptionRecord = {
        ...baseRecord,
        statementSource: null,
      };

      const result = calculateSimilarity(noSource1, noSource2);

      // Source contributes 5% weight, with null it should be neutral (0.5)
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(95);
    });

    it("scores neutral when one statementSource is null", () => {
      const noSource: SubscriptionRecord = {
        ...baseRecord,
        statementSource: null,
      };

      const result = calculateSimilarity(baseRecord, noSource);

      // When one source is missing, it's neutral (0.5)
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(95);
    });

    it("handles undefined categoryId same as null", () => {
      const undefinedCategory: SubscriptionRecord = {
        ...baseRecord,
        categoryId: undefined,
      };
      const nullCategory: SubscriptionRecord = {
        ...baseRecord,
        categoryId: null,
      };

      const result1 = calculateSimilarity(baseRecord, undefinedCategory);
      const result2 = calculateSimilarity(baseRecord, nullCategory);

      expect(result1.matches.category).toBe(result2.matches.category);
    });
  });

  describe("matches object accuracy", () => {
    it("returns correct matches object for partial match", () => {
      const partial: SubscriptionRecord = {
        name: "Netflix",
        amount: 15.99,
        currency: "USD",
        frequency: "yearly", // Different
        categoryId: "cat-2", // Different
        statementSource: "Chase Credit Card",
      };

      const result = calculateSimilarity(baseRecord, partial);

      expect(result.matches.name).toBe(true);
      expect(result.matches.amount).toBe(true);
      expect(result.matches.frequency).toBe(false);
      expect(result.matches.category).toBe(false);
      expect(result.matches.source).toBe(true);
    });

    it("all matches false when nothing matches", () => {
      const completelyDifferent: SubscriptionRecord = {
        name: "Spotify Premium Family",
        amount: 100.0,
        currency: "EUR",
        frequency: "yearly",
        categoryId: "cat-99",
        statementSource: "Bank of America",
      };

      const result = calculateSimilarity(baseRecord, completelyDifferent);

      expect(result.matches.name).toBe(false);
      expect(result.matches.amount).toBe(false);
      expect(result.matches.frequency).toBe(false);
      expect(result.matches.category).toBe(false);
      // Source might have some Jaro-Winkler similarity
    });
  });

  describe("custom weights", () => {
    it("uses custom weights when provided", () => {
      const nameOnlyWeights: SimilarityWeights = {
        name: 1.0,
        amount: 0,
        frequency: 0,
        category: 0,
        source: 0,
      };

      const nameDifferent: SubscriptionRecord = {
        ...baseRecord,
        name: "Spotify", // Very different name
      };

      const result = calculateSimilarity(
        baseRecord,
        nameDifferent,
        nameOnlyWeights
      );

      // With 100% weight on name and very different names, score should be low
      expect(result.score).toBeLessThan(50);
    });

    it("amount-weighted scoring works correctly", () => {
      const amountOnlyWeights: SimilarityWeights = {
        name: 0,
        amount: 1.0,
        frequency: 0,
        category: 0,
        source: 0,
      };

      const amountSame: SubscriptionRecord = {
        name: "Completely Different Name",
        amount: 15.99,
        currency: "USD",
        frequency: "yearly",
        categoryId: null,
        statementSource: null,
      };

      const result = calculateSimilarity(
        baseRecord,
        amountSame,
        amountOnlyWeights
      );

      // With 100% weight on amount and same amount, score should be 100
      expect(result.score).toBe(100);
    });
  });

  describe("score range", () => {
    it("score is always between 0 and 100", () => {
      const testCases: SubscriptionRecord[] = [
        { ...baseRecord },
        {
          name: "",
          amount: 0,
          currency: "XYZ",
          frequency: "yearly",
          categoryId: null,
          statementSource: null,
        },
        {
          name: "Completely Different Everything",
          amount: 9999.99,
          currency: "JPY",
          frequency: "yearly",
          categoryId: "xyz",
          statementSource: "Unknown Source",
        },
      ];

      for (const testRecord of testCases) {
        const result = calculateSimilarity(baseRecord, testRecord);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty string names", () => {
      const emptyName: SubscriptionRecord = {
        ...baseRecord,
        name: "",
      };

      const result = calculateSimilarity(baseRecord, emptyName);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.matches.name).toBe(false);
    });

    it("handles zero amount", () => {
      const zeroAmount: SubscriptionRecord = {
        ...baseRecord,
        amount: 0,
      };

      const result = calculateSimilarity(baseRecord, zeroAmount);

      expect(result.matches.amount).toBe(false);
    });

    it("handles both amounts being zero", () => {
      const zero1: SubscriptionRecord = { ...baseRecord, amount: 0 };
      const zero2: SubscriptionRecord = { ...baseRecord, amount: 0 };

      const result = calculateSimilarity(zero1, zero2);

      // Both zero should be treated as a match
      expect(result.matches.amount).toBe(true);
    });

    it("handles very long names", () => {
      const longName = "A".repeat(500);
      const longNameRecord: SubscriptionRecord = {
        ...baseRecord,
        name: longName,
      };

      const result = calculateSimilarity(longNameRecord, longNameRecord);

      expect(result.score).toBe(100);
      expect(result.matches.name).toBe(true);
    });

    it("handles special characters in names", () => {
      const specialChars: SubscriptionRecord = {
        ...baseRecord,
        name: "Netflix (US) - Premium+",
      };

      const result = calculateSimilarity(specialChars, specialChars);

      expect(result.score).toBe(100);
    });

    it("handles unicode characters in names", () => {
      const unicode: SubscriptionRecord = {
        ...baseRecord,
        name: "Cafe \u00e9",
      };

      const result = calculateSimilarity(unicode, unicode);

      expect(result.score).toBe(100);
    });
  });
});
