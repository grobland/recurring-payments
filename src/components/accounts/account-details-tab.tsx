"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CreditCard, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Select import removed — linkedSourceType dropdown no longer needed
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createAccountFormSchema } from "@/lib/validations/account";
import { useUpdateAccount } from "@/lib/hooks/use-accounts";
import type { FinancialAccount, AccountType } from "@/lib/db/schema";

// Form values type — matches what react-hook-form manages in state
interface AccountFormValues {
  name: string;
  accountType: AccountType;
  institution: string;
  creditLimit: string;
  interestRate: string;
  loanTermMonths: string;
}

interface AccountDetailsTabProps {
  account: FinancialAccount;
}

const accountTypeOptions: {
  value: AccountType;
  label: string;
  Icon: typeof Building2;
}[] = [
  { value: "bank_debit", label: "Bank / Debit", Icon: Building2 },
  { value: "credit_card", label: "Credit Card", Icon: CreditCard },
  { value: "loan", label: "Loan", Icon: TrendingDown },
];

export function AccountDetailsTab({ account }: AccountDetailsTabProps) {
  const updateMutation = useUpdateAccount();

  const form = useForm<AccountFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createAccountFormSchema) as any,
    defaultValues: {
      name: account.name,
      accountType: account.accountType,
      institution: account.institution ?? "",
      // interestRate: DB stores 0.0499 → show 4.99 in form
      interestRate:
        account.interestRate != null
          ? String(parseFloat(account.interestRate) * 100)
          : "",
      creditLimit:
        account.creditLimit != null ? String(parseFloat(account.creditLimit)) : "",
      loanTermMonths:
        account.loanTermMonths != null ? String(account.loanTermMonths) : "",
    },
  });

  // Reset form when account data changes
  useEffect(() => {
    form.reset({
      name: account.name,
      accountType: account.accountType,
      institution: account.institution ?? "",
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
  }, [account, form]);

  const accountType = form.watch("accountType");

  const onSubmit = async (data: AccountFormValues) => {
    const payload = {
      name: data.name,
      accountType: data.accountType,
      institution: data.institution || null,
      creditLimit:
        data.creditLimit !== "" ? parseFloat(data.creditLimit) : null,
      interestRate:
        data.interestRate !== "" ? parseFloat(data.interestRate) : null,
      loanTermMonths:
        data.loanTermMonths !== "" ? parseInt(data.loanTermMonths, 10) : null,
    };

    try {
      await updateMutation.mutateAsync({ id: account.id, data: payload });
      toast.success("Account updated");
    } catch {
      // Error toast handled by the mutation hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type display — locked, visual only */}
            <div className="space-y-2">
              <FormLabel>Account Type</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {accountTypeOptions.map(({ value, label, Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={accountType === value ? "default" : "outline"}
                    size="sm"
                    disabled={true}
                    className="flex flex-col h-auto py-2 gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Account type cannot be changed after creation.
              </p>
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
                    <Input placeholder="Chase, Bank of America..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* linkedSourceType removed — batch uploads now link statements
                via the accountId FK directly, no manual source linking needed */}

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

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Statement count info — statements are linked via account ID at import time */}
      </CardContent>
    </Card>
  );
}
