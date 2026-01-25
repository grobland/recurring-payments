import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { User } from "@/lib/db/schema";

// Query keys
export const userKeys = {
  all: ["user"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
};

// Types
type UserProfile = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "image"
  | "displayCurrency"
  | "locale"
  | "reminderDaysBefore"
  | "emailRemindersEnabled"
  | "billingStatus"
  | "trialEndDate"
  | "currentPeriodEnd"
  | "onboardingCompleted"
>;

type UserResponse = {
  user: UserProfile;
};

type UpdateUserInput = {
  name?: string;
  displayCurrency?: string;
  locale?: string;
  reminderDaysBefore?: number[];
  emailRemindersEnabled?: boolean;
};

// API functions
async function fetchUser(): Promise<UserResponse> {
  const response = await fetch("/api/user");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch user");
  }
  return response.json();
}

async function updateUser(data: UpdateUserInput): Promise<UserResponse> {
  const response = await fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update user");
  }
  return response.json();
}

async function deleteAccount(confirmation: string): Promise<{ message: string }> {
  const response = await fetch("/api/user/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete account");
  }
  return response.json();
}

async function exportData(): Promise<Blob> {
  const response = await fetch("/api/user/export");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to export data");
  }
  return response.blob();
}

// Hooks

/**
 * Get current user profile
 */
export function useUser(
  options?: Omit<UseQueryOptions<UserResponse, Error>, "queryKey" | "queryFn">
) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: fetchUser,
    enabled: status === "authenticated" && !!session?.user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Update user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.profile(), data);
    },
  });
}

/**
 * Delete user account (GDPR)
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
    // After deletion, the user will be signed out, so no cache invalidation needed
  });
}

/**
 * Export user data (GDPR)
 */
export function useExportData() {
  return useMutation({
    mutationFn: exportData,
    onSuccess: (blob) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscription-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

/**
 * Check if user is in trial or has active subscription
 */
export function useUserStatus() {
  const { data, isLoading, error } = useUser();

  const user = data?.user;
  const now = new Date();
  const trialEndDate = user?.trialEndDate ? new Date(user.trialEndDate) : null;

  const isTrialActive =
    user?.billingStatus === "trial" && trialEndDate && trialEndDate > now;

  const isPaid = user?.billingStatus === "active";

  const isActive = isTrialActive || isPaid;

  const daysLeftInTrial = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    user,
    isLoading,
    error,
    isTrialActive,
    isPaid,
    isActive,
    daysLeftInTrial,
    billingStatus: user?.billingStatus,
    needsOnboarding: user && !user.onboardingCompleted,
  };
}
