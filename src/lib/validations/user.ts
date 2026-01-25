import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  displayCurrency: z.string().length(3, "Currency code must be 3 characters").optional(),
  locale: z.string().min(2).max(10).optional(),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).optional(),
  emailRemindersEnabled: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account"),
  confirmation: z
    .string()
    .refine((val) => val === "DELETE", {
      message: "Please type DELETE to confirm",
    }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
