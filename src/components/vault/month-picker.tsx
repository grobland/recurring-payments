"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthPickerProps {
  /** Current value in "yyyy-MM" format */
  value: string;
  /** Called with new "yyyy-MM" value when user picks a month */
  onChange: (month: string) => void;
}

/**
 * A compact year+month grid picker.
 * Shows 12 months for the displayed year with navigation arrows.
 */
export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const selectedYear = parseInt(value.slice(0, 4), 10);
  const selectedMonth = parseInt(value.slice(5, 7), 10); // 1-based

  const [displayYear, setDisplayYear] = useState(selectedYear);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  function handleSelect(monthIdx: number) {
    // monthIdx is 0-based
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange(`${displayYear}-${mm}`);
  }

  function isFuture(monthIdx: number): boolean {
    if (displayYear > currentYear) return true;
    if (displayYear === currentYear && monthIdx + 1 > currentMonth) return true;
    return false;
  }

  return (
    <div className="w-56">
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setDisplayYear((y) => y - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold tabular-nums">{displayYear}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setDisplayYear((y) => y + 1)}
          disabled={displayYear >= currentYear}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Month grid: 4 columns × 3 rows */}
      <div className="grid grid-cols-4 gap-1.5">
        {MONTH_LABELS.map((label, idx) => {
          const isSelected =
            displayYear === selectedYear && idx + 1 === selectedMonth;
          const disabled = isFuture(idx);

          return (
            <button
              key={label}
              disabled={disabled}
              onClick={() => handleSelect(idx)}
              className={cn(
                "h-8 rounded-md text-xs font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                disabled && "opacity-40 pointer-events-none",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
