"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  MinusCircle,
  EyeOff,
  FileSpreadsheet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatementLineItems, type LineItem } from "@/lib/hooks/use-statement-line-items";
import { useStatementTransactions } from "@/lib/hooks/use-statement-transactions";
import { useLabelTransaction } from "@/lib/hooks/use-recurring";
import type { StatementTransaction } from "@/types/source";

// ── Helpers ──────────────────────────────────────────────────────

function formatAmount(amount: string | null, currency: string | null): string {
  if (amount == null) return "—";
  const num = parseFloat(amount);
  const symbol =
    currency === "GBP" ? "£" :
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" :
    (currency ?? "") + " ";
  return `${symbol}${Math.abs(num).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function getDetail(item: LineItem, key: string): string | null {
  if (!item.details || typeof item.details !== "object") return null;
  const val = (item.details as Record<string, unknown>)[key];
  return val != null ? String(val) : null;
}

// ── Recurring Status Badge ───────────────────────────────────────

interface RecurringStatusBadgeProps {
  tagStatus: string | null;
}

function RecurringStatusBadge({ tagStatus }: RecurringStatusBadgeProps) {
  if (tagStatus === "converted") {
    return (
      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700">
        Recurring
      </Badge>
    );
  }
  if (tagStatus === "potential_subscription") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
        Potential
      </Badge>
    );
  }
  if (tagStatus === "not_subscription") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
        Not recurring
      </Badge>
    );
  }
  return null;
}

// ── Merchant Badge ───────────────────────────────────────────────

interface MerchantBadgeProps {
  merchantName: string | null;
  fallback: string;
}

function MerchantBadge({ merchantName, fallback }: MerchantBadgeProps) {
  const displayName = merchantName || fallback;
  const isNormalized = !!merchantName;
  return (
    <span
      className={`font-medium truncate max-w-[200px] block ${
        isNormalized ? "text-foreground" : "text-muted-foreground"
      }`}
      title={displayName}
    >
      {displayName}
    </span>
  );
}

// ── Label Action Dropdown ────────────────────────────────────────

interface LabelActionsProps {
  transactionId: string | null;
}

function LabelActions({ transactionId }: LabelActionsProps) {
  const labelMutation = useLabelTransaction();

  if (!transactionId) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-7 w-7 opacity-30">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Label transaction"
          disabled={labelMutation.isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() =>
            labelMutation.mutate({ id: transactionId, data: { label: "recurring" } })
          }
          className="gap-2 text-sm"
        >
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          Mark as Recurring
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            labelMutation.mutate({ id: transactionId, data: { label: "not_recurring" } })
          }
          className="gap-2 text-sm"
        >
          <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Not Recurring
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            labelMutation.mutate({ id: transactionId, data: { label: "ignore" } })
          }
          className="gap-2 text-sm text-muted-foreground"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Ignore
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Transaction Matcher ──────────────────────────────────────────

/**
 * Best-effort matcher: given a line item, find the most likely transaction
 * by comparing date and amount. Returns null if no close match found.
 *
 * The matching uses date (exact day) + amount (within 0.01 tolerance).
 * This is approximate but covers the majority of cases where the ingestion
 * pipeline created a normalised transaction from this line item.
 */
function matchLineItemToTransaction(
  item: LineItem,
  transactions: StatementTransaction[]
): StatementTransaction | null {
  if (!item.transactionDate || !item.amount) return null;

  const itemDate = item.transactionDate.slice(0, 10); // YYYY-MM-DD
  const itemAmount = Math.abs(parseFloat(item.amount));

  // Look for transactions with same date + amount
  const candidates = transactions.filter((tx) => {
    const txDate = tx.transactionDate.slice(0, 10);
    const txAmount = Math.abs(parseFloat(tx.amount));
    const amountMatch = Math.abs(txAmount - itemAmount) < 0.01;
    return txDate === itemDate && amountMatch;
  });

  return candidates[0] ?? null;
}

// ── Enriched Line Item Row ───────────────────────────────────────

interface EnrichedRowProps {
  item: LineItem;
  matchedTx: StatementTransaction | null;
  currency: string | null;
}

function EnrichedRow({ item, matchedTx, currency }: EnrichedRowProps) {
  const debit = getDetail(item, "debitAmount");
  const credit = getDetail(item, "creditAmount");

  // Determine merchant name (use matched transaction's merchantName as the normalised form)
  const merchantName = matchedTx?.merchantName ?? null;

  return (
    <TableRow className="text-sm">
      <TableCell className="text-right text-muted-foreground tabular-nums w-[50px]">
        {item.sequenceNumber}
      </TableCell>
      <TableCell className="tabular-nums w-[110px]">
        {formatDate(item.transactionDate)}
      </TableCell>
      <TableCell className="max-w-[220px]">
        <MerchantBadge merchantName={merchantName} fallback={item.description} />
        {merchantName && merchantName !== item.description && (
          <span className="text-[10px] text-muted-foreground/70 block truncate max-w-[200px]">
            {item.description}
          </span>
        )}
      </TableCell>
      <TableCell className="w-[90px]">
        <RecurringStatusBadge tagStatus={matchedTx?.tagStatus ?? null} />
      </TableCell>
      <TableCell className="text-right tabular-nums text-red-600 w-[90px]">
        {debit ? formatAmount(debit, currency) : ""}
      </TableCell>
      <TableCell className="text-right tabular-nums text-green-600 w-[90px]">
        {credit ? formatAmount(credit, currency) : ""}
      </TableCell>
      <TableCell className="w-[50px] text-right">
        <LabelActions transactionId={matchedTx?.id ?? null} />
      </TableCell>
    </TableRow>
  );
}

// ── Main Component ───────────────────────────────────────────────

interface StatementLineItemsProps {
  statementId: string;
}

/**
 * Statement line items view with recurring payment context.
 *
 * Extends the raw ledger view (line-items-table.tsx) with:
 * - Inferred merchant names from the normalised transaction records
 * - Recurring status badges (Recurring / Potential / Not recurring) based on
 *   the matched transaction's tagStatus
 * - Per-row label action dropdown: Mark as Recurring / Not Recurring / Ignore
 *   (calls useLabelTransaction on the matched transaction)
 *
 * This component is only rendered for bank_debit statements because that is
 * the type most likely to contain recurring charges. Credit card and loan
 * views fall back to the existing LineItemsTable component.
 *
 * UI-03 requirement.
 */
export function StatementLineItems({ statementId }: StatementLineItemsProps) {
  const { data: lineItemsData, isLoading: itemsLoading, error: itemsError } =
    useStatementLineItems(statementId);

  const { data: txData, isLoading: txLoading } =
    useStatementTransactions(statementId);

  const transactions = txData?.transactions ?? [];

  // Pre-build a lookup map: transactions keyed by "YYYY-MM-DD|amount" for fast matching
  // Multiple transactions can share the same key; matchLineItemToTransaction handles deduplication
  const isLoading = itemsLoading || txLoading;

  // Build enriched rows by matching each line item to a transaction
  const enrichedItems = useMemo(() => {
    if (!lineItemsData?.lineItems) return [];
    return lineItemsData.lineItems.map((item) => ({
      item,
      matchedTx: matchLineItemToTransaction(item, transactions),
    }));
  }, [lineItemsData, transactions]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (itemsError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load line items: {itemsError.message}
      </div>
    );
  }

  if (!lineItemsData?.lineItems?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileSpreadsheet className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No line items extracted</p>
        <p className="text-xs mt-1">Line items are extracted during PDF processing</p>
      </div>
    );
  }

  const { lineItemCount, documentType } = lineItemsData;
  const currency = lineItemsData.lineItems[0]?.currency ?? "GBP";

  // Show recurring-enhanced view only for bank_debit statements
  // Credit card / loan statements use the existing LineItemsTable
  const showRecurringContext = documentType === "bank_debit";

  // Stats: how many have a matched recurring status
  const recurringCount = enrichedItems.filter(
    (e) => e.matchedTx?.tagStatus === "converted"
  ).length;
  const potentialCount = enrichedItems.filter(
    (e) => e.matchedTx?.tagStatus === "potential_subscription"
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {lineItemCount} line items
          </span>
          {showRecurringContext && recurringCount > 0 && (
            <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700">
              {recurringCount} recurring
            </Badge>
          )}
          {showRecurringContext && potentialCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              {potentialCount} potential
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="max-h-[600px]">
          {showRecurringContext ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-right">#</TableHead>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="w-[90px]">Recurring</TableHead>
                  <TableHead className="w-[90px] text-right">Debit</TableHead>
                  <TableHead className="w-[90px] text-right">Credit</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedItems.map(({ item, matchedTx }) => (
                  <EnrichedRow
                    key={item.id}
                    item={item}
                    matchedTx={matchedTx}
                    currency={currency}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            // For credit_card and loan: simple display without label actions
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-right">#</TableHead>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[110px] text-right">Amount</TableHead>
                  <TableHead className="w-[90px]">Recurring</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedItems.map(({ item, matchedTx }) => (
                  <TableRow key={item.id} className="text-sm">
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {item.sequenceNumber}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDate(item.transactionDate)}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate font-medium">
                      {matchedTx?.merchantName ?? item.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.amount ? formatAmount(item.amount, currency) : "—"}
                    </TableCell>
                    <TableCell>
                      <RecurringStatusBadge tagStatus={matchedTx?.tagStatus ?? null} />
                    </TableCell>
                    <TableCell className="text-right">
                      <LabelActions transactionId={matchedTx?.id ?? null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
