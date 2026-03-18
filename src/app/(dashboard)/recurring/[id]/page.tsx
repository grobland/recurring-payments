import { DashboardHeader } from "@/components/layout";
import { RecurringMasterDetail } from "@/components/recurring/recurring-master-detail";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecurringDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <DashboardHeader
        title="Recurring Detail"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Recurring", href: "/recurring" },
          { label: "Detail" },
        ]}
      />
      <RecurringMasterDetail id={id} />
    </>
  );
}
