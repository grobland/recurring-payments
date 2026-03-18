"use client";

import { X, Search, TrendingUp, Unlink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionFilters as TransactionFiltersType } from "@/types/transaction";

interface TransactionFiltersProps {
  filters: TransactionFiltersType;
  onFiltersChange: (filters: TransactionFiltersType) => void;
  sourceTypes: string[];
}

const TAG_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "potential_subscription", label: "Potential" },
  { value: "converted", label: "Converted" },
  { value: "not_subscription", label: "Dismissed" },
];

/**
 * Filter bar component for transaction browser.
 * Includes search, source filter, tag status filter, and date range.
 */
export function TransactionFilters({
  filters,
  onFiltersChange,
  sourceTypes,
}: TransactionFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleSourceChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sourceType: value === "all" ? undefined : value,
    });
  };

  const handleTagStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      tagStatus: value === "all" ? undefined : value,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateFrom: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateTo: e.target.value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({ recurringOnly: undefined, unmatchedOnly: undefined });
  };

  const handleRecurringOnlyChange = () => {
    if (filters.recurringOnly) {
      // Deselect
      onFiltersChange({ ...filters, recurringOnly: undefined });
    } else {
      // Select recurring-only, clear unmatched (mutually exclusive)
      onFiltersChange({ ...filters, recurringOnly: true, unmatchedOnly: undefined });
    }
  };

  const handleUnmatchedOnlyChange = () => {
    if (filters.unmatchedOnly) {
      // Deselect
      onFiltersChange({ ...filters, unmatchedOnly: undefined });
    } else {
      // Select unmatched-only, clear recurring (mutually exclusive)
      onFiltersChange({ ...filters, unmatchedOnly: true, recurringOnly: undefined });
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.sourceType ||
    filters.tagStatus ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.recurringOnly ||
    filters.unmatchedOnly;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchant..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Source Dropdown */}
        <Select
          value={filters.sourceType || "all"}
          onValueChange={handleSourceChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sourceTypes.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag Status Dropdown */}
        <Select
          value={filters.tagStatus || "all"}
          onValueChange={handleTagStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {TAG_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom || ""}
            onChange={handleDateFromChange}
            className="w-[140px]"
            placeholder="From"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.dateTo || ""}
            onChange={handleDateToChange}
            className="w-[140px]"
            placeholder="To"
          />
        </div>

        {/* Recurring / Unmatched Toggles */}
        <Toggle
          pressed={!!filters.recurringOnly}
          onPressedChange={handleRecurringOnlyChange}
          size="sm"
          aria-label="Show recurring transactions only"
          className="gap-1.5 h-9 px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-800 dark:data-[state=on]:bg-green-950 dark:data-[state=on]:text-green-300"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Recurring only
        </Toggle>
        <Toggle
          pressed={!!filters.unmatchedOnly}
          onPressedChange={handleUnmatchedOnlyChange}
          size="sm"
          aria-label="Show unmatched transactions only"
          className="gap-1.5 h-9 px-3 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-800 dark:data-[state=on]:bg-amber-950 dark:data-[state=on]:text-amber-300"
        >
          <Unlink className="h-3.5 w-3.5" />
          Unmatched only
        </Toggle>

        {/* Clear Filters Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
