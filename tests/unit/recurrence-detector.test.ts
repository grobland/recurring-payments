import { describe, it, expect } from "vitest";
import {
  classifyAmountType,
  predictNextDate,
  computeConfidence,
  detectPatternForGroup,
} from "@/lib/services/recurrence-detector";

// ============ classifyAmountType ============

describe("classifyAmountType", () => {
  it("returns fixed when all amounts are exactly equal", () => {
    expect(classifyAmountType([10, 10, 10])).toBe("fixed");
  });

  it("returns fixed when CV <= 0.05 (very small variance)", () => {
    // CV = stddev / mean. mean=10, stddev~0.1 => CV=0.01 => fixed
    expect(classifyAmountType([9.95, 10.0, 10.05])).toBe("fixed");
  });

  it("returns variable when amounts vary (CV > 0.05)", () => {
    expect(classifyAmountType([10, 15, 20])).toBe("variable");
  });

  it("returns variable when CV is just above 0.05", () => {
    // mean=100, stddev~7.07 => CV~0.07 => variable
    // values: 90, 100, 110: variance=(100+0+100)/3=66.67, stddev=8.16, CV=0.0816
    expect(classifyAmountType([90, 100, 110])).toBe("variable");
  });

  it("handles single-amount array as fixed", () => {
    expect(classifyAmountType([42])).toBe("fixed");
  });
});

// ============ predictNextDate ============

describe("predictNextDate", () => {
  it("predicts monthly: same day next month", () => {
    const result = predictNextDate(new Date("2025-03-15"), "monthly", 15);
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2025);
    expect(result!.getUTCMonth()).toBe(3); // April = index 3
    expect(result!.getUTCDate()).toBe(15);
  });

  it("predicts yearly: same day next year", () => {
    const result = predictNextDate(new Date("2025-03-15"), "yearly", null);
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2026);
    expect(result!.getUTCMonth()).toBe(2); // March = index 2
    expect(result!.getUTCDate()).toBe(15);
  });

  it("predicts weekly: last date + 7 days", () => {
    const result = predictNextDate(new Date("2025-03-15"), "weekly", null);
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2025);
    expect(result!.getUTCMonth()).toBe(2); // March = index 2
    expect(result!.getUTCDate()).toBe(22);
  });

  it("predicts quarterly: last date + 91 days", () => {
    const result = predictNextDate(new Date("2025-01-01"), "quarterly", null);
    expect(result).not.toBeNull();
    const diffDays = Math.round(
      (result!.getTime() - new Date("2025-01-01").getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(91);
  });

  it("predicts custom: last date + intervalDays", () => {
    const result = predictNextDate(new Date("2025-01-01"), "custom", null, 14);
    expect(result).not.toBeNull();
    const diffDays = Math.round(
      (result!.getTime() - new Date("2025-01-01").getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(14);
  });
});

// ============ computeConfidence ============

describe("computeConfidence", () => {
  it("Rule B with 3 occurrences and tight intervals returns >= 0.75", () => {
    const result = computeConfidence("B", 3, 2, 0.01, false);
    expect(result).toBeGreaterThanOrEqual(0.75);
  });

  it("Rule B with user boost adds 0.10 to confidence", () => {
    const withoutBoost = computeConfidence("B", 3, 2, 0.01, false);
    const withBoost = computeConfidence("B", 3, 2, 0.01, true);
    expect(withBoost - withoutBoost).toBeCloseTo(0.1, 5);
  });

  it("Rule C returns base >= 0.60", () => {
    const result = computeConfidence("C", 2, 2, 0.3, false);
    expect(result).toBeGreaterThanOrEqual(0.6);
  });

  it("Rule D returns base >= 0.65", () => {
    const result = computeConfidence("D", 2, 5, 0.02, false);
    expect(result).toBeGreaterThanOrEqual(0.65);
  });

  it("Rule A always returns 0.95", () => {
    expect(computeConfidence("A", 5, 0, 0, false)).toBe(0.95);
  });

  it("confidence is capped at 1.0", () => {
    const result = computeConfidence("B", 100, 0, 0, true);
    expect(result).toBeLessThanOrEqual(1.0);
  });
});

// ============ detectPatternForGroup ============

describe("detectPatternForGroup", () => {
  // Helper: create transactions with specific dates and amounts
  function makeTxns(items: Array<{ date: string; amount: number }>) {
    return items.map(({ date, amount }) => ({ date: new Date(date), amount }));
  }

  it("returns null for a single transaction (DETECT-10)", () => {
    const txns = makeTxns([{ date: "2025-01-15", amount: 100 }]);
    expect(detectPatternForGroup(txns, false, false)).toBeNull();
  });

  it("returns null for two transactions with no recognizable pattern (large random interval)", () => {
    const txns = makeTxns([
      { date: "2024-01-01", amount: 100 },
      { date: "2024-06-15", amount: 200 }, // ~165 days apart, different amounts, not annual
    ]);
    // Should not match any rule — too far for monthly, not annual, not weekly, CV too high for consistent custom
    const result = detectPatternForGroup(txns, false, false);
    // May return null or a low-confidence custom pattern — just verify it's not a false strong match
    if (result !== null) {
      expect(result.confidence).toBeLessThan(0.70);
    }
  });

  it("Rule B: detects fixed monthly (3 same-amount monthly transactions)", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
      { date: "2025-03-14", amount: 9.99 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("B");
    expect(result!.detectedFrequency).toBe("monthly");
    expect(result!.amountType).toBe("fixed");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.70);
  });

  it("Rule B: disqualified when day-of-month stddev > 5", () => {
    // Dates: 1st, 15th, 28th — stddev of DOM = very large
    const txns = makeTxns([
      { date: "2025-01-01", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
      { date: "2025-03-28", amount: 9.99 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    // Should NOT be Rule B; if anything, Rule C or no match
    if (result !== null) {
      expect(result.rule).not.toBe("B");
    }
  });

  it("Rule C: detects variable monthly (varying amounts, monthly intervals)", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 50 },
      { date: "2025-02-16", amount: 55 },
      { date: "2025-03-14", amount: 48 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("C");
    expect(result!.detectedFrequency).toBe("monthly");
    expect(result!.amountType).toBe("variable");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.60);
  });

  it("Rule D: detects annual recurrence (~365 day interval)", () => {
    const txns = makeTxns([
      { date: "2024-01-01", amount: 120 },
      { date: "2025-01-02", amount: 120 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("D");
    expect(result!.detectedFrequency).toBe("yearly");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it("Rule E: detects weekly (7-day intervals, 4 transactions)", () => {
    const txns = makeTxns([
      { date: "2025-01-01", amount: 5 },
      { date: "2025-01-08", amount: 5 },
      { date: "2025-01-15", amount: 5 },
      { date: "2025-01-22", amount: 5 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("E");
    expect(result!.detectedFrequency).toBe("weekly");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it("Rule E: detects quarterly (90-day intervals)", () => {
    const txns = makeTxns([
      { date: "2025-01-01", amount: 30 },
      { date: "2025-04-01", amount: 30 }, // exactly 90 days apart
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("E");
    expect(result!.detectedFrequency).toBe("quarterly");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.60);
  });

  it("Rule A: existing master match returns confidence 0.95", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
    ]);
    const result = detectPatternForGroup(txns, true, false);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("A");
    expect(result!.confidence).toBe(0.95);
  });

  it("user boost of 0.10 applied to confidence when userBoost=true", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
      { date: "2025-03-14", amount: 9.99 },
    ]);
    const withoutBoost = detectPatternForGroup(txns, false, false);
    const withBoost = detectPatternForGroup(txns, false, true);
    expect(withBoost).not.toBeNull();
    expect(withoutBoost).not.toBeNull();
    expect(withBoost!.confidence).toBeCloseTo(
      Math.min(1.0, withoutBoost!.confidence + 0.1),
      5
    );
  });

  it("computes correct amount statistics (avg, min, max, stddev)", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 10 },
      { date: "2025-02-15", amount: 20 },
      { date: "2025-03-15", amount: 30 },
    ]);
    // This will be Rule C (variable monthly)
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.avgAmount).toBeCloseTo(20, 1);
    expect(result!.minAmount).toBe(10);
    expect(result!.maxAmount).toBe(30);
    expect(result!.transactionCount).toBe(3);
  });

  it("returns correct firstSeenDate and lastSeenDate", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
      { date: "2025-03-15", amount: 9.99 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.firstSeenDate.getUTCMonth()).toBe(0); // January
    expect(result!.lastSeenDate.getUTCMonth()).toBe(2); // March
  });

  it("predicts a nextExpectedDate for detected patterns", () => {
    const txns = makeTxns([
      { date: "2025-01-15", amount: 9.99 },
      { date: "2025-02-15", amount: 9.99 },
      { date: "2025-03-15", amount: 9.99 },
    ]);
    const result = detectPatternForGroup(txns, false, false);
    expect(result).not.toBeNull();
    expect(result!.nextExpectedDate).not.toBeNull();
    // Should predict ~April 15
    expect(result!.nextExpectedDate!.getUTCMonth()).toBe(3); // April
  });
});
