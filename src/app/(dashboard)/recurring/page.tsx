import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { RecurringMasterTable } from "@/components/recurring/recurring-master-table";

export const metadata: Metadata = {
  title: "Recurring Payments",
};

export default function RecurringPage() {
  return (
    <>
      <DashboardHeader
        title="Recurring Payments"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Recurring Payments" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Recurring Payments</h2>
          <p className="text-muted-foreground">
            Browse and manage all your recurring payments
          </p>
        </div>
        <RecurringMasterTable />
      </main>
    </>
  );
}
