import { Metadata } from "next";
import { Database } from "lucide-react";
import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";

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
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <Database className="size-16 text-muted-foreground/30" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No accounts yet</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Financial accounts let you organize your bank statements and
                track where your money moves.
              </p>
            </div>
            <Button disabled>Create Account</Button>
          </div>
        </div>
      </main>
    </>
  );
}
