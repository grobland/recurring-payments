import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { FinancialAccount } from "@/lib/db/schema";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/lib/validations/account";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";

// Query keys
export const accountKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: () => [...accountKeys.lists()] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

// Types
type AccountsResponse = {
  accounts: FinancialAccount[];
};

type AccountResponse = {
  account: FinancialAccount;
};

type DeleteResponse = {
  message: string;
};

// API functions

async function fetchAccounts(): Promise<AccountsResponse> {
  const response = await fetch("/api/accounts");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch accounts");
  }
  return response.json();
}

async function createAccount(
  data: CreateAccountInput
): Promise<AccountResponse> {
  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create account");
  }
  return response.json();
}

async function updateAccount({
  id,
  data,
}: {
  id: string;
  data: UpdateAccountInput;
}): Promise<AccountResponse> {
  const response = await fetch(`/api/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update account");
  }
  return response.json();
}

async function deleteAccount(id: string): Promise<DeleteResponse> {
  const response = await fetch(`/api/accounts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete account");
  }
  return response.json();
}

// Hooks

/**
 * Fetch all financial accounts for the current user
 */
export function useAccounts(
  options?: Omit<
    UseQueryOptions<AccountsResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  });
}

/**
 * Create a new financial account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (data) => {
      // Optimistically add to the list
      queryClient.setQueryData<AccountsResponse>(accountKeys.list(), (old) => {
        if (!old) return { accounts: [data.account] };
        return { accounts: [...old.accounts, data.account] };
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      // New account with linked source affects sources view
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
    },
  });
}

/**
 * Update an existing financial account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccount,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (data, variables) => {
      // Update the specific account in detail cache
      queryClient.setQueryData(accountKeys.detail(variables.id), data);
      // Update in the list cache
      queryClient.setQueryData<AccountsResponse>(accountKeys.list(), (old) => {
        if (!old) return old;
        return {
          accounts: old.accounts.map((account) =>
            account.id === variables.id ? data.account : account
          ),
        };
      });
      // CRITICAL (per STATE.md): invalidate five query keys on update
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Delete a financial account.
 *
 * NOTE: Named useDeleteFinancialAccount to avoid collision with useDeleteAccount
 * exported from use-user.ts (which handles GDPR user-account deletion).
 */
export function useDeleteFinancialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: accountKeys.detail(id) });
      // Remove from list cache
      queryClient.setQueryData<AccountsResponse>(accountKeys.list(), (old) => {
        if (!old) return old;
        return {
          accounts: old.accounts.filter((account) => account.id !== id),
        };
      });
      // Deleting an account unlinks its statements — invalidate affected views
      queryClient.invalidateQueries({ queryKey: ["vault", "coverage"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "timeline"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}

// Re-export FinancialAccount type for convenience
export type { FinancialAccount };
