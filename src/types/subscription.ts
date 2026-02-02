import type { Subscription, Category, ImportAudit } from "@/lib/db/schema";

export type SubscriptionWithCategory = Subscription & {
  category: Pick<Category, "id" | "name" | "slug" | "icon" | "color"> | null;
  importAudit?: Pick<ImportAudit, "id" | "statementSource" | "createdAt"> | null;
};

export type SubscriptionListItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: "monthly" | "yearly";
  normalizedMonthlyAmount: string;
  nextRenewalDate: Date;
  status: "active" | "paused" | "cancelled";
  needsUpdate: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
};

export type SubscriptionSummary = {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  upcomingRenewals: {
    next7Days: number;
    next14Days: number;
    next30Days: number;
  };
};

export type UpcomingRenewal = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  nextRenewalDate: Date;
  daysUntilRenewal: number;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
};
