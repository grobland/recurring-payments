"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addMonths } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currencies";
import { FREQUENCIES } from "@/lib/constants/frequencies";
import { CategoryCombobox } from "@/components/categories/category-combobox";
import { useCategoryOptions } from "@/lib/hooks";
import { toast } from "sonner";
import { z } from "zod";
import type { StatementTransaction } from "@/types/source";

interface ReimportWizardProps {
  transactionIds: string[];
  onComplete: () => void;
  onCancel: () => void;
}

// Simplified form schema for import
const importFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1),
  frequency: z.enum(["monthly", "yearly"]),
  nextRenewalDate: z.date(),
  categoryId: z.string().nullable(),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

type WizardState = {
  queue: string[];
  currentIndex: number;
  completed: number;
  skipped: number;
};

/**
 * Re-import wizard for converting transactions to subscriptions.
 * Processes transactions one at a time with pre-filled forms.
 */
export function ReimportWizard({
  transactionIds,
  onComplete,
  onCancel,
}: ReimportWizardProps) {
  const [state, setState] = useState<WizardState>({
    queue: transactionIds,
    currentIndex: 0,
    completed: 0,
    skipped: 0,
  });
  const [currentTransaction, setCurrentTransaction] =
    useState<StatementTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { options: categoryOptions, isLoading: categoriesLoading } =
    useCategoryOptions();

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      name: "",
      amount: 0,
      currency: "USD",
      frequency: "monthly",
      nextRenewalDate: new Date(),
      categoryId: null,
    },
  });

  const currentId = state.queue[state.currentIndex];
  const isFinished = state.currentIndex >= state.queue.length;
  const progress = isFinished
    ? 100
    : Math.round((state.currentIndex / state.queue.length) * 100);

  // Fetch current transaction data
  const fetchTransaction = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      // Fetch from the transactions API (inline GET)
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      const data = await response.json();
      setCurrentTransaction(data.transaction);
    } catch (error) {
      console.error("Fetch transaction error:", error);
      toast.error("Failed to load transaction");
      setCurrentTransaction(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch transaction when index changes
  useEffect(() => {
    if (currentId && !isFinished) {
      fetchTransaction(currentId);
    }
  }, [currentId, isFinished, fetchTransaction]);

  // Pre-fill form when transaction loads
  useEffect(() => {
    if (currentTransaction) {
      const nextDate = addMonths(
        new Date(currentTransaction.transactionDate),
        1
      );
      form.reset({
        name: currentTransaction.merchantName,
        amount: parseFloat(currentTransaction.amount),
        currency: currentTransaction.currency,
        frequency: "monthly",
        nextRenewalDate: nextDate,
        categoryId: null,
      });
    }
  }, [currentTransaction, form]);

  // Handle form submit (convert transaction)
  const handleSubmit = async (values: ImportFormValues) => {
    if (!currentId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${currentId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          amount: values.amount,
          currency: values.currency,
          frequency: values.frequency,
          nextRenewalDate: values.nextRenewalDate.toISOString(),
          categoryId: values.categoryId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to convert transaction");
      }

      toast.success(`Created subscription: ${values.name}`);

      // Move to next transaction
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        completed: prev.completed + 1,
      }));
    } catch (error) {
      console.error("Convert error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create subscription"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle skip (mark as not_subscription)
  const handleSkip = async () => {
    if (!currentId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${currentId}/skip`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to skip transaction");
      }

      // Move to next transaction
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        skipped: prev.skipped + 1,
      }));
    } catch (error) {
      console.error("Skip error:", error);
      toast.error("Failed to skip transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (state.currentIndex > 0) {
      // Mid-process, show confirmation
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  // Finished state
  if (isFinished) {
    return (
      <Dialog open={true} onOpenChange={() => onComplete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Complete</DialogTitle>
            <DialogDescription>
              Successfully processed {state.queue.length} transaction
              {state.queue.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Converted to subscriptions:</span>
              <span className="font-medium text-green-600">
                {state.completed}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Skipped:</span>
              <span className="font-medium text-yellow-600">{state.skipped}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onComplete}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Importing {state.currentIndex + 1} of {state.queue.length}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={progress} className="mt-2" />
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading transaction...
            </div>
          ) : currentTransaction ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                {/* Transaction info preview */}
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div className="font-medium">
                    {currentTransaction.merchantName}
                  </div>
                  <div className="text-muted-foreground">
                    {format(
                      new Date(currentTransaction.transactionDate),
                      "MMM d, yyyy"
                    )}{" "}
                    &bull; {currentTransaction.currency}{" "}
                    {parseFloat(currentTransaction.amount).toFixed(2)}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nextRenewalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Next Renewal Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (optional)</FormLabel>
                      <FormControl>
                        <CategoryCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={categoryOptions}
                          disabled={categoriesLoading}
                          placeholder="Select a category"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                  >
                    Skip
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save & Continue"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="py-8 text-center text-destructive">
              Failed to load transaction
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel import?</AlertDialogTitle>
            <AlertDialogDescription>
              You've already imported {state.completed} subscription
              {state.completed !== 1 ? "s" : ""}. The remaining{" "}
              {state.queue.length - state.currentIndex} transaction
              {state.queue.length - state.currentIndex !== 1 ? "s" : ""} will
              not be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Importing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              Cancel Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
