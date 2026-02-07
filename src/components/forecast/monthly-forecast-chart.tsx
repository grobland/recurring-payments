"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useForecastMonthly } from "@/lib/hooks/use-forecast";
import { formatCurrency } from "@/lib/utils/currency";
import { format, parseISO } from "date-fns";

interface MonthlyForecastChartProps {
  months?: number;
  title?: string;
}

interface ChartDataPoint {
  monthLabel: string;
  month: string;
  forecast: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
  // Stacked band values for visualization
  band95_lower: number;
  band80_lower: number;
  band80_upper: number;
  band95_upper: number;
}

/**
 * Custom tooltip showing forecast with confidence intervals.
 */
function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-medium mb-1">{data.monthLabel}</p>
      <p className="text-sm">
        Forecast: {formatCurrency(data.forecast, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        80%: {formatCurrency(data.lower80, currency)} - {formatCurrency(data.upper80, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        95%: {formatCurrency(data.lower95, currency)} - {formatCurrency(data.upper95, currency)}
      </p>
    </div>
  );
}

/**
 * Monthly forecast chart with expanding confidence intervals.
 * Shows 3-6 month projections with 80% and 95% confidence bands.
 */
export function MonthlyForecastChart({
  months = 6,
  title = "Monthly Projections",
}: MonthlyForecastChartProps) {
  const { data, isLoading, isError, error } = useForecastMonthly(months);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Predicted spending with confidence intervals</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">Failed to load forecast</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error?.message || "Please try again later"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data?.forecasts || data.forecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Insufficient data for forecast</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add active subscriptions to see projections
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currency = data.displayCurrency;

  // Transform data for stacked area visualization
  const chartData: ChartDataPoint[] = data.forecasts.map((d) => ({
    monthLabel: format(parseISO(`${d.month}-01`), "MMM ''yy"),
    month: d.month,
    forecast: d.forecast,
    lower80: d.lower80,
    upper80: d.upper80,
    lower95: d.lower95,
    upper95: d.upper95,
    // Stack bands from bottom to top
    band95_lower: d.lower80 - d.lower95,
    band80_lower: d.forecast - d.lower80,
    band80_upper: d.upper80 - d.forecast,
    band95_upper: d.upper95 - d.upper80,
  }));

  const formatYAxis = (value: number) => formatCurrency(value, currency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Predicted spending with 80% and 95% confidence intervals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="monthlyBand95" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="monthlyBand80" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="monthLabel"
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
              tickFormatter={formatYAxis}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} />}
            />
            {/* Stacked areas for confidence bands */}
            <Area
              type="monotone"
              dataKey="lower95"
              stackId="1"
              stroke="transparent"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="band95_lower"
              stackId="1"
              stroke="transparent"
              fill="url(#monthlyBand95)"
            />
            <Area
              type="monotone"
              dataKey="band80_lower"
              stackId="1"
              stroke="transparent"
              fill="url(#monthlyBand80)"
            />
            <Area
              type="monotone"
              dataKey="band80_upper"
              stackId="1"
              stroke="transparent"
              fill="url(#monthlyBand80)"
            />
            <Area
              type="monotone"
              dataKey="band95_upper"
              stackId="1"
              stroke="transparent"
              fill="url(#monthlyBand95)"
            />
            {/* Forecast centerline (non-stacked) */}
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="none"
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs mt-4">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-primary/35 rounded" />
            <span>80% confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-primary/15 rounded" />
            <span>95% confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-4 bg-primary" />
            <span>Forecast</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
