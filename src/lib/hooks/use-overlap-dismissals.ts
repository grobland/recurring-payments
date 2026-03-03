import { useState, useEffect } from "react";

const STORAGE_KEY = "overlap_dismissals";

/**
 * Reads the dismissals record from localStorage.
 * Returns a Record<categoryId, groupSignature> or {} on error.
 */
function readDismissals(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Writes the dismissals record to localStorage.
 */
function writeDismissals(dismissals: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissals));
  } catch {
    // Silently ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Computes a stable group signature from a list of subscription IDs.
 * Signature is: sorted(subscriptionIds).join(",")
 */
function computeSignature(subscriptionIds: string[]): string {
  return [...subscriptionIds].sort().join(",");
}

/**
 * Hook: localStorage-backed dismissal state for overlap groups.
 *
 * - isDismissed(categoryId): returns true only when the group has been dismissed
 *   AND its current membership matches the stored signature. Returns false if
 *   the group was never dismissed, no longer exists, or its members have changed
 *   (re-surface on membership change — OVRLP-03).
 *
 * - dismiss(categoryId): records current group signature in localStorage and
 *   triggers a re-render so the badge hides immediately.
 *
 * @param overlapGroups — Map<categoryId, subscriptionIds[]> from useOverlapGroups
 */
export function useOverlapDismissals(overlapGroups: Map<string, string[]>): {
  isDismissed: (categoryId: string) => boolean;
  dismiss: (categoryId: string) => void;
} {
  // Initialize state from localStorage on mount (lazy initializer)
  const [dismissals, setDismissals] = useState<Record<string, string>>(() =>
    readDismissals()
  );

  // Cleanup: remove stored keys for categories whose overlap group has dissolved
  useEffect(() => {
    const stored = readDismissals();
    const staleCategoryIds = Object.keys(stored).filter(
      (catId) => !overlapGroups.has(catId)
    );
    if (staleCategoryIds.length === 0) return;

    const cleaned = { ...stored };
    for (const catId of staleCategoryIds) {
      delete cleaned[catId];
    }
    writeDismissals(cleaned);
    setDismissals(cleaned);
  }, [overlapGroups]);

  const isDismissed = (categoryId: string): boolean => {
    // If not in state, not dismissed
    const storedSignature = dismissals[categoryId];
    if (storedSignature === undefined) return false;

    // Get the current group members
    const currentIds = overlapGroups.get(categoryId);
    if (!currentIds) {
      // Group no longer exists — stale entry, treat as not dismissed
      return false;
    }

    // Re-surface if group membership has changed
    const currentSignature = computeSignature(currentIds);
    return storedSignature === currentSignature;
  };

  const dismiss = (categoryId: string): void => {
    const currentIds = overlapGroups.get(categoryId);
    if (!currentIds) return; // Group doesn't exist, nothing to dismiss

    const signature = computeSignature(currentIds);

    // Update localStorage
    const existing = readDismissals();
    const updated = { ...existing, [categoryId]: signature };
    writeDismissals(updated);

    // Update React state to trigger re-render (badge hides immediately)
    setDismissals(updated);
  };

  return { isDismissed, dismiss };
}
