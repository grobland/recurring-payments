import type { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { ReviewQueueList } from "@/components/recurring/review-queue-list";

export const metadata: Metadata = {
  title: "Review Queue",
};

export default function ReviewQueuePage() {
  return (
    <>
      <DashboardHeader
        title="Review Queue"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Recurring", href: "/recurring" },
          { label: "Review Queue" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Review Queue</h2>
          <p className="text-muted-foreground">
            Confirm or dismiss recurring payment candidates detected from your statements
          </p>
        </div>
        <ReviewQueueList />
      </main>
    </>
  );
}
