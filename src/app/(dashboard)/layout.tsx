import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout";
import { TrialBannerWrapper } from "@/components/billing";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Set user context for Sentry error tracking
  Sentry.setUser({
    id: session.user.id,
    email: session.user.email || undefined,
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TrialBannerWrapper />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
