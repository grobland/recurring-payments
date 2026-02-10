"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTagSchema, type CreateTagInput } from "@/lib/validations/tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];

interface TagFormProps {
  defaultValues?: Partial<CreateTagInput>;
  onSubmit: (data: CreateTagInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function TagForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
}: TagFormProps) {
  const form = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: {
      name: "",
      color: "#3B82F6",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: CreateTagInput) => {
    await onSubmit(data);
  };

  const watchedColor = form.watch("color");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Recurring"
                  maxLength={50}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="#3B82F6"
                    {...field}
                    className="flex-1"
                  />
                </FormControl>
                <div
                  className="w-10 h-10 rounded-md border shrink-0"
                  style={{ backgroundColor: watchedColor }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: watchedColor === color ? "white" : "transparent",
                      boxShadow: watchedColor === color ? `0 0 0 2px ${color}` : "none",
                    }}
                    onClick={() => form.setValue("color", color, { shouldValidate: true })}
                    disabled={isSubmitting}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
