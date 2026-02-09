import { z } from "zod";

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .transform((val) => val.trim()),
  color: z
    .string()
    .length(7, "Color must be a valid hex color (e.g., #3B82F6)")
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #3B82F6)"),
});

export const updateTagSchema = createTagSchema.partial();

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
