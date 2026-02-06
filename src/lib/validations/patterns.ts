import { z } from "zod";

/**
 * Schema for pattern detection request
 */
export const detectPatternsSchema = z.object({
  // Optional: limit detection to specific time window
  monthsBack: z.number().min(1).max(24).default(12),
});

/**
 * Schema for pattern suggestion response
 */
export const patternSuggestionSchema = z.object({
  id: z.string().uuid(),
  merchantName: z.string(),
  currency: z.string(),
  avgAmount: z.number(),
  occurrenceCount: z.number(),
  confidenceScore: z.number().min(0).max(100),
  detectedFrequency: z.enum(["monthly", "yearly"]).nullable(),
  chargeDates: z.array(z.string()),
  amounts: z.array(z.number()),
  avgIntervalDays: z.number().nullable(),
  suggestedCategoryId: z.string().uuid().nullable(),
  detectedAt: z.string(),
});

export type PatternSuggestion = z.infer<typeof patternSuggestionSchema>;

/**
 * Schema for accept pattern request
 */
export const acceptPatternSchema = z.object({
  patternId: z.string().uuid(),
  // Optional overrides for subscription creation
  name: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["monthly", "yearly"]).optional(),
});

export type AcceptPatternRequest = z.infer<typeof acceptPatternSchema>;

/**
 * Schema for dismiss pattern request
 */
export const dismissPatternSchema = z.object({
  patternId: z.string().uuid(),
});

export type DismissPatternRequest = z.infer<typeof dismissPatternSchema>;

/**
 * Schema for undo accept request
 */
export const undoAcceptSchema = z.object({
  patternId: z.string().uuid(),
});

export type UndoAcceptRequest = z.infer<typeof undoAcceptSchema>;
