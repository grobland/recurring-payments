"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CreditCard, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { createAccountFormSchema } from "@/lib/validations/account";
import {
  useCreateAccount,
  useUpdateAccount,
  useAccounts,
} from "@/lib/hooks/use-accounts";
import { useSources } from "@/lib/hooks/use-sources";
import type { FinancialAccount, AccountType } from "@/lib/db/schema";

// Form values type — matches what react-hook-form manages in state
interface AccountFormValues {
  name: string;
  accountType: AccountType;
  institution: string;
  linkedSourceType: string;
  creditLimit: string;
  interestRate: string;
  loanTermMonths: string;
}

interface AccountFormProps {
  account?: FinancialAccount | null;
  isOpen: boolean;
  onClose: () => void;
  defaultAccountType?: AccountType;
}

export function AccountForm({
  account,
  isOpen,
  onClose,
  defaultAccountType,
}: AccountFormProps) {
  const isEditMode = !!account;

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const { data: sourcesData } = useSources();
  const { data: accountsData } = useAccounts();

  const sources = sourcesData?.sources ?? [];
  const allAccounts = accountsData?.accounts ?? [];

  const form = useForm<AccountFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createAccountFormSchema) as any,
    defaultValues: {
      name: "",
      accountType: defaultAccountType ?? "bank_debit",
      institution: "",
      linkedSourceType: "",
      creditLimit: "",
      interestRate: "",
      loanTermMonths: "",
    },
  });

  // When editing, populate the form with existing account data
  useEffect(() => {
    if (isOpen && account) {
      form.reset({
        name: account.name,
        accountType: account.accountType,
        institution: account.institution ?? "",
        linkedSourceType: account.linkedSourceType ?? "",
        // interestRate: DB stores 0.0499 → show 4.99 in form
        interestRate:
          account.interestRate != null
            ? String(parseFloat(account.interestRate) * 100)
            : "",
        creditLimit:
          account.creditLimit != null ? String(parseFloat(account.creditLimit)) : "",
        loanTermMonths:
          account.loanTermMonths != null ? String(account.loanTermMonths) : "",
      });
    } else if (isOpen && !account) {
      form.reset({
        name: "",
        accountType: defaultAccountType ?? "bank_debit",
        institution: "",
        linkedSourceType: "",
        creditLimit: "",
        interestRate: "",
        loanTermMonths: "",
      });
    }
  }, [isOpen, account, defaultAccountType, form]);

  const accountType = form.watch("accountType");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      onClose();
    }
  };

  const onSubmit = async (data: AccountFormValues) => {
    // Build the payload to send to the API / mutation
    const payload = {
      name: data.name,
      accountType: data.accountType,
      institution: data.institution || null,
      linkedSourceType: data.linkedSourceType || null,
      creditLimit:
        data.creditLimit !== "" ? parseFloat(data.creditLimit) : null,
      interestRate:
        data.interestRate !== "" ? parseFloat(data.interestRate) : null,
      loanTermMonths:
        data.loanTermMonths !== "" ? parseInt(data.loanTermMonths, 10) : null,
    };

    try {
      if (isEditMode && account) {
        await updateMutation.mutateAsync({ id: account.id, data: payload });
        toast.success("Account updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Account created");
      }
      onClose();
    } catch {
      // Error toast handled by the mutation hooks
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const accountTypeOptions: {
    value: AccountType;
    label: string;
    Icon: typeof Building2;
  }[] = [
    { value: "bank_debit", label: "Bank / Debit", Icon: Building2 },
    { value: "credit_card", label: "Credit Card", Icon: CreditCard },
    { value: "loan", label: "Loan", Icon: TrendingDown },
  ];

  // Build a map of sourceType -> account name for already-linked sources
  const linkedSourceMap = new Map<string, string>();
  for (const acc of allAccounts) {
    if (acc.linkedSourceType && acc.id !== account?.id) {
      linkedSourceMap.set(acc.linkedSourceType, acc.name);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Account" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your account details. Account type cannot be changed."
              : "Add a new financial account to organize your statements."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selector */}
            <div className="space-y-2">
              <FormLabel>Account Type</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {accountTypeOptions.map(({ value, label, Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={accountType === value ? "default" : "outline"}
                    size="sm"
                    disabled={isEditMode}
                    onClick={() => form.setValue("accountType", value)}
                    className="flex flex-col h-auto py-2 gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Account Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Checking Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Institution */}
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Chase, Bank of America..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source Linking */}
            <FormField
              control={form.control}
              name="linkedSourceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Statement Source (optional)</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? "" : val)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {sources.map((source) => {
                        const alreadyLinkedTo = linkedSourceMap.get(
                          source.sourceType
                        );
                        return (
                          <SelectItem
                            key={source.sourceType}
                            value={source.sourceType}
                          >
                            {source.sourceType}
                            {alreadyLinkedTo
                              ? ` (linked to ${alreadyLinkedTo})`
                              : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credit Card fields */}
            {accountType === "credit_card" && (
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="5000.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Loan fields */}
            {accountType === "loan" && (
              <>
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="4.99"
                            className="pr-8"
                            {...field}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loanTermMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Term (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="360"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                  ? "Save Changes"
                  : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
