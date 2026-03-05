import { Metadata } from "next";
import { UpcomingChargesCalendar } from "@/components/forecast/upcoming-charges-calendar";
import {
  MonthlyForecastChartDynamic as MonthlyForecastChart,
  AnnualForecastFanChartDynamic as AnnualForecastFanChart,
} from "@/components/forecast/forecast-charts-dynamic";

export const metadata: Metadata = {
  title: "Spending Forecast | Subscription Manager",
  description: "View predicted future spending with confidence intervals",
};

/**
 * Forecasting dashboard page.
 *
 * Displays three forecast views:
 * - FCST-01: Upcoming charges calendar with 30/60/90 day selector
 * - FCST-02: Monthly projections with confidence bands
 * - FCST-03/04: Annual fan chart with expanding 80%/95% intervals
 */
export default function ForecastingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Spending Forecast</h1>
        <p className="text-muted-foreground">
          View predicted future spending based on your active subscriptions
        </p>
      </div>

      {/* Upcoming Charges Calendar - FCST-01 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming Charges</h2>
        <UpcomingChargesCalendar />
      </section>

      {/* Monthly Projections - FCST-02 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Monthly Projections</h2>
        <MonthlyForecastChart months={6} />
      </section>

      {/* Annual Forecast - FCST-03, FCST-04 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Annual Forecast</h2>
        <AnnualForecastFanChart />
      </section>
    </div>
  );
}
