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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useForecastAnnual } from "@/lib/hooks/use-forecast";
import { formatCurrency } from "@/lib/utils/currency";
import { format, parseISO } from "date-fns";

interface FanChartDataPoint {
  month: string;
  monthLabel: string;
  // Stacked values for fan effect
  lower95: number;
  band95_lower: number;
  band80_lower: number;
  band80_upper: number;
  band95_upper: number;
  // Original values for tooltip
  _forecast: number;
  _lower80: number;
  _upper80: number;
  _lower95: number;
  _upper95: number;
}

/**
 * Custom tooltip showing forecast with both confidence intervals.
 */
function FanChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: FanChartDataPoint }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-medium mb-1">{data.monthLabel}</p>
      <p className="text-sm">
        Forecast: {formatCurrency(data._forecast, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        80%: {formatCurrency(data._lower80, currency)} -{" "}
        {formatCurrency(data._upper80, currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        95%: {formatCurrency(data._lower95, currency)} -{" "}
        {formatCurrency(data._upper95, currency)}
      </p>
    </div>
  );
}

/**
 * Annual forecast fan chart with expanding confidence intervals.
 * Shows 12-month projection with bands that widen over time (fan effect).
 */
export function AnnualForecastFanChart() {
  const { data, isLoading, isError, error } = useForecastAnnual();

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Forecast</CardTitle>
          <CardDescription>12-month spending projection with uncertainty</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Forecast</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
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
  if (!data?.monthlyProjections || data.monthlyProjections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Annual Forecast</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
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

  // Transform data for stacked areas creating fan effect
  const chartData: FanChartDataPoint[] = data.monthlyProjections.map((d) => ({
    month: d.month,
    monthLabel: format(parseISO(`${d.month}-01`), "MMM ''yy"),
    // Stack from bottom: lower95 -> band95_lower -> band80_lower -> band80_upper -> band95_upper
    lower95: d.lower95,
    band95_lower: d.lower80 - d.lower95,
    band80_lower: d.forecast - d.lower80,
    band80_upper: d.upper80 - d.forecast,
    band95_upper: d.upper95 - d.upper80,
    // Original values for tooltip
    _forecast: d.forecast,
    _lower80: d.lower80,
    _upper80: d.upper80,
    _lower95: d.lower95,
    _upper95: d.upper95,
  }));

  const formatYAxis = (value: number) => formatCurrency(value, currency);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Annual Forecast</CardTitle>
            <CardDescription className="mt-1">
              12-month projection with expanding confidence intervals
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {formatCurrency(data.forecast, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              95% CI: {formatCurrency(data.lower95, currency)} -{" "}
              {formatCurrency(data.upper95, currency)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="annualBand95" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="annualBand80" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.25}
                />
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
            <Tooltip content={<FanChartTooltip currency={currency} />} />
            {/* Stacked areas for confidence bands (order matters for fan effect) */}
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
              fill="url(#annualBand95)"
            />
            <Area
              type="monotone"
              dataKey="band80_lower"
              stackId="1"
              stroke="transparent"
              fill="url(#annualBand80)"
            />
            <Area
              type="monotone"
              dataKey="band80_upper"
              stackId="1"
              stroke="transparent"
              fill="url(#annualBand80)"
            />
            <Area
              type="monotone"
              dataKey="band95_upper"
              stackId="1"
              stroke="transparent"
              fill="url(#annualBand95)"
            />
            {/* Forecast centerline (not stacked) */}
            <Area
              type="monotone"
              dataKey="_forecast"
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
        <p className="text-xs text-muted-foreground text-center mt-2">
          Confidence bands widen over time reflecting increasing uncertainty
        </p>
      </CardContent>
    </Card>
  );
}
