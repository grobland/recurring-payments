import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import { VaultPage } from "@/components/vault/vault-page";

export const metadata: Metadata = {
  title: "Vault",
  description: "Browse all your stored bank statements",
};

export default function VaultRoutePage() {
  return (
    <>
      <DashboardHeader
        title="Vault"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vault" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <VaultPage />
        </div>
      </main>
    </>
  );
}
