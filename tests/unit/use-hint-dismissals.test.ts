import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHintDismissals } from "@/lib/hooks/use-hint-dismissals";

const STORAGE_KEY = "onboarding_hints";

describe("useHintDismissals", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("isDismissed returns false when nothing is stored", () => {
    const { result } = renderHook(() => useHintDismissals());
    expect(result.current.isDismissed("subscriptions")).toBe(false);
  });

  it("isDismissed returns false for a different key when only one is stored", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscriptions: true }));
    const { result } = renderHook(() => useHintDismissals());
    expect(result.current.isDismissed("vault")).toBe(false);
  });

  it("isDismissed returns true after dismiss is called", () => {
    const { result } = renderHook(() => useHintDismissals());

    act(() => {
      result.current.dismiss("subscriptions");
    });

    expect(result.current.isDismissed("subscriptions")).toBe(true);
  });

  it("dismiss writes { subscriptions: true } to localStorage under 'onboarding_hints' key", () => {
    const { result } = renderHook(() => useHintDismissals());

    act(() => {
      result.current.dismiss("subscriptions");
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({ subscriptions: true });
  });

  it("multiple dismissals accumulate: dismiss('subscriptions') then dismiss('vault') stores both", () => {
    const { result } = renderHook(() => useHintDismissals());

    act(() => {
      result.current.dismiss("subscriptions");
    });

    act(() => {
      result.current.dismiss("vault");
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({ subscriptions: true, vault: true });
    expect(result.current.isDismissed("subscriptions")).toBe(true);
    expect(result.current.isDismissed("vault")).toBe(true);
  });

  it("isDismissed returns true across re-reads (persistence)", () => {
    // Pre-populate localStorage to simulate a page refresh
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ subscriptions: true, dashboard: true })
    );

    const { result } = renderHook(() => useHintDismissals());

    expect(result.current.isDismissed("subscriptions")).toBe(true);
    expect(result.current.isDismissed("dashboard")).toBe(true);
    expect(result.current.isDismissed("vault")).toBe(false);
  });

  it("hook returns { isDismissed, dismiss } tuple", () => {
    const { result } = renderHook(() => useHintDismissals());

    expect(typeof result.current.isDismissed).toBe("function");
    expect(typeof result.current.dismiss).toBe("function");
  });

  it("handles invalid JSON in localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    const { result } = renderHook(() => useHintDismissals());

    // Should not throw, should return false
    expect(result.current.isDismissed("subscriptions")).toBe(false);
  });

  it("handles empty localStorage gracefully", () => {
    // localStorage is clear (from beforeEach)
    const { result } = renderHook(() => useHintDismissals());
    expect(result.current.isDismissed("subscriptions")).toBe(false);
  });
});
