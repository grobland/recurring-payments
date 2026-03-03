import { useState } from "react";

const STORAGE_KEY = "onboarding_hints";

/**
 * Reads the hint dismissals record from localStorage.
 * Returns a Record<pageId, boolean> or {} on error.
 */
function readHintDismissals(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

/**
 * Writes the hint dismissals record to localStorage.
 */
function writeHintDismissals(dismissals: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissals));
  } catch {
    // Silently ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Hook: localStorage-backed permanent dismissal state for onboarding hints.
 *
 * - isDismissed(pageId): returns true when the page hint has been dismissed.
 *   Dismissal is permanent — once dismissed, hints never reappear even if
 *   data goes back to zero.
 *
 * - dismiss(pageId): records the dismissal in localStorage and triggers a
 *   re-render so the hint hides immediately.
 *
 * localStorage schema: "onboarding_hints" key stores JSON Record<pageId, boolean>
 * Example: { "subscriptions": true, "vault": true, "dashboard": true }
 */
export function useHintDismissals(): {
  isDismissed: (pageId: string) => boolean;
  dismiss: (pageId: string) => void;
} {
  // Initialize state from localStorage on mount (lazy initializer)
  const [dismissals, setDismissals] = useState<Record<string, boolean>>(() =>
    readHintDismissals()
  );

  const isDismissed = (pageId: string): boolean => {
    return !!dismissals[pageId];
  };

  const dismiss = (pageId: string): void => {
    // Read current state from localStorage, merge new dismissal, write back
    const existing = readHintDismissals();
    const updated = { ...existing, [pageId]: true };
    writeHintDismissals(updated);

    // Update React state to trigger re-render (hint hides immediately)
    setDismissals(updated);
  };

  return { isDismissed, dismiss };
}
