"use client";

import { Building2, CreditCard, TrendingDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FinancialAccount } from "@/lib/db/schema";

interface AccountCardProps {
  account: FinancialAccount;
  onEdit: (account: FinancialAccount) => void;
  onDelete: (account: FinancialAccount) => void;
}

const ACCOUNT_TYPE_ICONS = {
  bank_debit: Building2,
  credit_card: CreditCard,
  loan: TrendingDown,
} as const;

const ACCOUNT_TYPE_LABELS = {
  bank_debit: "Bank / Debit",
  credit_card: "Credit Card",
  loan: "Loan",
} as const;

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = ACCOUNT_TYPE_ICONS[account.accountType];

  const formattedInterestRate =
    account.interestRate != null
      ? `${(parseFloat(account.interestRate) * 100).toFixed(2)}%`
      : null;

  const formattedCreditLimit =
    account.creditLimit != null
      ? `$${parseFloat(account.creditLimit).toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`
      : null;

  return (
    <div className="rounded-xl border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0 rounded-md bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{account.name}</p>
            {account.institution && (
              <p className="text-sm text-muted-foreground truncate">
                {account.institution}
              </p>
            )}
            {!account.institution && (
              <p className="text-xs text-muted-foreground">
                {ACCOUNT_TYPE_LABELS[account.accountType]}
              </p>
            )}

            {/* Credit card: show credit limit */}
            {account.accountType === "credit_card" && formattedCreditLimit && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Limit: {formattedCreditLimit}
              </p>
            )}

            {/* Loan: show interest rate */}
            {account.accountType === "loan" && formattedInterestRate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Rate: {formattedInterestRate}
              </p>
            )}

            {/* Linked source badge */}
            {account.linkedSourceType && (
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-xs">
                  {account.linkedSourceType}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Right: action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Account actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(account)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
