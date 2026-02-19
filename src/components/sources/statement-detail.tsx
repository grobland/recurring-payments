"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { FileText, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStatement } from "@/lib/hooks/use-statement";
import { useStatementTransactions } from "@/lib/hooks/use-statement-transactions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  TransactionStatusBadge,
  getImportStatus,
} from "@/components/sources/transaction-status-badge";
import { ReimportWizard } from "@/components/sources/reimport-wizard";

function PdfStatusIcon({ hasPdf }: { hasPdf: boolean }) {
  return (
    <FileText
      className={cn(
        "h-4 w-4 shrink-0",
        hasPdf ? "text-green-500" : "text-muted-foreground/40"
      )}
      aria-label={hasPdf ? "PDF stored" : "No file stored"}
    />
  );
}

interface StatementDetailProps {
  statementId: string;
}

/**
 * Displays statement details with transaction list and re-import capability.
 * - Shows statement info (filename, date, source)
 * - Displays summary stats (transactions, converted, skipped, pending)
 * - Renders transaction table with selection checkboxes
 * - Opens ReimportWizard when user imports selected transactions
 */
export function StatementDetail({ statementId }: StatementDetailProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showWizard, setShowWizard] = useState(false);

  const {
    data: statementData,
    isLoading: isStatementLoading,
    error: statementError,
  } = useStatement(statementId);

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    error: transactionsError,
    refetch,
  } = useStatementTransactions(statementId);

  const transactions = transactionsData?.transactions ?? [];
  const statement = statementData?.statement;

  // Compute selectable IDs (not converted)
  const selectableIds = useMemo(() => {
    return new Set(
      transactions
        .filter((tx) => tx.tagStatus !== "converted")
        .map((tx) => tx.id)
    );
  }, [transactions]);

  // Check if all selectable are selected
  const isAllSelected = useMemo(() => {
    if (selectableIds.size === 0) return false;
    for (const id of selectableIds) {
      if (!selectedIds.has(id)) return false;
    }
    return true;
  }, [selectableIds, selectedIds]);

  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  // Toggle all selectable rows
  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }, [isAllSelected, selectableIds]);

  // Toggle single row
  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle wizard completion
  const handleWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedIds(new Set());
    refetch();
  }, [refetch]);

  const handleWizardCancel = useCallback(() => {
    setShowWizard(false);
  }, []);

  // Loading state
  if (isStatementLoading || isTransactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (statementError || transactionsError || !statement) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold">Error loading statement</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {statementError?.message ||
              transactionsError?.message ||
              "Statement not found"}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  // Build stats string
  const statsText = [
    `${statement.transactionCount} transactions`,
    `${statement.stats.converted} converted`,
    `${statement.stats.skipped} skipped`,
    `${statement.stats.pending} pending`,
  ].join(" \u2022 ");

  return (
    <div className="space-y-6">
      {/* Statement Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{statement.originalFilename}</h2>
              <PdfStatusIcon hasPdf={statement.hasPdf ?? false} />
            </div>
            <p className="text-sm text-muted-foreground">
              {statement.sourceType}
              {statement.statementDate && (
                <>
                  {" \u2022 "}
                  {format(new Date(statement.statementDate), "MMMM yyyy")}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground pl-13">
          <Upload className="h-3.5 w-3.5" />
          <span>
            Uploaded {format(new Date(statement.uploadedAt), "PPP 'at' p")}
          </span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
        {statsText}
      </div>

      {/* Import Selected Button */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} transaction{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <Button onClick={() => setShowWizard(true)} size="sm">
            Import Selected
          </Button>
        </div>
      )}

      {/* Transaction Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all selectable transactions"
                  data-state={isSomeSelected ? "indeterminate" : undefined}
                  disabled={selectableIds.size === 0}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No transactions found in this statement.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const isConverted = tx.tagStatus === "converted";
                const isSelected = selectedIds.has(tx.id);
                const importStatus = getImportStatus(tx.tagStatus);

                return (
                  <TableRow
                    key={tx.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={isConverted ? "opacity-60" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(tx.id)}
                        disabled={isConverted}
                        aria-label={`Select ${tx.merchantName}`}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(tx.transactionDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.merchantName}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(tx.amount), tx.currency)}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={importStatus} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Re-import Wizard Dialog */}
      {showWizard && (
        <ReimportWizard
          transactionIds={Array.from(selectedIds)}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      )}
    </div>
  );
}
