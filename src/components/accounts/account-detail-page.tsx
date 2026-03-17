"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAccount } from "@/lib/hooks/use-accounts";
import { AccountDetailHeader } from "./account-detail-header";
import { AccountDetailsTab } from "./account-details-tab";
import { AccountCoverageTab } from "./account-coverage-tab";
import { AccountLedgerTab } from "./account-ledger-tab";
import { AccountTransactionsTab } from "./account-transactions-tab";
import { AccountSpendingTab } from "./account-spending-tab";
import type { TransactionFilters } from "@/types/transaction";

interface AccountDetailPageProps {
  accountId: string;
}

export function AccountDetailPage({ accountId }: AccountDetailPageProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useAccount(accountId);
  const [activeTab, setActiveTab] = useState("details");
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
    accountId,
  });

  // Cross-tab navigation: coverage cell click -> transactions tab with date range
  const handleCoverageCellToTransactions = useCallback(
    (dateFrom: string, dateTo: string) => {
      setTransactionFilters({ accountId, dateFrom, dateTo });
      setActiveTab("transactions");
    },
    [accountId]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.account) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-16">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold">
            {error?.message?.includes("not found") ? "Account not found" : "Error loading account"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message || "Something went wrong."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/accounts")}>
            Back to Accounts
          </Button>
          {!error?.message?.includes("not found") && (
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const account = data.account;

  return (
    <div className="space-y-6">
      <AccountDetailHeader account={account} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <AccountDetailsTab account={account} />
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <AccountCoverageTab
            accountId={accountId}
            account={account}
            onNavigateToTransactions={handleCoverageCellToTransactions}
          />
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <AccountLedgerTab accountId={accountId} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <AccountTransactionsTab
            accountId={accountId}
            initialFilters={transactionFilters}
            onFiltersChange={setTransactionFilters}
          />
        </TabsContent>

        <TabsContent value="spending" className="mt-4">
          <AccountSpendingTab accountId={accountId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
