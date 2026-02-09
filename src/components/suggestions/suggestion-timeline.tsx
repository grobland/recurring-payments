"use client";

import { format } from "date-fns";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { formatCurrency } from "@/lib/utils/currency";

interface SuggestionTimelineProps {
  chargeDates: string[];
  amounts: number[];
  currency: string;
}

interface ChartDataPoint {
  x: number;
  y: number;
  date: Date;
  amount: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  currency: string;
}

/**
 * Custom tooltip for the scatter chart showing date and formatted amount.
 */
function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{format(data.date, "MMM d, yyyy")}</p>
      <p className="text-muted-foreground">
        {formatCurrency(data.amount, currency)}
      </p>
    </div>
  );
}

/**
 * Mini timeline chart showing charge pattern over time.
 * Uses Recharts ScatterChart for compact visualization.
 */
export function SuggestionTimeline({
  chargeDates,
  amounts,
  currency,
}: SuggestionTimelineProps) {
  // Transform data for scatter chart
  const chartData: ChartDataPoint[] = chargeDates.map((dateStr, index) => {
    const date = new Date(dateStr);
    return {
      x: date.getTime(),
      y: amounts[index],
      date,
      amount: amounts[index],
    };
  });

  // Format x-axis tick as "MMM yyyy"
  const formatXAxisTick = (timestamp: number) => {
    return format(new Date(timestamp), "MMM yyyy");
  };

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatXAxisTick}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis type="number" dataKey="y" hide />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={false}
          />
          <Scatter
            data={chartData}
            fill="hsl(var(--primary))"
            fillOpacity={0.8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
