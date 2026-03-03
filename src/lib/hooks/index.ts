// Subscription hooks
export {
  subscriptionKeys,
  useSubscriptions,
  useSubscription,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useRestoreSubscription,
  usePrefetchSubscription,
  type SubscriptionFilters,
} from "./use-subscriptions";

// Category hooks
export {
  categoryKeys,
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryOptions,
} from "./use-categories";

// User hooks
export {
  userKeys,
  useUser,
  useUpdateUser,
  useDeleteAccount,
  useExportData,
  useUserStatus,
} from "./use-user";
// Import hooks
export { useImportSources } from "./use-import-sources";
export {
  importHistoryKeys,
  useImportHistory,
  type ImportHistoryItem,
} from "./use-import-history";

// Loading hooks
export { useDelayedLoading } from "./use-delayed-loading";

// Duplicate detection hooks
export { useDuplicateScan, type DuplicatePair } from "./use-duplicate-scan";
export { useMergeSubscription, type MergeRequest } from "./use-merge-subscription";

// Pattern recognition hooks
export { usePatternSuggestions } from "./use-pattern-suggestions";
export { useAcceptPattern } from "./use-accept-pattern";
export { useDismissPattern } from "./use-dismiss-pattern";

// Batch upload hooks
export {
  useBatchUpload,
  type QueuedFile,
  type FileStatus,
  type BatchUploadResult,
  type DuplicateAction,
} from "./use-batch-upload";

// Transaction hooks
export { useDebouncedValue } from "./use-debounced-value";
export { useTransactions, transactionKeys } from "./use-transactions";

// Source coverage hooks
export { useSources, sourceKeys } from "./use-sources";
export { useSourceStatements, sourceStatementKeys } from "./use-source-statements";
export { useStatementTransactions, statementTransactionKeys } from "./use-statement-transactions";

// Account CRUD hooks
export {
  accountKeys,
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteFinancialAccount,
} from "./use-accounts";

// Overlap detection hooks
export { useOverlapGroups } from "./use-overlap-groups";
export { useOverlapDismissals } from "./use-overlap-dismissals";

// Onboarding hint hooks
export { useHintDismissals } from "./use-hint-dismissals";
