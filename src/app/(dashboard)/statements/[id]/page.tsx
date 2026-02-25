"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatementDetail } from "@/components/sources/statement-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StatementDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <>
      <DashboardHeader
        title="Statement Details"
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Sources", href: "/sources" },
          { label: "Statement Details" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back Link */}
          <Button variant="ghost" asChild className="-ml-2">
            <Link href="/sources">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sources
            </Link>
          </Button>

          {/* Statement Detail Content */}
          <StatementDetail statementId={id} />
        </div>
      </main>
    </>
  );
}
