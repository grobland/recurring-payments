"use client";

/**
 * Dynamic (lazy-loaded) wrappers for recharts-based forecast chart components.
 * Exported from a Client Component file so that `ssr: false` is permitted.
 * Server Component forecast pages import from here instead of directly.
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const MonthlyForecastChartDynamic = dynamic(
  () =>
    import("@/components/forecast/monthly-forecast-chart").then((m) => ({
      default: m.MonthlyForecastChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

export const AnnualForecastFanChartDynamic = dynamic(
  () =>
    import("@/components/forecast/annual-forecast-fan-chart").then((m) => ({
      default: m.AnnualForecastFanChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);
