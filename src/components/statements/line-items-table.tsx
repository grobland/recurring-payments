"use client";

import { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStatementLineItems, type LineItem } from "@/lib/hooks/use-statement-line-items";

// ── Helpers ─────────────────────────────────────────────────────

function formatAmount(amount: string | null, currency: string | null): string {
  if (amount == null) return "—";
  const num = parseFloat(amount);
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : (currency ?? "") + " ";
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

/** Extract typed detail field with fallback */
function detail(item: LineItem, key: string): string | null {
  if (!item.details || typeof item.details !== "object") return null;
  const val = (item.details as Record<string, unknown>)[key];
  return val != null ? String(val) : null;
}

// ── CSV Export ──────────────────────────────────────────────────

function lineItemsToCsv(items: LineItem[], docType: string | null): string {
  const rows: string[][] = [];

  if (docType === "credit_card") {
    rows.push(["#", "Transaction Date", "Posting Date", "Description", "Amount", "Foreign Amount", "Foreign Currency", "Category", "Reference"]);
    for (const item of items) {
      rows.push([
        String(item.sequenceNumber),
        item.transactionDate ? format(new Date(item.transactionDate), "yyyy-MM-dd") : "",
        detail(item, "postingDate") ?? "",
        item.description,
        item.amount ?? "",
        detail(item, "foreignCurrencyAmount") ?? "",
        detail(item, "foreignCurrency") ?? "",
        detail(item, "merchantCategory") ?? "",
        detail(item, "reference") ?? "",
      ]);
    }
  } else if (docType === "loan") {
    rows.push(["#", "Date", "Description", "Payment", "Principal", "Interest", "Fees", "Remaining Balance"]);
    for (const item of items) {
      rows.push([
        String(item.sequenceNumber),
        item.transactionDate ? format(new Date(item.transactionDate), "yyyy-MM-dd") : "",
        item.description,
        item.amount ?? "",
        detail(item, "principalAmount") ?? "",
        detail(item, "interestAmount") ?? "",
        detail(item, "feesAmount") ?? "",
        detail(item, "remainingBalance") ?? "",
      ]);
    }
  } else {
    // bank_debit (default)
    rows.push(["#", "Date", "Description", "Debit", "Credit", "Balance", "Type", "Reference"]);
    for (const item of items) {
      const debit = detail(item, "debitAmount");
      const credit = detail(item, "creditAmount");
      rows.push([
        String(item.sequenceNumber),
        item.transactionDate ? format(new Date(item.transactionDate), "yyyy-MM-dd") : "",
        item.description,
        debit ?? "",
        credit ?? "",
        item.balance ?? "",
        detail(item, "type") ?? "",
        detail(item, "reference") ?? "",
      ]);
    }
  }

  return rows.map((row) => row.map((cell) => {
    // Escape CSV fields containing commas or quotes
    if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(",")).join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Bank Table ──────────────────────────────────────────────────

function BankTable({ items, currency }: { items: LineItem[]; currency: string | null }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-right">#</TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[100px] text-right">Debit</TableHead>
          <TableHead className="w-[100px] text-right">Credit</TableHead>
          <TableHead className="w-[110px] text-right">Balance</TableHead>
          <TableHead className="w-[60px]">Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const debit = detail(item, "debitAmount");
          const credit = detail(item, "creditAmount");
          return (
            <TableRow key={item.id} className="text-sm">
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {item.sequenceNumber}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(item.transactionDate)}
              </TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {item.description}
              </TableCell>
              <TableCell className="text-right tabular-nums text-red-600">
                {debit ? formatAmount(debit, currency) : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums text-green-600">
                {credit ? formatAmount(credit, currency) : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {item.balance ? formatAmount(item.balance, currency) : "—"}
              </TableCell>
              <TableCell>
                {detail(item, "type") && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {detail(item, "type")}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Credit Card Table ───────────────────────────────────────────

function CreditCardTable({ items, currency }: { items: LineItem[]; currency: string | null }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-right">#</TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[110px] text-right">Amount</TableHead>
          <TableHead className="w-[100px]">Category</TableHead>
          <TableHead className="w-[100px] text-right">Foreign Amt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const amt = item.amount ? parseFloat(item.amount) : null;
          const foreignAmt = detail(item, "foreignCurrencyAmount");
          const foreignCcy = detail(item, "foreignCurrency");
          return (
            <TableRow key={item.id} className="text-sm">
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {item.sequenceNumber}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(item.transactionDate)}
              </TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {item.description}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${amt != null && amt < 0 ? "text-green-600" : "text-red-600"}`}>
                {amt != null ? formatAmount(item.amount, currency) : "—"}
              </TableCell>
              <TableCell>
                {detail(item, "merchantCategory") && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {detail(item, "merchantCategory")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {foreignAmt ? `${foreignCcy ?? ""} ${parseFloat(foreignAmt).toFixed(2)}` : ""}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Loan Table ──────────────────────────────────────────────────

function LoanTable({ items, currency }: { items: LineItem[]; currency: string | null }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-right">#</TableHead>
          <TableHead className="w-[110px]">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[100px] text-right">Payment</TableHead>
          <TableHead className="w-[90px] text-right">Principal</TableHead>
          <TableHead className="w-[90px] text-right">Interest</TableHead>
          <TableHead className="w-[110px] text-right">Remaining</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const principal = detail(item, "principalAmount");
          const interest = detail(item, "interestAmount");
          const remaining = detail(item, "remainingBalance");
          return (
            <TableRow key={item.id} className="text-sm">
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {item.sequenceNumber}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(item.transactionDate)}
              </TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {item.description}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.amount ? formatAmount(item.amount, currency) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-blue-600">
                {principal ? formatAmount(principal, currency) : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums text-amber-600">
                {interest ? formatAmount(interest, currency) : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {remaining ? formatAmount(remaining, currency) : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Main Component ──────────────────────────────────────────────

interface LineItemsTableProps {
  statementId: string;
}

export function LineItemsTable({ statementId }: LineItemsTableProps) {
  const { data, isLoading, error } = useStatementLineItems(statementId);

  const handleExport = useCallback(() => {
    if (!data?.lineItems?.length) return;
    const csv = lineItemsToCsv(data.lineItems, data.documentType);
    downloadCsv(csv, `ledger-${statementId.slice(0, 8)}.csv`);
  }, [data, statementId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load line items: {error.message}
      </div>
    );
  }

  if (!data?.lineItems?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileSpreadsheet className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No line items extracted</p>
        <p className="text-xs mt-1">Line items are extracted during PDF processing</p>
      </div>
    );
  }

  const { lineItems, lineItemCount, documentType } = data;
  const currency = lineItems[0]?.currency ?? "GBP";

  // Calculate summary stats
  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    if (documentType === "bank_debit") {
      for (const item of lineItems) {
        const d = detail(item, "debitAmount");
        const c = detail(item, "creditAmount");
        if (d) totalDebit += parseFloat(d);
        if (c) totalCredit += parseFloat(c);
      }
    } else {
      for (const item of lineItems) {
        if (item.amount) {
          const amt = parseFloat(item.amount);
          if (amt > 0) totalDebit += amt;
          else totalCredit += Math.abs(amt);
        }
      }
    }

    return { totalDebit, totalCredit };
  }, [lineItems, documentType]);

  const docTypeLabel = documentType === "bank_debit"
    ? "Bank Statement"
    : documentType === "credit_card"
      ? "Credit Card"
      : documentType === "loan"
        ? "Loan Statement"
        : "Statement";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {docTypeLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {lineItemCount} line items
          </span>
          {documentType === "bank_debit" && (
            <span className="text-xs text-muted-foreground">
              · Out: <span className="text-red-600 font-medium">{formatAmount(summary.totalDebit.toFixed(2), currency)}</span>
              {" "}· In: <span className="text-green-600 font-medium">{formatAmount(summary.totalCredit.toFixed(2), currency)}</span>
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="max-h-[600px]">
          {documentType === "credit_card" ? (
            <CreditCardTable items={lineItems} currency={currency} />
          ) : documentType === "loan" ? (
            <LoanTable items={lineItems} currency={currency} />
          ) : (
            <BankTable items={lineItems} currency={currency} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
