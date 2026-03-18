"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCcw,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import {
  useRecurringMasters,
  useCreateMaster,
  type RecurringMasterFilters,
} from "@/lib/hooks/use-recurring";
import { useDelayedLoading, useDebouncedValue } from "@/lib/hooks";
import { createMasterSchema, type CreateMasterInput } from "@/lib/validations/recurring";

// ============ Types ============

type Master = {
  id: string;
  name: string;
  recurringKind: string;
  status: string;
  expectedAmount: number | null;
  currency: string;
  billingFrequency: string | null;
  nextExpectedDate: string | null;
  confidence: number | null;
  merchantName: string | null;
  createdAt: string;
};

// ============ Badge Helpers ============

const KIND_CLASSES: Record<string, string> = {
  subscription: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  utility: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  insurance: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  loan: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  rent_mortgage: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  membership: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  installment: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  other_recurring: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  dormant: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  needs_review: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const KIND_LABELS: Record<string, string> = {
  subscription: "Subscription",
  utility: "Utility",
  insurance: "Insurance",
  loan: "Loan",
  rent_mortgage: "Rent/Mortgage",
  membership: "Membership",
  installment: "Installment",
  other_recurring: "Other",
};

function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${KIND_CLASSES[kind] ?? KIND_CLASSES.other_recurring}`}
    >
      {KIND_LABELS[kind] ?? kind}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? STATUS_CLASSES.dormant}`}
    >
      {label}
    </span>
  );
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "–";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============ Filter Tabs ============

type TabKey = "all" | "subscriptions" | "bills" | "needs_review" | "paused_cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "bills", label: "Bills" },
  { key: "needs_review", label: "Needs Review" },
  { key: "paused_cancelled", label: "Paused/Cancelled" },
];

function tabToFilters(tab: TabKey): Partial<RecurringMasterFilters> {
  switch (tab) {
    case "subscriptions":
      return { kind: "subscription" };
    case "bills":
      return { kind: "utility" };
    case "needs_review":
      return { status: "needs_review" };
    case "paused_cancelled":
      return { status: "paused,cancelled" };
    default:
      return {};
  }
}

// ============ Add Manual Dialog ============

function AddManualDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMaster = useCreateMaster();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateMasterInput>({
    resolver: zodResolver(createMasterSchema) as any,
    defaultValues: {
      name: "",
      recurringKind: "subscription",
      currency: "USD",
    },
  });

  function onSubmit(values: CreateMasterInput) {
    createMaster.mutate(values, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Recurring Payment</DialogTitle>
          <DialogDescription>
            Manually add a recurring payment to track it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Netflix, Rent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recurringKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select kind" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="rent_mortgage">Rent/Mortgage</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="installment">Installment</SelectItem>
                      <SelectItem value="other_recurring">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency *</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : parseFloat(e.target.value)
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="billingFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMaster.isPending}>
                {createMaster.isPending ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Table Skeleton ============

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============ Mobile Card ============

function MasterCard({ master }: { master: Master }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/recurring/${master.id}`}
            className="font-medium hover:underline leading-tight"
          >
            {master.name}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <KindBadge kind={master.recurringKind} />
            <StatusBadge status={master.status} />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-medium">
              {formatAmount(master.expectedAmount, master.currency)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Frequency: </span>
            <span className="capitalize">{master.billingFrequency ?? "–"}</span>
          </div>
          {master.nextExpectedDate && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Next: </span>
              <span>{formatDate(master.nextExpectedDate)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Main Component ============

export function RecurringMasterTable() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [searchParam, setSearchParam] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const debouncedSearch = useDebouncedValue(searchParam, 300);

  const tabFilters = tabToFilters(activeTab);
  const filters: RecurringMasterFilters = {
    ...tabFilters,
    search: debouncedSearch || undefined,
  };

  const { data: response, isLoading, error, refetch } = useRecurringMasters(filters);
  const showSkeleton = useDelayedLoading(isLoading);

  const masters: Master[] =
    (response as { data?: { masters: Master[] } } | undefined)?.data?.masters ?? [];

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchParam}
              onChange={(e) => setSearchParam(e.target.value || null)}
              className="pl-9 h-8 w-44"
            />
          </div>
          <Button size="sm" className="h-8" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Content */}
      {showSkeleton ? (
        <>
          <TableSkeleton />
        </>
      ) : error ? (
        <ServiceUnavailable
          serviceName="Recurring Payments"
          onRetry={() => refetch()}
          className="max-w-md mx-auto"
        />
      ) : masters.length === 0 ? (
        <EmptyState
          icon={RefreshCcw}
          title="No recurring payments found"
          description={
            activeTab === "all"
              ? "Add a recurring payment manually or import statements to detect them automatically."
              : "No payments match this filter. Try a different tab."
          }
          primaryAction={
            activeTab === "all"
              ? {
                  label: "Add Manual",
                  href: "#",
                }
              : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-x-auto animate-in fade-in duration-150">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.map((master) => (
                  <TableRow
                    key={master.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      window.location.href = `/recurring/${master.id}`;
                    }}
                  >
                    <TableCell>
                      <Link
                        href={`/recurring/${master.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {master.name}
                      </Link>
                      {master.merchantName && master.merchantName !== master.name && (
                        <p className="text-xs text-muted-foreground">
                          {master.merchantName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <KindBadge kind={master.recurringKind} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={master.status} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(master.expectedAmount, master.currency)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {master.billingFrequency ?? "–"}
                    </TableCell>
                    <TableCell>{formatDate(master.nextExpectedDate)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/recurring/${master.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {masters.map((master) => (
              <MasterCard key={master.id} master={master} />
            ))}
          </div>
        </>
      )}

      {/* Add Manual Dialog */}
      <AddManualDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
