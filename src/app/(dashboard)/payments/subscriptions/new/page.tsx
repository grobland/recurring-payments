"use client";

import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout";
import { SubscriptionForm } from "@/components/subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateSubscription } from "@/lib/hooks";
import type { CreateSubscriptionInput } from "@/lib/validations/subscription";
import { toast } from "sonner";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const createMutation = useCreateSubscription();

  const handleSubmit = async (data: CreateSubscriptionInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Subscription created successfully");
      router.push("/payments/subscriptions");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create subscription"
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <DashboardHeader
        title="New Subscription"
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Subscriptions", href: "/payments/subscriptions" },
          { label: "New" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Add New Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={createMutation.isPending}
              submitLabel="Create Subscription"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
