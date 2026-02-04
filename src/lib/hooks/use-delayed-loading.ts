import { useState, useEffect, useRef } from "react";

interface UseDelayedLoadingOptions {
  delayMs?: number; // Time before showing skeleton (default: 200)
  minDisplayMs?: number; // Minimum time to show skeleton (default: 300)
}

export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {}
) {
  const { delayMs = 200, minDisplayMs = 300 } = options;
  const [showSkeleton, setShowSkeleton] = useState(false);
  const loadingStartRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading - set up delay before showing skeleton
      loadingStartRef.current = Date.now();
      delayTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delayMs);
    } else {
      // Loading finished - clear delay timeout if skeleton not shown yet
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }

      // If skeleton was shown, ensure minimum display time
      if (showSkeleton && loadingStartRef.current) {
        const elapsed = Date.now() - loadingStartRef.current;
        const remaining = Math.max(0, minDisplayMs - elapsed + delayMs);

        if (remaining > 0) {
          setTimeout(() => setShowSkeleton(false), remaining);
        } else {
          setShowSkeleton(false);
        }
      }
      loadingStartRef.current = null;
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [isLoading, delayMs, minDisplayMs, showSkeleton]);

  return showSkeleton;
}
