import { describe, it, expect } from "vitest";
import {
  inferRecurringKind,
  shouldAutoLink,
  shouldCreateReviewItem,
  detectAmountChange,
  isLargeAmountChange,
} from "@/lib/services/recurrence-linker";

// ============ inferRecurringKind ============

describe("inferRecurringKind", () => {
  it("returns 'subscription' for fixed monthly entertainment merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "entertainment")).toBe(
      "subscription"
    );
  });

  it("returns 'subscription' for fixed monthly streaming merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "streaming")).toBe(
      "subscription"
    );
  });

  it("returns 'subscription' for fixed monthly software merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "software")).toBe(
      "subscription"
    );
  });

  it("returns 'subscription' for fixed monthly media merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "media")).toBe("subscription");
  });

  it("returns 'utility' for monthly variable utility-category merchant", () => {
    expect(inferRecurringKind("monthly", "variable", "utility")).toBe("utility");
  });

  it("returns 'utility' for electric category", () => {
    expect(inferRecurringKind("monthly", "variable", "electric")).toBe("utility");
  });

  it("returns 'utility' for gas category", () => {
    expect(inferRecurringKind("monthly", "variable", "gas")).toBe("utility");
  });

  it("returns 'utility' for internet category", () => {
    expect(inferRecurringKind("monthly", "variable", "internet")).toBe("utility");
  });

  it("returns 'utility' for telecom category", () => {
    expect(inferRecurringKind("monthly", "fixed", "telecom")).toBe("utility");
  });

  it("returns 'utility' for phone category", () => {
    expect(inferRecurringKind("monthly", "fixed", "phone")).toBe("utility");
  });

  it("returns 'insurance' for insurance category", () => {
    expect(inferRecurringKind("monthly", "fixed", "insurance")).toBe(
      "insurance"
    );
  });

  it("returns 'membership' for fixed monthly gym merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "gym")).toBe("membership");
  });

  it("returns 'membership' for fixed monthly fitness merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "fitness")).toBe("membership");
  });

  it("returns 'membership' for fixed monthly club merchant", () => {
    expect(inferRecurringKind("monthly", "fixed", "club")).toBe("membership");
  });

  it("returns 'loan' for monthly loan category", () => {
    expect(inferRecurringKind("monthly", "fixed", "loan")).toBe("loan");
  });

  it("returns 'rent_mortgage' for monthly mortgage category", () => {
    expect(inferRecurringKind("monthly", "fixed", "mortgage")).toBe(
      "rent_mortgage"
    );
  });

  it("returns 'rent_mortgage' for monthly rent category", () => {
    expect(inferRecurringKind("monthly", "fixed", "rent")).toBe("rent_mortgage");
  });

  it("returns 'other_recurring' for unknown category", () => {
    expect(inferRecurringKind("monthly", "fixed", null)).toBe("other_recurring");
  });

  it("returns 'other_recurring' for unrecognised category string", () => {
    expect(inferRecurringKind("yearly", "variable", "shopping")).toBe(
      "other_recurring"
    );
  });
});

// ============ shouldAutoLink ============

describe("shouldAutoLink", () => {
  it("returns true for confidence exactly 0.85", () => {
    expect(shouldAutoLink(0.85)).toBe(true);
  });

  it("returns true for confidence above 0.85", () => {
    expect(shouldAutoLink(0.95)).toBe(true);
  });

  it("returns true for confidence 1.0", () => {
    expect(shouldAutoLink(1.0)).toBe(true);
  });

  it("returns false for confidence 0.849 (just below threshold)", () => {
    expect(shouldAutoLink(0.849)).toBe(false);
  });

  it("returns false for confidence 0.80", () => {
    expect(shouldAutoLink(0.8)).toBe(false);
  });

  it("returns false for confidence 0.60", () => {
    expect(shouldAutoLink(0.6)).toBe(false);
  });

  it("returns false for confidence 0.0", () => {
    expect(shouldAutoLink(0.0)).toBe(false);
  });
});

// ============ shouldCreateReviewItem ============

describe("shouldCreateReviewItem", () => {
  it("returns true for confidence exactly 0.60", () => {
    expect(shouldCreateReviewItem(0.6)).toBe(true);
  });

  it("returns true for confidence exactly 0.84", () => {
    expect(shouldCreateReviewItem(0.84)).toBe(true);
  });

  it("returns true for mid-range confidence 0.72", () => {
    expect(shouldCreateReviewItem(0.72)).toBe(true);
  });

  it("returns false for confidence 0.599 (below range)", () => {
    expect(shouldCreateReviewItem(0.599)).toBe(false);
  });

  it("returns false for confidence 0.50", () => {
    expect(shouldCreateReviewItem(0.5)).toBe(false);
  });

  it("returns false for confidence 0.85 (auto-link threshold)", () => {
    expect(shouldCreateReviewItem(0.85)).toBe(false);
  });

  it("returns false for confidence 1.0", () => {
    expect(shouldCreateReviewItem(1.0)).toBe(false);
  });
});

// ============ detectAmountChange ============

describe("detectAmountChange", () => {
  it("returns changed=false when amounts are within 10%", () => {
    const result = detectAmountChange(105, 100);
    expect(result.changed).toBe(false);
  });

  it("returns changed=false for exact match", () => {
    const result = detectAmountChange(100, 100);
    expect(result.changed).toBe(false);
  });

  it("returns changed=false for 10% change (boundary — not strictly greater)", () => {
    const result = detectAmountChange(110, 100);
    expect(result.changed).toBe(false);
  });

  it("returns changed=true when new avg is > 10% higher than master expected", () => {
    const result = detectAmountChange(115, 100);
    expect(result.changed).toBe(true);
    expect(result.percentChange).toBeCloseTo(15, 1);
  });

  it("returns changed=true when new avg is > 10% lower than master expected", () => {
    const result = detectAmountChange(85, 100);
    expect(result.changed).toBe(true);
    expect(result.percentChange).toBeCloseTo(15, 1);
  });

  it("returns changed=false when masterExpected is null", () => {
    const result = detectAmountChange(100, null);
    expect(result.changed).toBe(false);
  });

  it("returns percentChange as absolute value", () => {
    const result = detectAmountChange(60, 100);
    expect(result.percentChange).toBeCloseTo(40, 1);
  });
});

// ============ isLargeAmountChange ============

describe("isLargeAmountChange", () => {
  it("returns true for change > 50%", () => {
    expect(isLargeAmountChange(51)).toBe(true);
  });

  it("returns true for change of 100%", () => {
    expect(isLargeAmountChange(100)).toBe(true);
  });

  it("returns false for change of exactly 50%", () => {
    expect(isLargeAmountChange(50)).toBe(false);
  });

  it("returns false for change of 49%", () => {
    expect(isLargeAmountChange(49)).toBe(false);
  });

  it("returns false for change of 0%", () => {
    expect(isLargeAmountChange(0)).toBe(false);
  });
});
