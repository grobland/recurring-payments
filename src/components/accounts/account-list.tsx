"use client";

import { useState } from "react";
import { Plus, Database, Building2, CreditCard, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useAccounts, useDeleteFinancialAccount } from "@/lib/hooks/use-accounts";
import type { FinancialAccount, AccountType } from "@/lib/db/schema";

import { AccountCard } from "./account-card";
import { AccountForm } from "./account-form";
import { AccountDeleteDialog } from "./account-delete-dialog";

export function AccountList() {
  const { data, isLoading } = useAccounts();
  const deleteAccount = useDeleteFinancialAccount();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(
    null
  );
  const [deletingAccount, setDeletingAccount] =
    useState<FinancialAccount | null>(null);
  const [preselectedType, setPreselectedType] = useState<
    AccountType | undefined
  >(undefined);

  const accounts = data?.accounts ?? [];

  const bankDebitAccounts = accounts.filter(
    (a) => a.accountType === "bank_debit"
  );
  const creditCardAccounts = accounts.filter(
    (a) => a.accountType === "credit_card"
  );
  const loanAccounts = accounts.filter((a) => a.accountType === "loan");

  const handleOpenCreate = (type?: AccountType) => {
    setPreselectedType(type);
    setIsCreateOpen(true);
  };

  const handleFormClose = () => {
    setIsCreateOpen(false);
    setEditingAccount(null);
    setPreselectedType(undefined);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;
    try {
      await deleteAccount.mutateAsync(deletingAccount.id);
      toast.success("Account deleted");
      setDeletingAccount(null);
    } catch {
      // Error toast handled by the mutation hook
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  // Global empty state — no accounts at all
  if (accounts.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <Database className="size-16 text-muted-foreground/30" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No accounts yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Financial accounts let you organize your bank statements and track
              where your money moves.
            </p>
          </div>
          <Button onClick={() => handleOpenCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first account
          </Button>
        </div>

        <AccountForm
          isOpen={isCreateOpen}
          onClose={handleFormClose}
          defaultAccountType={preselectedType}
        />
      </>
    );
  }

  // Tabbed view — accounts exist
  return (
    <>
      <div className="space-y-4">
        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Accounts</h2>
          <Button size="sm" onClick={() => handleOpenCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        <Tabs defaultValue="bank_debit">
          <TabsList>
            <TabsTrigger value="bank_debit">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              Bank/Debit ({bankDebitAccounts.length})
            </TabsTrigger>
            <TabsTrigger value="credit_card">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Credit Cards ({creditCardAccounts.length})
            </TabsTrigger>
            <TabsTrigger value="loan">
              <TrendingDown className="mr-1.5 h-3.5 w-3.5" />
              Loans ({loanAccounts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bank_debit" className="mt-4">
            {bankDebitAccounts.length === 0 ? (
              <PerTypeEmptyState
                label="bank or debit accounts"
                onAdd={() => handleOpenCreate("bank_debit")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankDebitAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={setEditingAccount}
                    onDelete={setDeletingAccount}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="credit_card" className="mt-4">
            {creditCardAccounts.length === 0 ? (
              <PerTypeEmptyState
                label="credit cards"
                onAdd={() => handleOpenCreate("credit_card")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditCardAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={setEditingAccount}
                    onDelete={setDeletingAccount}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="loan" className="mt-4">
            {loanAccounts.length === 0 ? (
              <PerTypeEmptyState
                label="loans"
                onAdd={() => handleOpenCreate("loan")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loanAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={setEditingAccount}
                    onDelete={setDeletingAccount}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AccountForm
        isOpen={isCreateOpen || !!editingAccount}
        account={editingAccount}
        onClose={handleFormClose}
        defaultAccountType={preselectedType}
      />

      <AccountDeleteDialog
        account={deletingAccount}
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteAccount.isPending}
      />
    </>
  );
}

// Per-tab empty state component
function PerTypeEmptyState({
  label,
  onAdd,
}: {
  label: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        No {label} added yet.
      </p>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add {label}
      </Button>
    </div>
  );
}
