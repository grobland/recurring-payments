"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Building2, CreditCard, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AccountForm } from "./account-form";
import { AccountDeleteDialog } from "./account-delete-dialog";
import { useDeleteFinancialAccount } from "@/lib/hooks/use-accounts";
import type { FinancialAccount } from "@/lib/db/schema";

// Type label + icon maps (same as AccountCard)
const ACCOUNT_TYPE_LABELS = {
  bank_debit: "Bank / Debit",
  credit_card: "Credit Card",
  loan: "Loan",
} as const;

const ACCOUNT_TYPE_ICONS = {
  bank_debit: Building2,
  credit_card: CreditCard,
  loan: TrendingDown,
} as const;

interface AccountDetailHeaderProps {
  account: FinancialAccount;
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteFinancialAccount();

  const Icon = ACCOUNT_TYPE_ICONS[account.accountType];

  // Key stat for subtitle
  let keyStat: string | null = null;
  if (account.accountType === "credit_card" && account.creditLimit != null) {
    keyStat = `Limit: $${parseFloat(account.creditLimit).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  } else if (account.accountType === "loan" && account.interestRate != null) {
    keyStat = `Rate: ${(parseFloat(account.interestRate) * 100).toFixed(2)}%`;
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(account.id);
      toast.success("Account deleted");
      router.push("/accounts");
    } catch {
      // Error toast handled by mutation hook
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Left: back + info */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/accounts")}
          className="mt-0.5 shrink-0"
          aria-label="Back to accounts"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-md bg-muted p-2.5">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{account.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {ACCOUNT_TYPE_LABELS[account.accountType]}
              </Badge>
              {account.institution && (
                <span className="text-sm text-muted-foreground">{account.institution}</span>
              )}
              {keyStat && (
                <span className="text-sm text-muted-foreground">{keyStat}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: edit/delete actions */}
      <div className="flex items-center gap-2 sm:shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditOpen(true)}
          className="gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* Edit modal (reuses existing AccountForm dialog) */}
      <AccountForm
        account={account}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      {/* Delete confirmation */}
      <AccountDeleteDialog
        account={account}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
