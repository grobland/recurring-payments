import { describe, it, expect } from "vitest";
import { computeOverlapGroups } from "@/lib/hooks/use-overlap-groups";

// Helper to create a minimal subscription-like object
function makeSub(id: string, status: string, categoryId: string | null) {
  return { id, status, categoryId };
}

describe("computeOverlapGroups", () => {
  it("returns empty Map for empty array", () => {
    const result = computeOverlapGroups([]);
    expect(result.size).toBe(0);
  });

  it("returns empty Map for a single active categorized subscription", () => {
    const subs = [makeSub("sub1", "active", "cat-A")];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(0);
  });

  it("returns group when 2 active subscriptions share the same categoryId", () => {
    const subs = [
      makeSub("sub1", "active", "cat-A"),
      makeSub("sub2", "active", "cat-A"),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(1);
    expect(result.has("cat-A")).toBe(true);
    expect(result.get("cat-A")).toEqual(expect.arrayContaining(["sub1", "sub2"]));
    expect(result.get("cat-A")?.length).toBe(2);
  });

  it("returns empty Map when one subscription is paused", () => {
    const subs = [
      makeSub("sub1", "active", "cat-A"),
      makeSub("sub2", "paused", "cat-A"),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(0);
  });

  it("returns empty Map when one subscription is cancelled", () => {
    const subs = [
      makeSub("sub1", "active", "cat-A"),
      makeSub("sub2", "cancelled", "cat-A"),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(0);
  });

  it("returns empty Map for uncategorized subscriptions (null categoryId)", () => {
    const subs = [
      makeSub("sub1", "active", null),
      makeSub("sub2", "active", null),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(0);
  });

  it("returns 2 groups when 4 active subscriptions form 2 category pairs", () => {
    const subs = [
      makeSub("sub1", "active", "cat-A"),
      makeSub("sub2", "active", "cat-A"),
      makeSub("sub3", "active", "cat-B"),
      makeSub("sub4", "active", "cat-B"),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(2);
    expect(result.has("cat-A")).toBe(true);
    expect(result.has("cat-B")).toBe(true);
    expect(result.get("cat-A")).toEqual(expect.arrayContaining(["sub1", "sub2"]));
    expect(result.get("cat-B")).toEqual(expect.arrayContaining(["sub3", "sub4"]));
  });

  it("does not include groups with only 1 active member even if others exist in different categories", () => {
    const subs = [
      makeSub("sub1", "active", "cat-A"),
      makeSub("sub2", "active", "cat-B"),
      makeSub("sub3", "active", "cat-B"),
    ];
    const result = computeOverlapGroups(subs);
    expect(result.size).toBe(1);
    expect(result.has("cat-A")).toBe(false);
    expect(result.has("cat-B")).toBe(true);
  });
});
