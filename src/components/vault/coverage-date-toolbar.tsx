"use client";

import { useCallback } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonthPicker } from "@/components/vault/month-picker";
import type { CoverageDateRange } from "@/lib/hooks/use-vault-coverage";
import type { CoveragePreset } from "@/components/vault/coverage-view";

interface CoverageDateToolbarProps {
  /** Currently active preset, or null if using custom range */
  preset: CoveragePreset | null;
  /** Current date range (reflects preset or custom) */
  range: CoverageDateRange;
  /** Callback when a preset button is clicked */
  onPresetChange: (preset: CoveragePreset) => void;
  /** Callback when a custom date is picked */
  onRangeChange: (range: CoverageDateRange) => void;
}

const PRESETS: { value: CoveragePreset; label: string }[] = [
  { value: "12m", label: "Last 12 months" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "all", label: "All" },
];

function formatMonthLabel(yyyyMM: string): string {
  return format(parseISO(yyyyMM + "-01"), "MMM yyyy");
}

export function CoverageDateToolbar({
  preset,
  range,
  onPresetChange,
  onRangeChange,
}: CoverageDateToolbarProps) {
  const handleFromChange = useCallback(
    (month: string) => {
      onRangeChange({ from: month, to: range.to < month ? month : range.to });
    },
    [range.to, onRangeChange],
  );

  const handleToChange = useCallback(
    (month: string) => {
      onRangeChange({ from: range.from > month ? month : range.from, to: month });
    },
    [range.from, onRangeChange],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Date pickers */}
      <div className="flex items-center gap-2">
        <DatePickerButton
          label="From"
          value={range.from}
          onChange={handleFromChange}
        />
        <span className="text-xs text-muted-foreground select-none">–</span>
        <DatePickerButton
          label="To"
          value={range.to}
          onChange={handleToChange}
        />
      </div>

      {/* Preset buttons */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            variant={preset === p.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs px-3",
              preset === p.value && "pointer-events-none",
            )}
            onClick={() => onPresetChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Compact month-picker trigger button with popover. */
function DatePickerButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (month: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
        >
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{formatMonthLabel(value)}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <MonthPicker value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
