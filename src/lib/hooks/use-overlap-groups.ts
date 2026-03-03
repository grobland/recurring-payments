import { useMemo } from "react";

export type OverlapGroup = {
  categoryId: string;
  subscriptionIds: string[];
};

/**
 * Pure function: computes overlap groups from a subscription array.
 * A group forms when 2+ active (non-paused, non-cancelled), categorized
 * subscriptions share the same categoryId.
 *
 * @returns Map<categoryId, subscriptionIds[]> — only entries with 2+ members
 */
export function computeOverlapGroups(
  subscriptions: Array<{
    id: string;
    categoryId: string | null;
    status: string;
  }>
): Map<string, string[]> {
  // Step 1: Filter to only active, categorized subscriptions
  const eligible = subscriptions.filter(
    (sub) => sub.status === "active" && sub.categoryId !== null
  );

  // Step 2: Group by categoryId
  const grouped = new Map<string, string[]>();
  for (const sub of eligible) {
    const catId = sub.categoryId as string;
    if (!grouped.has(catId)) {
      grouped.set(catId, []);
    }
    grouped.get(catId)!.push(sub.id);
  }

  // Step 3: Return only groups with 2+ members
  const result = new Map<string, string[]>();
  for (const [catId, ids] of grouped.entries()) {
    if (ids.length >= 2) {
      result.set(catId, ids);
    }
  }

  return result;
}

/**
 * React hook: memoized wrapper around computeOverlapGroups.
 * Takes an array of subscriptions and returns a Map of overlap groups.
 */
export function useOverlapGroups(
  subscriptions: Array<{
    id: string;
    categoryId: string | null;
    status: string;
  }>
): Map<string, string[]> {
  return useMemo(
    () => computeOverlapGroups(subscriptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscriptions]
  );
}
