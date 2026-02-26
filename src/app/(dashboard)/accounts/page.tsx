import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { AccountList } from "@/components/accounts";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Manage your financial accounts",
};

export default function AccountsPage() {
  return (
    <>
      <DashboardHeader title="data Vault" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <AccountList />
        </div>
      </main>
    </>
  );
}
