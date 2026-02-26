import { z } from "zod";

// NOTE on interestRate convention:
// The form accepts a percentage value (e.g. 4.99 for 4.99%).
// The API handler divides by 100 before storing so the DB column (decimal(5,4)) holds 0.0499.
// This schema validates the percentage range 0–100.

export const createAccountFormSchema = z
  .object({
    name: z.string().min(1, "Account name is required").max(100),
    accountType: z.enum(["bank_debit", "credit_card", "loan"]),
    institution: z
      .string()
      .max(100)
      .optional()
      .nullable()
      .transform((v) => v || null),
    linkedSourceType: z
      .string()
      .max(100)
      .optional()
      .nullable()
      .transform((v) => v || null),
    creditLimit: z.coerce
      .number()
      .positive("Credit limit must be positive")
      .optional()
      .nullable(),
    interestRate: z.coerce
      .number()
      .min(0, "Interest rate cannot be negative")
      .max(100, "Interest rate cannot exceed 100%")
      .optional()
      .nullable(),
    loanTermMonths: z.coerce
      .number()
      .int("Loan term must be a whole number")
      .positive("Loan term must be positive")
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "credit_card") {
      if (data.creditLimit == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Credit limit is required for credit card accounts",
          path: ["creditLimit"],
        });
      }
    }

    if (data.accountType === "loan") {
      if (data.interestRate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Interest rate is required for loan accounts",
          path: ["interestRate"],
        });
      }
      if (data.loanTermMonths == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Loan term is required for loan accounts",
          path: ["loanTermMonths"],
        });
      }
    }
  });

// createAccountSchema is the same as createAccountFormSchema —
// z.coerce handles string-to-number for API body values too.
export const createAccountSchema = createAccountFormSchema;

// updateAccountSchema allows partial updates.
// Note: accountType is stripped by the PATCH handler before applying (type is locked after creation).
export const updateAccountSchema = createAccountFormSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
