"use client";

import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useForecastCalendar } from "@/lib/hooks/use-forecast";
import { CalendarDaySelector } from "./calendar-day-selector";
import { format, isSameDay, parseISO, addDays, startOfDay } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { RefreshCwIcon, CalendarIcon } from "lucide-react";
import type { UpcomingCharge } from "@/types/forecast";

/**
 * Calendar view showing upcoming subscription renewal dates.
 * Displays a calendar with visual indicators on days that have charges,
 * and a details panel showing the charges for the selected date.
 */
export function UpcomingChargesCalendar() {
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { data, isLoading, isError, refetch } = useForecastCalendar(days);

  // Group charges by date for quick lookup
  const chargesByDate = useMemo(() => {
    if (!data?.charges) return {};
    return data.charges.reduce(
      (acc, charge) => {
        const dateKey = format(parseISO(charge.date), "yyyy-MM-dd");
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(charge);
        return acc;
      },
      {} as Record<string, UpcomingCharge[]>
    );
  }, [data?.charges]);

  // Get dates that have charges (for calendar modifiers)
  const datesWithCharges = useMemo(() => {
    return Object.keys(chargesByDate).map((dateStr) => parseISO(dateStr));
  }, [chargesByDate]);

  // Get charges for the selected date
  const selectedCharges = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return chargesByDate[dateKey] || [];
  }, [selectedDate, chargesByDate]);

  // Calculate date range for calendar
  const today = startOfDay(new Date());
  const endDate = addDays(today, days);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5" />
            Upcoming Charges
          </CardTitle>
          <CardDescription>View your subscription renewals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              Failed to load upcoming charges.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCwIcon className="mr-2 size-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data?.charges.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="size-5" />
                Upcoming Charges
              </CardTitle>
              <CardDescription>View your subscription renewals</CardDescription>
            </div>
            <CalendarDaySelector days={days} onDaysChange={setDays} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <CalendarIcon className="size-12 text-muted-foreground" />
            <h3 className="font-medium">No upcoming charges</h3>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any subscription renewals in the next {days}{" "}
              days.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              Upcoming Charges
            </CardTitle>
            <CardDescription>
              {data.summary.chargeCount} renewal
              {data.summary.chargeCount !== 1 ? "s" : ""} across{" "}
              {data.summary.uniqueSubscriptions} subscription
              {data.summary.uniqueSubscriptions !== 1 ? "s" : ""} in the next{" "}
              {days} days
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total upcoming</p>
              <p className="text-lg font-semibold">
                {formatCurrency(
                  data.summary.totalAmount,
                  data.displayCurrency
                )}
              </p>
            </div>
            <CalendarDaySelector days={days} onDaysChange={setDays} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar */}
          <div className="flex justify-center lg:justify-start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={[{ before: today }, { after: endDate }]}
              modifiers={{
                hasCharge: datesWithCharges,
              }}
              modifiersClassNames={{
                hasCharge:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-primary",
              }}
              className="rounded-md border"
            />
          </div>

          {/* Selected date details */}
          <div className="rounded-md border p-4">
            <h3 className="mb-4 font-medium">
              {selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : "Select a date"}
            </h3>

            {selectedCharges.length > 0 ? (
              <ul className="space-y-3">
                {selectedCharges.map((charge, i) => (
                  <li
                    key={`${charge.subscriptionId}-${i}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: charge.categoryColor }}
                      />
                      <div>
                        <span className="font-medium">
                          {charge.subscriptionName}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {charge.categoryName}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(charge.amount, charge.currency)}
                    </span>
                  </li>
                ))}

                {/* Total for selected date */}
                <li className="flex items-center justify-between border-t pt-3 font-semibold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      selectedCharges.reduce((sum, c) => sum + c.amount, 0),
                      data?.displayCurrency || "USD"
                    )}
                  </span>
                </li>
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {selectedDate
                  ? "No charges on this date"
                  : "Click a date to see charges"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UpcomingChargesCalendar;
