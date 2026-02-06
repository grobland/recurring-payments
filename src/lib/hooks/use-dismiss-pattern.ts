import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DismissPatternRequest } from "@/lib/validations/patterns";

interface DismissResponse {
  success: boolean;
  patternId: string;
}

/**
 * Dismiss a pattern suggestion permanently.
 */
export function useDismissPattern() {
  const queryClient = useQueryClient();

  return useMutation<DismissResponse, Error, DismissPatternRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/patterns/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to dismiss pattern");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate patterns query to remove dismissed item
      queryClient.invalidateQueries({ queryKey: ["patterns", "suggestions"] });

      toast.success("Pattern dismissed", {
        description: "This pattern will no longer be suggested.",
      });
    },
    onError: (error) => {
      toast.error("Failed to dismiss pattern", {
        description: error.message,
      });
    },
  });
}
