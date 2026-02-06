import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AcceptPatternRequest } from "@/lib/validations/patterns";

interface AcceptResponse {
  success: boolean;
  subscription: {
    id: string;
    name: string;
  };
  patternId: string;
}

/**
 * Accept a pattern suggestion and create a subscription.
 * Shows success toast with 10-second undo option.
 */
export function useAcceptPattern() {
  const queryClient = useQueryClient();

  return useMutation<AcceptResponse, Error, AcceptPatternRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/patterns/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept pattern");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["patterns", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      // Show success toast with undo action
      toast.success("Subscription created from pattern", {
        description: `${data.subscription.name} has been added to your subscriptions.`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const undoResponse = await fetch("/api/patterns/accept", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patternId: data.patternId }),
              });

              if (!undoResponse.ok) {
                throw new Error("Failed to undo");
              }

              // Invalidate queries after undo
              queryClient.invalidateQueries({ queryKey: ["patterns", "suggestions"] });
              queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
              queryClient.invalidateQueries({ queryKey: ["analytics"] });

              toast.success("Subscription removed", {
                description: "Pattern acceptance has been undone.",
              });
            } catch {
              toast.error("Failed to undo", {
                description: "Could not remove the subscription.",
              });
            }
          },
        },
        duration: 10000, // 10-second undo window
      });
    },
    onError: (error) => {
      toast.error("Failed to accept pattern", {
        description: error.message,
      });
    },
  });
}
