"use client";

import { useState } from "react";
import { CheckCircle, Link2, EyeOff, XCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResolveReviewInput } from "@/lib/validations/recurring";

// ============ Types ============

type ReviewQueueItem = {
  id: string;
  itemType: string;
  confidence: number | null;
  suggestedAction: string | null;
  recurringSeriesId: string | null;
  recurringMasterId: string | null;
  series: {
    merchantName: string;
    avgAmount: number | null;
    currency: string;
    cadence: string | null;
    transactionCount: number;
  } | null;
  createdAt: string;
};

type MasterOption = {
  id: string;
  name: string;
  recurringKind: string;
};

interface ReviewQueueCardProps {
  item: ReviewQueueItem;
  onResolve: (data: ResolveReviewInput) => void;
  masters: MasterOption[];
  isResolving?: boolean;
}

// ============ Helpers ============

function confidenceBadgeClass(confidence: number | null): string {
  if (confidence === null) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (confidence >= 0.85) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  if (confidence >= 0.60) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
}

function formatConfidence(confidence: number | null): string {
  if (confidence === null) return "–";
  return `${Math.round(confidence * 100)}%`;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "–";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    subscription: "Subscription",
    utility: "Utility",
    insurance: "Insurance",
    loan: "Loan",
    rent_mortgage: "Rent/Mortgage",
    membership: "Membership",
    installment: "Installment",
    other_recurring: "Other",
  };
  return labels[kind] ?? kind;
}

// ============ Component ============

export function ReviewQueueCard({
  item,
  onResolve,
  masters,
  isResolving = false,
}: ReviewQueueCardProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);

  const series = item.series;
  const merchantName = series?.merchantName ?? "Unknown merchant";
  const confidence = item.confidence;

  function handleConfirm() {
    onResolve({ resolution: "confirmed" });
  }

  function handleIgnore() {
    onResolve({ resolution: "ignored" });
  }

  function handleNotRecurring() {
    onResolve({ resolution: "not_recurring" });
  }

  function handleLinkConfirm() {
    if (!selectedMasterId) return;
    onResolve({ resolution: "linked", targetMasterId: selectedMasterId });
    setLinkDialogOpen(false);
    setSelectedMasterId(null);
  }

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-tight">{merchantName}</h3>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(confidence)}`}
              >
                {formatConfidence(confidence)} confidence
              </span>
              {item.itemType && (
                <Badge variant="outline" className="text-xs capitalize">
                  {kindLabel(item.itemType)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3 space-y-3">
          {/* Series info */}
          {series && (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Avg Amount</p>
                <p className="font-medium">
                  {formatAmount(series.avgAmount, series.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cadence</p>
                <p className="font-medium capitalize">{series.cadence ?? "–"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-medium">{series.transactionCount}</p>
              </div>
            </div>
          )}

          {/* Suggested action */}
          {item.suggestedAction && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Suggested:</span>{" "}
              {item.suggestedAction.replace(/_/g, " ")}
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-3">
          <div className="flex flex-wrap gap-2 w-full">
            {/* Confirm */}
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
              onClick={handleConfirm}
              disabled={isResolving}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Confirm
            </Button>

            {/* Link to Existing */}
            {masters.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isResolving}>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Link to Existing
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {masters.map((master) => (
                    <DropdownMenuItem
                      key={master.id}
                      onClick={() => {
                        onResolve({ resolution: "linked", targetMasterId: master.id });
                      }}
                    >
                      <span className="font-medium">{master.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {kindLabel(master.recurringKind)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkDialogOpen(true)}
                disabled={isResolving}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                Link to Existing
              </Button>
            )}

            {/* Ignore */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleIgnore}
              disabled={isResolving}
            >
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              Ignore
            </Button>

            {/* Not Recurring */}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleNotRecurring}
              disabled={isResolving}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Not Recurring
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Link to Existing Dialog (for when there are no masters in dropdown) */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Existing Recurring Payment</DialogTitle>
            <DialogDescription>
              No existing recurring payments found. Create one first from the Recurring Payments page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Existing Dialog with master selection (for when there are many masters) */}
      {masters.length > 10 && (
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link to Existing Recurring Payment</DialogTitle>
              <DialogDescription>
                Select an existing recurring payment to link {merchantName} to.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-2">
              {masters.map((master) => (
                <button
                  key={master.id}
                  type="button"
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    selectedMasterId === master.id ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() => setSelectedMasterId(master.id)}
                >
                  <span className="font-medium">{master.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {kindLabel(master.recurringKind)}
                  </span>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLinkConfirm} disabled={!selectedMasterId}>
                Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
