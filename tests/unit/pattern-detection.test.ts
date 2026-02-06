import { describe, expect, it } from "vitest";
import {
  calculatePatternConfidence,
  isDisplayableConfidence,
  getConfidenceTier,
  CONFIDENCE_THRESHOLDS,
  type DetectedPattern,
} from "@/lib/utils/pattern-detection";

describe("calculatePatternConfidence", () => {
  // Helper to create test pattern
  function createPattern(overrides: Partial<DetectedPattern> = {}): DetectedPattern {
    return {
      merchantName: "Netflix",
      currency: "USD",
      occurrenceCount: 3,
      chargeDates: [new Date(), new Date(), new Date()],
      amounts: [15.99, 15.99, 15.99],
      avgAmount: 15.99,
      amountStddev: 0,
      avgIntervalDays: 30,
      intervalStddev: 2,
      ...overrides,
    };
  }

  describe("occurrence scoring", () => {
    it("gives 20 points for 2 occurrences", () => {
      const pattern = createPattern({ occurrenceCount: 2 });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.occurrenceScore).toBe(20); // 10 + (2 * 5) = 20
    });

    it("gives 30 points (max) for 5+ occurrences", () => {
      const pattern = createPattern({ occurrenceCount: 5 });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.occurrenceScore).toBe(30); // capped at 30
    });

    it("caps at 30 for high occurrence counts", () => {
      const pattern = createPattern({ occurrenceCount: 10 });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.occurrenceScore).toBe(30);
    });
  });

  describe("interval consistency scoring", () => {
    it("gives high score for consistent intervals (low stddev)", () => {
      const pattern = createPattern({
        avgIntervalDays: 30,
        intervalStddev: 1, // CV = 1/30 ≈ 0.033 → 40 - 3.3 ≈ 37
      });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.intervalScore).toBeGreaterThanOrEqual(35);
    });

    it("gives low score for inconsistent intervals (high stddev)", () => {
      const pattern = createPattern({
        avgIntervalDays: 30,
        intervalStddev: 20, // CV = 20/30 ≈ 0.67 → 40 - 67 = negative, capped at 0
      });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.intervalScore).toBe(0);
    });

    it("handles zero average interval gracefully", () => {
      const pattern = createPattern({ avgIntervalDays: 0, intervalStddev: 0 });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.intervalScore).toBe(0);
    });
  });

  describe("amount consistency scoring", () => {
    it("gives high score for identical amounts (zero stddev)", () => {
      const pattern = createPattern({
        avgAmount: 15.99,
        amountStddev: 0,
      });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.amountScore).toBe(30);
    });

    it("gives lower score for varying amounts", () => {
      const pattern = createPattern({
        avgAmount: 15.99,
        amountStddev: 3, // CV = 3/15.99 ≈ 0.19 → 30 - 19 ≈ 11
      });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.amountScore).toBeLessThan(20);
    });

    it("handles zero average amount gracefully", () => {
      const pattern = createPattern({ avgAmount: 0, amountStddev: 0 });
      const result = calculatePatternConfidence(pattern);
      expect(result.factors.amountScore).toBe(0);
    });
  });

  describe("frequency detection", () => {
    it("detects monthly patterns (~30 days)", () => {
      const pattern = createPattern({ avgIntervalDays: 30 });
      const result = calculatePatternConfidence(pattern);
      expect(result.frequency).toBe("monthly");
    });

    it("detects monthly with tolerance (±7 days)", () => {
      const pattern = createPattern({ avgIntervalDays: 35 });
      const result = calculatePatternConfidence(pattern);
      expect(result.frequency).toBe("monthly");
    });

    it("detects yearly patterns (~365 days)", () => {
      const pattern = createPattern({ avgIntervalDays: 365 });
      const result = calculatePatternConfidence(pattern);
      expect(result.frequency).toBe("yearly");
    });

    it("detects yearly with tolerance (±7 days)", () => {
      const pattern = createPattern({ avgIntervalDays: 360 });
      const result = calculatePatternConfidence(pattern);
      expect(result.frequency).toBe("yearly");
    });

    it("returns null for non-standard intervals", () => {
      const pattern = createPattern({ avgIntervalDays: 90 }); // quarterly
      const result = calculatePatternConfidence(pattern);
      expect(result.frequency).toBeNull();
    });
  });

  describe("total score calculation", () => {
    it("combines all factors into total score", () => {
      const pattern = createPattern({
        occurrenceCount: 4, // 10 + 20 = 30 points (capped)
        avgIntervalDays: 30,
        intervalStddev: 1, // ~37 points
        avgAmount: 15.99,
        amountStddev: 0, // 30 points
      });
      const result = calculatePatternConfidence(pattern);
      // Should be close to max (97 points before cap)
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("caps total score at 100", () => {
      const pattern = createPattern({
        occurrenceCount: 10,
        avgIntervalDays: 30,
        intervalStddev: 0,
        avgAmount: 100,
        amountStddev: 0,
      });
      const result = calculatePatternConfidence(pattern);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

describe("isDisplayableConfidence", () => {
  it("returns true for score >= 70", () => {
    expect(isDisplayableConfidence(70)).toBe(true);
    expect(isDisplayableConfidence(85)).toBe(true);
    expect(isDisplayableConfidence(100)).toBe(true);
  });

  it("returns false for score < 70", () => {
    expect(isDisplayableConfidence(69)).toBe(false);
    expect(isDisplayableConfidence(50)).toBe(false);
    expect(isDisplayableConfidence(0)).toBe(false);
  });
});

describe("getConfidenceTier", () => {
  it("returns 'high' for score >= 80", () => {
    expect(getConfidenceTier(80)).toBe("high");
    expect(getConfidenceTier(100)).toBe("high");
  });

  it("returns 'medium' for score 50-79", () => {
    expect(getConfidenceTier(50)).toBe("medium");
    expect(getConfidenceTier(79)).toBe("medium");
  });

  it("returns 'low' for score < 50", () => {
    expect(getConfidenceTier(49)).toBe("low");
    expect(getConfidenceTier(0)).toBe("low");
  });
});
