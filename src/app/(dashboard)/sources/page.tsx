import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { SourceDashboard } from "@/components/sources/source-dashboard";

export const metadata: Metadata = {
  title: "Statement Sources",
  description: "View your imported statements organized by source",
};

export default function SourcesPage() {
  return (
    <>
      <DashboardHeader
        title="Statement Sources"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sources" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Statement Sources</h2>
            <p className="text-muted-foreground">
              View your imported statements organized by source
            </p>
          </div>

          {/* Source Dashboard */}
          <SourceDashboard />
        </div>
      </main>
    </>
  );
}
