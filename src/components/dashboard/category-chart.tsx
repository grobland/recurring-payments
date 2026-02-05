"use client";

import { useMemo } from "react";
import type { PieLabelRenderProps } from "recharts";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { useDelayedLoading } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import type { AnalyticsParams, CategoryBreakdown } from "@/types/analytics";

interface CategoryChartProps {
  /** Analytics query parameters */
  params: AnalyticsParams;
}

/**
 * Donut chart showing spending breakdown by category
 */
export function CategoryChart({ params }: CategoryChartProps) {
  const { data, isLoading, isError, error } = useAnalytics(
    params.period,
    params.year,
    params.month,
    params.quarter
  );

  const showSkeleton = useDelayedLoading(isLoading);

  const displayCurrency = data?.displayCurrency ?? "USD";

  // Transform and potentially group small categories
  const chartData = useMemo(() => {
    if (!data?.categories || data.categories.length === 0) return [];

    const categories = data.categories;

    // If more than 6 categories, group small ones as "Other"
    if (categories.length > 6) {
      const sorted = [...categories].sort((a, b) => b.amount - a.amount);
      const top5 = sorted.slice(0, 5);
      const others = sorted.slice(5);

      if (others.length > 0) {
        const otherTotal = others.reduce((sum, cat) => sum + cat.amount, 0);
        const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
        const otherPercentage =
          totalAmount > 0 ? (otherTotal / totalAmount) * 100 : 0;

        return [
          ...top5.map(toChartItem),
          {
            name: "Other",
            value: otherTotal,
            color: "#9CA3AF", // gray-400
            percentage: otherPercentage,
          },
        ];
      }
    }

    return categories.map(toChartItem);
  }, [data?.categories]);

  // Loading state
  if (showSkeleton) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px]">
            <div className="relative">
              <Skeleton className="h-60 w-60 rounded-full" />
              <Skeleton className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
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
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load chart data"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <p className="text-sm text-muted-foreground">
              No spending data available for this period
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add subscriptions to see your spending breakdown
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSpending = data?.totalMonthly ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={renderLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    currency={displayCurrency}
                  />
                )}
              />
              <Legend
                content={() => (
                  <CustomLegend
                    currency={displayCurrency}
                    chartData={chartData}
                  />
                )}
              />
              {/* Center label */}
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-lg font-bold"
              >
                {formatCurrency(totalSpending, displayCurrency)}
              </text>
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                per month
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Currency breakdown for multi-currency users */}
        {data && data.currencyBreakdown.length > 1 && (
          <CurrencyBreakdown
            breakdown={data.currencyBreakdown}
            rateTimestamp={data.rateTimestamp}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Chart item from category breakdown
 */
interface ChartItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

function toChartItem(cat: CategoryBreakdown): ChartItem {
  return {
    name: cat.name,
    value: cat.amount,
    color: cat.color,
    percentage: cat.percentage,
  };
}

/**
 * Custom pie chart label (show percentage on larger slices)
 */
function renderLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

  // Type-safe number extraction
  const cxNum = typeof cx === "number" ? cx : 0;
  const cyNum = typeof cy === "number" ? cy : 0;
  const midAngleNum = typeof midAngle === "number" ? midAngle : 0;
  const innerRadiusNum = typeof innerRadius === "number" ? innerRadius : 0;
  const outerRadiusNum = typeof outerRadius === "number" ? outerRadius : 0;
  const percentage = (percent ?? 0) * 100;

  // Only show label for slices > 8%
  if (percentage < 8) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadiusNum + (outerRadiusNum - innerRadiusNum) * 0.5;
  const x = cxNum + radius * Math.cos(-midAngleNum * RADIAN);
  const y = cyNum + radius * Math.sin(-midAngleNum * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
}

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: readonly { payload: ChartItem }[];
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const item = data.payload;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="font-medium">{item.name}</span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {formatCurrency(item.value, currency)} ({item.percentage.toFixed(1)}%)
      </div>
    </div>
  );
}

/**
 * Custom legend component
 */
function CustomLegend({
  currency,
  chartData,
}: {
  currency: string;
  chartData: ChartItem[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {chartData.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5 text-sm">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground truncate max-w-[100px]">
            {item.name}
          </span>
          <span className="font-medium">{formatCurrency(item.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Currency breakdown section for multi-currency users
 */
function CurrencyBreakdown({
  breakdown,
  rateTimestamp,
}: {
  breakdown: Array<{ currency: string; amount: number }>;
  rateTimestamp: string;
}) {
  const formattedDate = format(new Date(rateTimestamp), "MMM d, yyyy");

  return (
    <div className="mt-6 pt-4 border-t">
      <p className="text-sm font-medium mb-2">Original Currencies</p>
      <div className="flex flex-wrap gap-3">
        {breakdown.map(({ currency, amount }) => (
          <div
            key={currency}
            className="text-sm px-2 py-1 bg-muted rounded-md"
          >
            {formatCurrency(amount, currency)}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Rates as of {formattedDate}
      </p>
    </div>
  );
}
