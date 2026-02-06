"use client";

import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PatternSuggestionItem } from "./pattern-suggestion-item";
import {
  usePatternSuggestions,
  useAcceptPattern,
  useDismissPattern,
} from "@/lib/hooks";

/**
 * Dashboard card showing detected patterns with accept/dismiss actions.
 * Only renders when patterns exist (returns null if none).
 */
export function PatternSuggestionsCard() {
  const { data, isLoading, isError } = usePatternSuggestions();
  const acceptMutation = useAcceptPattern();
  const dismissMutation = useDismissPattern();

  // Track which pattern is currently being processed
  const processingPatternId =
    acceptMutation.isPending
      ? (acceptMutation.variables as { patternId?: string })?.patternId
      : dismissMutation.isPending
      ? (dismissMutation.variables as { patternId?: string })?.patternId
      : null;

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>Pattern Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state - don't show card
  if (isError) {
    return null;
  }

  const suggestions = data?.suggestions ?? [];

  // No patterns - don't render card
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <CardTitle className="flex items-center gap-2">
          {suggestions.length} Pattern{suggestions.length > 1 ? "s" : ""}{" "}
          Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground -mt-2">
          We found recurring charges that might be subscriptions. Review and add
          them to your list.
        </p>

        {suggestions.map((pattern) => (
          <PatternSuggestionItem
            key={pattern.id}
            pattern={pattern}
            onAccept={() => acceptMutation.mutate({ patternId: pattern.id })}
            onDismiss={() => dismissMutation.mutate({ patternId: pattern.id })}
            isAccepting={
              acceptMutation.isPending && processingPatternId === pattern.id
            }
            isDismissing={
              dismissMutation.isPending && processingPatternId === pattern.id
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}
