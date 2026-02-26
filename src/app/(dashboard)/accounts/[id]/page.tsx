import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { AccountDetailPage } from "@/components/accounts/account-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Account Detail",
  description: "View and manage your financial account",
};

export default async function AccountDetailRoutePage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <DashboardHeader
        title="data Vault"
        breadcrumbs={[
          { label: "data Vault", href: "/accounts" },
          { label: "Account" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <AccountDetailPage accountId={id} />
        </div>
      </main>
    </>
  );
}
