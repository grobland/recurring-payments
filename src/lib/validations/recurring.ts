import { z } from "zod";

// ============ Transaction Label Schema ============

export const labelTransactionSchema = z.object({
  label: z.enum(["recurring", "not_recurring", "ignore"]),
  notes: z.string().optional(),
});

// ============ Series Action Schemas ============

export const confirmSeriesSchema = z.object({
  name: z.string().min(1).max(255),
  recurringKind: z.enum([
    "subscription",
    "utility",
    "insurance",
    "loan",
    "rent_mortgage",
    "membership",
    "installment",
    "other_recurring",
  ]),
  existingMasterId: z.string().uuid().optional(),
});

export const resolveReviewSchema = z.object({
  resolution: z.enum(["confirmed", "ignored", "linked", "not_recurring"]),
  targetMasterId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// ============ Recurring Master Schemas ============

export const createMasterSchema = z.object({
  name: z.string().min(1).max(255),
  recurringKind: z.enum([
    "subscription",
    "utility",
    "insurance",
    "loan",
    "rent_mortgage",
    "membership",
    "installment",
    "other_recurring",
  ]),
  description: z.string().optional(),
  currency: z.string().length(3).toUpperCase(),
  expectedAmount: z.coerce.number().positive().optional(),
  billingFrequency: z
    .enum(["monthly", "yearly", "weekly", "quarterly", "custom"])
    .optional(),
  billingDayOfMonth: z.number().int().min(1).max(31).optional(),
  importanceRating: z.number().int().min(1).max(5).optional(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
});

export const updateMasterSchema = createMasterSchema.partial();

// ============ Merge & Status Schemas ============

export const mergeSchema = z.object({
  mergeIntoId: z.string().uuid(),
});

export const statusChangeSchema = z.object({
  status: z.enum(["active", "paused", "cancelled", "dormant", "needs_review"]),
});

// ============ Inferred Types ============

export type LabelTransactionInput = z.infer<typeof labelTransactionSchema>;
export type ConfirmSeriesInput = z.infer<typeof confirmSeriesSchema>;
export type ResolveReviewInput = z.infer<typeof resolveReviewSchema>;
export type CreateMasterInput = z.infer<typeof createMasterSchema>;
export type UpdateMasterInput = z.infer<typeof updateMasterSchema>;
export type MergeInput = z.infer<typeof mergeSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
