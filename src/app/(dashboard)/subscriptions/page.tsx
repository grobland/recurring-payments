"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  ExternalLink,
  Filter,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  useSubscriptions,
  useDeleteSubscription,
  useRestoreSubscription,
  useCategoryOptions,
  type SubscriptionFilters,
} from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, getDaysUntil } from "@/lib/utils/dates";
import { toast } from "sonner";

export default function SubscriptionsPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionFilters["status"]>(
    initialFilter === "needs-attention" ? "active" : "all"
  );
  const [category, setCategory] = useState<string>("all");
  const [frequency, setFrequency] = useState<SubscriptionFilters["frequency"]>("all");
  const [sortBy, setSortBy] = useState<SubscriptionFilters["sortBy"]>("nextRenewalDate");
  const [sortOrder, setSortOrder] = useState<SubscriptionFilters["sortOrder"]>("asc");
  const [showDeleted, setShowDeleted] = useState(false);

  const filters: SubscriptionFilters = {
    status: status === "all" ? undefined : status,
    category: category === "all" ? undefined : category,
    frequency: frequency === "all" ? undefined : frequency,
    search: search || undefined,
    sortBy,
    sortOrder,
    includeDeleted: showDeleted,
  };

  const { data, isLoading, error } = useSubscriptions(filters);
  const { options: categoryOptions } = useCategoryOptions();
  const deleteMutation = useDeleteSubscription();
  const restoreMutation = useRestoreSubscription();

  const subscriptions = data?.subscriptions ?? [];
  const summary = data?.summary;

  // Filter for needs attention if specified
  const displayedSubscriptions =
    initialFilter === "needs-attention"
      ? subscriptions.filter((sub) => sub.needsUpdate)
      : subscriptions;

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`"${name}" deleted`, {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(id),
        },
      });
    } catch (error) {
      toast.error("Failed to delete subscription");
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success(`"${name}" restored`);
    } catch (error) {
      toast.error("Failed to restore subscription");
    }
  };

  return (
    <>
      <DashboardHeader
        title="Subscriptions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Subscriptions" },
        ]}
      />
      <main className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
            <p className="text-muted-foreground">
              Manage all your recurring payments
            </p>
          </div>
          <Button asChild>
            <Link href="/subscriptions/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Monthly</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totalMonthly, "USD")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Active</div>
                <div className="text-2xl font-bold">{summary.activeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Paused</div>
                <div className="text-2xl font-bold">{summary.pausedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Next 7 Days</div>
                <div className="text-2xl font-bold">
                  {summary.upcomingRenewals?.next7Days ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as typeof frequency)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as typeof sortBy)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nextRenewalDate">Renewal Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="createdAt">Date Added</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            Failed to load subscriptions. Please try again.
          </div>
        ) : displayedSubscriptions.length === 0 ? (
          <EmptyState hasFilters={!!search || status !== "all" || category !== "all"} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Renewal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSubscriptions.map((subscription) => {
                  const daysUntil = getDaysUntil(subscription.nextRenewalDate);
                  const isDeleted = subscription.deletedAt !== null;

                  return (
                    <TableRow
                      key={subscription.id}
                      className={isDeleted ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full"
                            style={{
                              backgroundColor:
                                subscription.category?.color ?? "#9E9E9E",
                            }}
                          >
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <Link
                              href={`/subscriptions/${subscription.id}`}
                              className="font-medium hover:underline"
                            >
                              {subscription.name}
                            </Link>
                            {subscription.needsUpdate && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Needs Update
                              </Badge>
                            )}
                            {subscription.url && (
                              <a
                                href={subscription.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 inline-flex text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {subscription.category?.name ?? "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(
                          parseFloat(subscription.amount),
                          subscription.currency
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {subscription.frequency}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(subscription.nextRenewalDate)}</span>
                          <span className="text-xs text-muted-foreground">
                            {daysUntil === 0
                              ? "Today"
                              : daysUntil === 1
                              ? "Tomorrow"
                              : daysUntil < 0
                              ? `${Math.abs(daysUntil)} days ago`
                              : `In ${daysUntil} days`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={subscription.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isDeleted ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRestore(subscription.id, subscription.name)
                                }
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/subscriptions/${subscription.id}`}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/subscriptions/${subscription.id}/edit`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleDelete(subscription.id, subscription.name)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: "active" | "paused" | "cancelled" }) {
  const variants = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variants[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <CreditCard className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">
        {hasFilters ? "No subscriptions found" : "No subscriptions yet"}
      </h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters to find what you're looking for."
          : "Get started by adding your first subscription."}
      </p>
      {!hasFilters && (
        <Button asChild className="mt-4">
          <Link href="/subscriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Link>
        </Button>
      )}
    </div>
  );
}
