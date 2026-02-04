import { z } from "zod";

export const subscriptionStatusEnum = z.enum(["active", "paused", "cancelled"]);
export const frequencyEnum = z.enum(["monthly", "yearly"]);

// Form schema (for react-hook-form with type-safe fields)
export const createSubscriptionFormSchema = z.object({
  name: z
    .string({ error: "This field is required" })
    .min(1, "This field is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  url: z.string().url("Please enter a valid URL").optional().nullable().or(z.literal("")),
  categoryId: z.string().uuid("Invalid category").optional().nullable(),
  amount: z
    .number({ error: "Please enter a valid amount" })
    .positive("Amount must be positive")
    .max(999999.99, "Amount is too large"),
  currency: z
    .string({ error: "Please select a currency" })
    .length(3, "Currency code must be 3 characters"),
  frequency: z.enum(["monthly", "yearly"], {
    error: "Please select a frequency",
  }),
  nextRenewalDate: z.date({
    error: "Please select a renewal date",
  }),
  startDate: z.date().optional().nullable(),
  status: subscriptionStatusEnum,
  reminderEnabled: z.boolean(),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).optional().nullable(),
});

// API schema (with coercion for form data)
export const createSubscriptionSchema = z.object({
  name: z
    .string({ error: "This field is required" })
    .min(1, "This field is required")
    .max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  url: z.string().url("Please enter a valid URL").optional().nullable().or(z.literal("")),
  categoryId: z.string().uuid("Invalid category").optional().nullable(),
  amount: z.coerce
    .number({ error: "Please enter a valid amount" })
    .positive("Amount must be positive")
    .max(999999.99, "Amount is too large"),
  currency: z
    .string({ error: "Please select a currency" })
    .length(3, "Currency code must be 3 characters"),
  frequency: z.enum(["monthly", "yearly"], {
    error: "Please select a frequency",
  }),
  nextRenewalDate: z.coerce.date({
    error: "Please select a renewal date",
  }),
  startDate: z.coerce.date().optional().nullable(),
  status: subscriptionStatusEnum.default("active"),
  reminderEnabled: z.boolean().default(true),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).optional().nullable(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

export const subscriptionFiltersSchema = z.object({
  search: z.string().optional(),
  status: subscriptionStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  frequency: frequencyEnum.optional(),
  sortBy: z.enum(["name", "amount", "nextRenewalDate", "createdAt"]).default("nextRenewalDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeDeleted: z.coerce.boolean().default(false),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionFormSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type SubscriptionFilters = z.infer<typeof subscriptionFiltersSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type Frequency = z.infer<typeof frequencyEnum>;
