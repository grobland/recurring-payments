"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Available day range options for the calendar forecast.
 */
const dayOptions = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
] as const;

interface CalendarDaySelectorProps {
  /** Currently selected day range */
  days: 30 | 60 | 90;
  /** Callback when day range changes */
  onDaysChange: (days: 30 | 60 | 90) => void;
  /** Optional className for the trigger */
  className?: string;
}

/**
 * Dropdown selector for calendar forecast day range.
 * Allows users to view upcoming charges for 30, 60, or 90 days.
 */
export function CalendarDaySelector({
  days,
  onDaysChange,
  className,
}: CalendarDaySelectorProps) {
  const handleValueChange = (value: string) => {
    const numValue = parseInt(value, 10) as 30 | 60 | 90;
    onDaysChange(numValue);
  };

  const selectedLabel =
    dayOptions.find((opt) => opt.value === days)?.label ?? "30 days";

  return (
    <Select value={String(days)} onValueChange={handleValueChange}>
      <SelectTrigger className={className ?? "w-[120px]"}>
        <SelectValue placeholder="Select days">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {dayOptions.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CalendarDaySelector;
