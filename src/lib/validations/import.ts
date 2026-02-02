import { z } from "zod";

export const detectedSubscriptionSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  frequency: z.enum(["monthly", "yearly"]),
  confidence: z.number().min(0).max(100),
  rawText: z.string().optional(),
});

export const confirmImportSchema = z.object({
  subscriptions: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      amount: z.number().positive("Amount must be positive"),
      currency: z.string().length(3),
      frequency: z.enum(["monthly", "yearly"]),
      categoryId: z.string().uuid().optional().nullable(),
      nextRenewalDate: z.coerce.date(),
      action: z.enum(["create", "skip", "merge"]),
      mergeWithId: z.string().uuid().optional(), // If action is "merge"
    })
  ),
  statementSource: z
    .string()
    .min(1, "Account name is required")
    .max(50, "Account name must be 50 characters or less")
    .trim(),
  rawExtractionData: z.object({
    subscriptions: z.array(detectedSubscriptionSchema),
    model: z.string(),
    processingTime: z.number(),
    pageCount: z.number(),
    extractedAt: z.string(),
  }).optional(),
});

export type DetectedSubscription = z.infer<typeof detectedSubscriptionSchema>;
export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;
