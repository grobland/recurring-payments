import { z } from "zod";

export const detectedSubscriptionSchema = z.object({
  name: z.string({ error: "This field is required" }).min(1),
  amount: z
    .number({ error: "Please enter a valid amount" })
    .positive(),
  currency: z.string().length(3),
  frequency: z.enum(["monthly", "yearly"]),
  confidence: z.number().min(0).max(100),
  rawText: z.string().optional(),
  transactionDate: z.string().nullable().optional(),
  dateFound: z.boolean().default(false),
});

export const confirmImportSchema = z.object({
  subscriptions: z.array(
    z.object({
      name: z
        .string({ error: "This field is required" })
        .min(1, "This field is required"),
      amount: z
        .number({ error: "Please enter a valid amount" })
        .positive("Amount must be positive"),
      currency: z.string().length(3),
      frequency: z.enum(["monthly", "yearly"]),
      categoryId: z.string().uuid().optional().nullable(),
      nextRenewalDate: z.coerce.date({
        error: "Please select a renewal date",
      }),
      action: z.enum(["create", "skip", "merge"]),
      mergeWithId: z.string().uuid().optional(), // If action is "merge"
    })
  ),
  statementSource: z
    .string({ error: "This field is required" })
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
