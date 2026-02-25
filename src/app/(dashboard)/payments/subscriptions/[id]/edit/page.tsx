"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout";
import { SubscriptionForm } from "@/components/subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription, useUpdateSubscription } from "@/lib/hooks";
import type { CreateSubscriptionInput } from "@/lib/validations/subscription";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditSubscriptionPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useSubscription(id);
  const updateMutation = useUpdateSubscription();

  const subscription = data?.subscription;

  const handleSubmit = async (data: CreateSubscriptionInput) => {
    try {
      await updateMutation.mutateAsync({ id, data });
      toast.success("Subscription updated successfully");
      router.push(`/payments/subscriptions/${id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update subscription"
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader
          title="Edit Subscription"
          breadcrumbs={[
            { label: "subs Dash", href: "/payments/dashboard" },
            { label: "Subscriptions", href: "/payments/subscriptions" },
            { label: "Loading..." },
          ]}
        />
        <main className="flex-1 p-4 md:p-6">
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (error || !subscription) {
    return (
      <>
        <DashboardHeader
          title="Edit Subscription"
          breadcrumbs={[
            { label: "subs Dash", href: "/payments/dashboard" },
            { label: "Subscriptions", href: "/payments/subscriptions" },
            { label: "Not Found" },
          ]}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold">Subscription not found</h2>
            <p className="mt-2 text-muted-foreground">
              The subscription you're trying to edit doesn't exist.
            </p>
          </div>
        </main>
      </>
    );
  }

  const defaultValues: Partial<CreateSubscriptionInput> = {
    name: subscription.name,
    description: subscription.description,
    notes: subscription.notes,
    url: subscription.url,
    categoryId: subscription.categoryId,
    amount: parseFloat(subscription.amount),
    currency: subscription.currency,
    frequency: subscription.frequency,
    nextRenewalDate: new Date(subscription.nextRenewalDate),
    startDate: subscription.startDate
      ? new Date(subscription.startDate)
      : null,
    status: subscription.status,
    reminderEnabled: subscription.reminderEnabled,
    reminderDaysBefore: subscription.reminderDaysBefore as number[] | null,
  };

  return (
    <>
      <DashboardHeader
        title={`Edit ${subscription.name}`}
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Subscriptions", href: "/payments/subscriptions" },
          { label: subscription.name, href: `/payments/subscriptions/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Edit Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionForm
              defaultValues={defaultValues}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
