"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  AlertCircle,
  RefreshCw,
  FileX2,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccountLineItems,
  type AccountLineItemFilters,
  type AccountLineItem,
} from "@/lib/hooks/use-account-line-items";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

interface AccountLedgerTabProps {
  accountId: string;
}

// ─── Currency formatter ─────────────────────────────────────────────────────

function formatAmount(value: string | null, currency: string | null): string {
  if (value == null) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  const sym =
    currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : `${currency ?? ""} `;
  return `${sym}${Math.abs(num).toFixed(2)}`;
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function escapeCSV(val: string): string {
  if (/[,"\r\n]/.test(val) || /^[=+\-@\t\r]/.test(val)) {
    // CWE-1236: prefix formula-trigger chars
    const safe = /^[=+\-@\t\r]/.test(val) ? `\t${val}` : val;
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return val;
}

function exportCSV(items: AccountLineItem[]) {
  const headers = [
    "Date",
    "Description",
    "Debit",
    "Credit",
    "Balance",
    "Type",
    "Currency",
    "Source",
  ];

  const rows = items.map((item) => {
    const debit = item.details && "debitAmount" in item.details && item.details.debitAmount
      ? String(item.details.debitAmount)
      : "";
    const credit = item.details && "creditAmount" in item.details && item.details.creditAmount
      ? String(item.details.creditAmount)
      : "";
    const type = item.details && "type" in item.details && item.details.type
      ? String(item.details.type)
      : "";

    return [
      item.transactionDate
        ? format(new Date(item.transactionDate), "yyyy-MM-dd")
        : "",
      item.description,
      debit,
      credit,
      item.balance ?? "",
      type,
      item.currency ?? "",
      item.sourceType ?? "",
    ]
      .map((v) => escapeCSV(String(v)))
      .join(",");
  });

  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

interface LedgerFiltersProps {
  filters: AccountLineItemFilters;
  onChange: (f: AccountLineItemFilters) => void;
}

function LedgerFilters({ filters, onChange }: LedgerFiltersProps) {
  const hasActive = !!(filters.search || filters.dateFrom || filters.dateTo || (filters.type && filters.type !== "all"));

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search description..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-8 h-9"
        />
      </div>

      {/* Type filter */}
      <Select
        value={filters.type ?? "all"}
        onValueChange={(v) =>
          onChange({ ...filters, type: v as "debit" | "credit" | "all" })
        }
      >
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="debit">Debits only</SelectItem>
          <SelectItem value="credit">Credits only</SelectItem>
        </SelectContent>
      </Select>

      {/* Date from */}
      <Input
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        className="h-9 w-[145px]"
        placeholder="From"
      />

      {/* Date to */}
      <Input
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        className="h-9 w-[145px]"
        placeholder="To"
      />

      {/* Clear */}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-xs"
          onClick={() =>
            onChange({ accountId: filters.accountId, type: "all" })
          }
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

// ─── Table row ──────────────────────────────────────────────────────────────

function LedgerRow({ item }: { item: AccountLineItem }) {
  const debit = item.details && "debitAmount" in item.details ? item.details.debitAmount : null;
  const credit = item.details && "creditAmount" in item.details ? item.details.creditAmount : null;
  const type = item.details && "type" in item.details ? item.details.type : null;

  return (
    <tr className="border-b text-sm hover:bg-muted/50 transition-colors">
      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
        {item.transactionDate
          ? format(new Date(item.transactionDate), "dd MMM yyyy")
          : "—"}
      </td>
      <td className="px-3 py-2 max-w-[280px] truncate" title={item.description}>
        {item.description}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
        {debit ? formatAmount(String(debit), item.currency) : ""}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-green-600 dark:text-green-400 whitespace-nowrap">
        {credit ? formatAmount(String(credit), item.currency) : ""}
      </td>
      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
        {item.balance != null ? formatAmount(item.balance, item.currency) : "—"}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {type ? String(type) : ""}
      </td>
    </tr>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AccountLedgerTab({ accountId }: AccountLedgerTabProps) {
  const [filters, setFilters] = useState<AccountLineItemFilters>({
    accountId,
    type: "all",
  });

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const {
    allLineItems,
    totalLoaded,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountLineItems(debouncedFilters);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Summary stats
  const totalDebit = useMemo(() => {
    let sum = 0;
    for (const item of allLineItems) {
      const amt = parseFloat(item.amount ?? "0");
      if (amt < 0) sum += Math.abs(amt);
    }
    return sum;
  }, [allLineItems]);

  const totalCredit = useMemo(() => {
    let sum = 0;
    for (const item of allLineItems) {
      const amt = parseFloat(item.amount ?? "0");
      if (amt > 0) sum += amt;
    }
    return sum;
  }, [allLineItems]);

  const currency = allLineItems[0]?.currency ?? "GBP";

  const handleFiltersChange = useCallback(
    (f: AccountLineItemFilters) => setFilters(f),
    []
  );

  const hasActiveFilters = !!(
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.type && filters.type !== "all")
  );

  // Loading
  if (isLoading) {
    return (
      <div>
        <LedgerFilters filters={filters} onChange={handleFiltersChange} />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (isError) {
    return (
      <div>
        <LedgerFilters filters={filters} onChange={handleFiltersChange} />
        <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Error loading ledger</h3>
          <p className="text-sm text-muted-foreground">
            {error?.message || "Something went wrong."}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  // Empty
  if (allLineItems.length === 0) {
    return (
      <div>
        <LedgerFilters filters={filters} onChange={handleFiltersChange} />
        <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
          <FileX2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {hasActiveFilters
              ? "No line items match your filters"
              : "No ledger data for this account"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters or clearing them."
              : "Upload and process bank statements to populate the ledger."}
          </p>
          {hasActiveFilters && (
            <Button
              onClick={() =>
                handleFiltersChange({ accountId, type: "all" })
              }
              variant="outline"
              size="sm"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main
  return (
    <div>
      <LedgerFilters filters={filters} onChange={handleFiltersChange} />

      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {totalLoaded} line items
          {" · "}
          <span className="text-red-600 dark:text-red-400">
            Out: {formatAmount(totalDebit.toFixed(2), currency)}
          </span>
          {" · "}
          <span className="text-green-600 dark:text-green-400">
            In: {formatAmount(totalCredit.toFixed(2), currency)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => exportCSV(allLineItems)}
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-22rem)]">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium w-[110px]">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium text-right w-[100px]">Debit</th>
              <th className="px-3 py-2 font-medium text-right w-[100px]">Credit</th>
              <th className="px-3 py-2 font-medium text-right w-[110px]">Balance</th>
              <th className="px-3 py-2 font-medium w-[60px]">Type</th>
            </tr>
          </thead>
          <tbody>
            {allLineItems.map((item) => (
              <LedgerRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-8 flex items-center justify-center">
          {isFetchingNextPage && (
            <span className="text-xs text-muted-foreground">Loading more…</span>
          )}
        </div>
      </div>
    </div>
  );
}
