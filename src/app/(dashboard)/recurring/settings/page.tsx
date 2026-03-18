import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { MerchantAliasManager } from "@/components/recurring/merchant-alias-manager";

export const metadata: Metadata = {
  title: "Recurring Settings",
};

export default function RecurringSettingsPage() {
  return (
    <>
      <DashboardHeader
        title="Recurring Settings"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Recurring", href: "/recurring" },
          { label: "Settings" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Merchant Aliases</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage merchant names and their aliases to improve recurring payment detection.
            </p>
          </div>

          <MerchantAliasManager />

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Detection thresholds are system-defined and cannot be customized. The system automatically determines cadence and confidence scores based on your transaction history.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
