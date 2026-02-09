import { useQuery } from "@tanstack/react-query";
import type { PatternSuggestion } from "@/lib/validations/patterns";

interface SuggestionsResponse {
  suggestions: PatternSuggestion[];
}

/**
 * Query key factory for pattern-related queries.
 * Used for cache invalidation across pattern mutations.
 */
export const patternKeys = {
  all: ["patterns"] as const,
  lists: () => [...patternKeys.all, "list"] as const,
  suggestions: () => [...patternKeys.all, "suggestions"] as const,
};

/**
 * Fetch active pattern suggestions for the current user.
 * Returns patterns with confidence >= 70% that are not dismissed or accepted.
 */
export function usePatternSuggestions() {
  return useQuery<SuggestionsResponse>({
    queryKey: patternKeys.suggestions(),
    queryFn: async () => {
      const response = await fetch("/api/patterns/suggestions");
      if (!response.ok) {
        throw new Error("Failed to fetch pattern suggestions");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
