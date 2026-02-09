"use client";

import { useState, useEffect } from "react";

/**
 * Debounce a value at the state level.
 * Use this to debounce query keys for TanStack Query, not the queryFn.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchInput, setSearchInput] = useState('')
 * const debouncedSearch = useDebouncedValue(searchInput, 300)
 *
 * // Query only fires when debouncedSearch changes
 * const { data } = useQuery({
 *   queryKey: ['items', debouncedSearch],
 *   queryFn: () => fetchItems(debouncedSearch),
 * })
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
