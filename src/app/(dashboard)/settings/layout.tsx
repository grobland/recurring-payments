"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CreditCard, Bell, Shield } from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { cn } from "@/lib/utils";

const settingsNav = [
  {
    title: "Profile",
    href: "/settings",
    icon: User,
  },
  {
    title: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    href: "/reminders",
    icon: Bell,
  },
  {
    title: "Privacy",
    href: "/settings/privacy",
    icon: Shield,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <DashboardHeader
        title="Settings"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Sidebar Navigation */}
            <nav className="w-full md:w-48 shrink-0">
              <ul className="flex flex-row gap-2 md:flex-col">
                {settingsNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content */}
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </main>
    </>
  );
}
