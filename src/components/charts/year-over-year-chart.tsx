"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import type { YearComparison } from "@/types/analytics";

interface YearOverYearChartProps {
  data: YearComparison[];
  currentYear: number;
  currency: string;
  title?: string;
}

/**
 * Dual-line chart comparing current year vs previous year spending by month.
 * Current year is solid primary color, previous year is dashed muted color.
 */
export function YearOverYearChart({
  data,
  currentYear,
  currency,
  title = "Year-over-Year Comparison",
}: YearOverYearChartProps) {
  const formatCurrencyTick = (value: number) =>
    formatCurrency(value, currency);

  // Empty state for insufficient data
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">More data needed for comparison</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.length} of 2 months available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrencyTick}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value), currency)]}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="currentYear"
              name={String(currentYear)}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="previousYear"
              name={String(currentYear - 1)}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
