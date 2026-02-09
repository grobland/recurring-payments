"use client";

import { Badge } from "@/components/ui/badge";

type ImportStatus = "converted" | "skipped" | "pending";

interface TransactionStatusBadgeProps {
  status: ImportStatus;
}

const statusConfig: Record<
  ImportStatus,
  { variant: "success" | "warning" | "secondary"; label: string }
> = {
  converted: { variant: "success", label: "Converted" },
  skipped: { variant: "warning", label: "Skipped" },
  pending: { variant: "secondary", label: "Pending" },
};

/**
 * Maps transaction tagStatus to import status for display
 *
 * @param tagStatus - The transaction's tagStatus from the database
 * @returns The import status for badge display
 *
 * Mapping:
 * - "converted" -> "converted" (green/success)
 * - "not_subscription" -> "skipped" (yellow/warning)
 * - "unreviewed" | "potential_subscription" -> "pending" (gray/secondary)
 */
export function getImportStatus(tagStatus: string): ImportStatus {
  switch (tagStatus) {
    case "converted":
      return "converted";
    case "not_subscription":
      return "skipped";
    case "unreviewed":
    case "potential_subscription":
    default:
      return "pending";
  }
}

/**
 * Badge component that displays transaction import status with appropriate colors
 *
 * - Converted: Green (success) - transaction was converted to a subscription
 * - Skipped: Yellow (warning) - user marked as not a subscription
 * - Pending: Gray (secondary) - unreviewed or potential subscription
 */
export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
