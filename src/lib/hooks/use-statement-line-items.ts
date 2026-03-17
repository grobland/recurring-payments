"use client";

import { useQuery } from "@tanstack/react-query";

export interface LineItem {
  id: string;
  statementId: string;
  sequenceNumber: number;
  transactionDate: string | null;
  description: string;
  amount: string | null;
  currency: string | null;
  balance: string | null;
  documentType: "bank_debit" | "credit_card" | "loan";
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface LineItemsResponse {
  lineItems: LineItem[];
  lineItemCount: number;
  documentType: "bank_debit" | "credit_card" | "loan" | null;
  statementId: string;
}

export const lineItemKeys = {
  all: ["line-items"] as const,
  byStatement: (id: string) => [...lineItemKeys.all, id] as const,
};

async function fetchLineItems(statementId: string): Promise<LineItemsResponse> {
  const res = await fetch(`/api/statements/${statementId}/line-items`);
  if (!res.ok) {
    throw new Error(`Failed to fetch line items: ${res.status}`);
  }
  return res.json();
}

export function useStatementLineItems(statementId: string | undefined) {
  return useQuery({
    queryKey: lineItemKeys.byStatement(statementId ?? ""),
    queryFn: () => fetchLineItems(statementId!),
    enabled: !!statementId,
    staleTime: 5 * 60 * 1000, // 5 min — line items are immutable
  });
}
