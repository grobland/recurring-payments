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
import type { CategoryTrend } from "@/types/analytics";

interface CategoryTrendsChartProps {
  data: CategoryTrend[];
  currency: string;
  title?: string;
}

interface TransformedDataPoint {
  month: string;
  [categorySlug: string]: string | number;
}

/**
 * Multi-line chart showing spending trends for each category over time.
 * Each category gets its own colored line based on category.color from database.
 */
export function CategoryTrendsChart({
  data,
  currency,
  title = "Spending by Category",
}: CategoryTrendsChartProps) {
  const formatCurrencyTick = (value: number) =>
    formatCurrency(value, currency);

  // Empty state
  if (data.length === 0 || data.every((cat) => cat.data.length < 2)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">More data needed for trends</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add subscriptions to see category trends
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform CategoryTrend[] to Recharts format
  // From: [{ categoryName, data: [{ month, amount }] }]
  // To: [{ month, Category1: amount, Category2: amount }]
  const transformedData = transformToRechartsFormat(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={transformedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              formatter={(value, name) => [
                formatCurrency(Number(value), currency),
                name,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              layout="horizontal"
              align="center"
            />
            {data.map((category) => (
              <Line
                key={category.categoryId ?? "uncategorized"}
                type="monotone"
                dataKey={category.categoryName}
                name={category.categoryName}
                stroke={category.categoryColor}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Transform CategoryTrend[] to Recharts-compatible format.
 * Creates one data point per month with all categories as keys.
 */
function transformToRechartsFormat(
  categoryTrends: CategoryTrend[]
): TransformedDataPoint[] {
  // Collect all unique months in order of appearance
  const monthsMap = new Map<string, number>();
  let monthIndex = 0;

  categoryTrends.forEach((cat) => {
    cat.data.forEach((d) => {
      if (!monthsMap.has(d.month)) {
        monthsMap.set(d.month, monthIndex++);
      }
    });
  });

  // Sort months by their order of appearance (API returns chronologically)
  const months = Array.from(monthsMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([month]) => month);

  // Build data points
  return months.map((month) => {
    const point: TransformedDataPoint = { month };

    categoryTrends.forEach((cat) => {
      const monthData = cat.data.find((d) => d.month === month);
      point[cat.categoryName] = monthData?.amount ?? 0;
    });

    return point;
  });
}
