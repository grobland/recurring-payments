import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireOnboarding() {
  const user = await requireAuth();
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }
  return user;
}

export function isUserActive(user: {
  billingStatus: string;
  trialEndDate: string | null;
}): boolean {
  const now = new Date();

  // Trial is active
  if (user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate);
    if (trialEnd > now) {
      return true;
    }
  }

  // Paid subscription is active
  if (user.billingStatus === "active") {
    return true;
  }

  return false;
}

export function canUserEdit(user: {
  billingStatus: string;
  trialEndDate: string | null;
}): boolean {
  return isUserActive(user);
}

export function getTrialDaysRemaining(trialEndDate: string | null): number {
  if (!trialEndDate) return 0;

  const now = new Date();
  const end = new Date(trialEndDate);
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

export function isTrialExpired(trialEndDate: string | null): boolean {
  if (!trialEndDate) return true;

  const now = new Date();
  const end = new Date(trialEndDate);

  return now > end;
}
