"use client";

import {
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subYears,
  getYear,
  getMonth,
  getQuarter,
} from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsParams } from "@/types/analytics";

/**
 * Period preset for the selector
 */
interface PeriodPreset {
  id: string;
  label: string;
  getParams: () => AnalyticsParams;
}

/**
 * Available period presets
 */
const PERIODS: PeriodPreset[] = [
  {
    id: "this-month",
    label: "This Month",
    getParams: () => {
      const now = new Date();
      return {
        period: "month",
        year: getYear(now),
        month: getMonth(now) + 1, // date-fns months are 0-indexed
      };
    },
  },
  {
    id: "last-month",
    label: "Last Month",
    getParams: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        period: "month",
        year: getYear(lastMonth),
        month: getMonth(lastMonth) + 1,
      };
    },
  },
  {
    id: "this-quarter",
    label: "This Quarter",
    getParams: () => {
      const now = new Date();
      return {
        period: "quarter",
        year: getYear(now),
        quarter: getQuarter(now),
      };
    },
  },
  {
    id: "this-year",
    label: "This Year",
    getParams: () => {
      const now = new Date();
      return {
        period: "year",
        year: getYear(now),
      };
    },
  },
  {
    id: "last-year",
    label: "Last Year",
    getParams: () => {
      const lastYear = subYears(new Date(), 1);
      return {
        period: "year",
        year: getYear(lastYear),
      };
    },
  },
];

interface PeriodSelectorProps {
  /** Currently selected period ID */
  value: string;
  /** Callback when period changes */
  onChange: (params: AnalyticsParams) => void;
  /** Optional className for the trigger */
  className?: string;
}

/**
 * Dropdown selector for analytics time periods
 */
export function PeriodSelector({
  value,
  onChange,
  className,
}: PeriodSelectorProps) {
  const handleValueChange = (periodId: string) => {
    const preset = PERIODS.find((p) => p.id === periodId);
    if (preset) {
      onChange(preset.getParams());
    }
  };

  const selectedLabel =
    PERIODS.find((p) => p.id === value)?.label ?? "Select period";

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={className ?? "w-[180px]"}>
        <SelectValue placeholder="Select period">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PERIODS.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Get the period ID from AnalyticsParams
 * Useful for syncing state with the selector
 */
export function getPeriodIdFromParams(params: AnalyticsParams): string {
  const now = new Date();

  if (params.period === "month") {
    const currentYear = getYear(now);
    const currentMonth = getMonth(now) + 1;
    const lastMonth = subMonths(now, 1);
    const lastMonthYear = getYear(lastMonth);
    const lastMonthNum = getMonth(lastMonth) + 1;

    if (params.year === currentYear && params.month === currentMonth) {
      return "this-month";
    }
    if (params.year === lastMonthYear && params.month === lastMonthNum) {
      return "last-month";
    }
  }

  if (params.period === "quarter") {
    const currentYear = getYear(now);
    const currentQuarter = getQuarter(now);

    if (params.year === currentYear && params.quarter === currentQuarter) {
      return "this-quarter";
    }
  }

  if (params.period === "year") {
    const currentYear = getYear(now);
    const lastYear = getYear(subYears(now, 1));

    if (params.year === currentYear) {
      return "this-year";
    }
    if (params.year === lastYear) {
      return "last-year";
    }
  }

  // Default fallback
  return "this-month";
}
