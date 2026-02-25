"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  CreditCard,
  Bell,
  Clock,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubscription, useDeleteSubscription } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { getDaysUntil } from "@/lib/utils/dates";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SubscriptionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useSubscription(id);
  const deleteMutation = useDeleteSubscription();

  const subscription = data?.subscription;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Subscription deleted");
      router.push("/payments/subscriptions");
    } catch (error) {
      toast.error("Failed to delete subscription");
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          title="Subscription"
          breadcrumbs={[
            { label: "subs Dash", href: "/payments/dashboard" },
            { label: "Subscriptions", href: "/payments/subscriptions" },
            { label: "Loading..." },
          ]}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </>
    );
  }

  if (error || !subscription) {
    return (
      <>
        <DashboardHeader
          title="Subscription"
          breadcrumbs={[
            { label: "subs Dash", href: "/payments/dashboard" },
            { label: "Subscriptions", href: "/payments/subscriptions" },
            { label: "Not Found" },
          ]}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold">Subscription not found</h2>
            <p className="mt-2 text-muted-foreground">
              The subscription you're looking for doesn't exist or has been deleted.
            </p>
            <Button asChild className="mt-4">
              <Link href="/payments/subscriptions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subscriptions
              </Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  const daysUntil = getDaysUntil(subscription.nextRenewalDate);

  return (
    <>
      <DashboardHeader
        title={subscription.name}
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Subscriptions", href: "/payments/subscriptions" },
          { label: subscription.name },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: subscription.category?.color ?? "#9E9E9E",
                }}
              >
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{subscription.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {subscription.category?.name ?? "Uncategorized"}
                  </Badge>
                  <StatusBadge status={subscription.status} />
                  {subscription.needsUpdate && (
                    <Badge variant="destructive">Needs Update</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="h-11" asChild>
                <Link href={`/payments/subscriptions/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="h-11">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete "{subscription.name}". You can restore it
                      within 30 days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Cost Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      parseFloat(subscription.amount),
                      subscription.currency
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {subscription.frequency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      parseFloat(subscription.normalizedMonthlyAmount),
                      subscription.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yearly Cost</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      parseFloat(subscription.normalizedMonthlyAmount) * 12,
                      subscription.currency
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Renewal Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Renewal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Next Renewal</p>
                  <p className="text-xl font-semibold">
                    {format(new Date(subscription.nextRenewalDate), "PPP")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {daysUntil === 0
                      ? "Today"
                      : daysUntil === 1
                      ? "Tomorrow"
                      : daysUntil < 0
                      ? `${Math.abs(daysUntil)} days ago`
                      : `In ${daysUntil} days`}
                  </p>
                </div>
                {subscription.startDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subscribed Since
                    </p>
                    <p className="text-xl font-semibold">
                      {format(new Date(subscription.startDate), "PPP")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reminders Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div
                  className={`h-3 w-3 rounded-full ${
                    subscription.reminderEnabled ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span>
                  {subscription.reminderEnabled
                    ? "Email reminders enabled"
                    : "Email reminders disabled"}
                </span>
              </div>
              {subscription.reminderEnabled && subscription.reminderDaysBefore && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You'll be reminded{" "}
                  {(subscription.reminderDaysBefore as number[]).join(" and ")}{" "}
                  days before renewal
                </p>
              )}
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p>{subscription.description}</p>
                </div>
              )}

              {subscription.url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Website
                  </p>
                  <a
                    href={subscription.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {subscription.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {subscription.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap">{subscription.notes}</p>
                </div>
              )}
              {/* Import Source */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Source
                </p>
                {subscription.importAudit?.statementSource ? (
                  <p>{subscription.importAudit.statementSource}</p>
                ) : (
                  <p className="text-muted-foreground">Manual entry</p>
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Added on {format(new Date(subscription.createdAt), "PPP")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
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
