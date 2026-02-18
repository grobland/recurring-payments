import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClient } from "@/lib/stripe/client";
import type Stripe from "stripe";
import { addDays } from "date-fns";
import { renderPaymentFailedEmail } from "@/lib/email/templates/payment-failed";
import { sendEmail } from "@/lib/email/client";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !webhookSecret) {
    console.error("Missing stripe signature or webhook secret");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Record start time for metrics
  const startTime = Date.now();
  const expiresAt = addDays(new Date(), 30);

  // Check idempotency with insert-on-conflict pattern
  try {
    await db.insert(webhookEvents).values({
      eventId: event.id,
      eventType: event.type,
      status: 'processing',
      expiresAt,
    });
  } catch (error: any) {
    if (error?.code === '23505') { // Unique violation
      console.log(`Duplicate event: ${event.id} (${event.type})`);
      return NextResponse.json({ received: true });
    }
    // Database connection issue - return 500 for retry
    console.error("Failed to record webhook event:", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }

  // Process the event
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Update webhook event as processed
    const processingTimeMs = Date.now() - startTime;
    await db
      .update(webhookEvents)
      .set({
        status: 'processed',
        processingTimeMs,
      })
      .where(eq(webhookEvents.eventId, event.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);

    // Update webhook event as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(webhookEvents.eventId, event.id));

    // Return 200 to prevent retries for non-retriable errors
    return NextResponse.json({ received: true });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error("Missing customer or subscription ID in checkout session");
    return;
  }

  // Get subscription details
  const stripe = getStripeClient();
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = subscriptionResponse as Stripe.Subscription;

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Get subscription item for period end
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end;

  // Update user with subscription info
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscriptionItem?.price.id,
      billingStatus: "active",
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Subscription activated for user: ${user.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Map subscription status
  let billingStatus: "active" | "cancelled" | "past_due" = "active";
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    billingStatus = "cancelled";
  } else if (subscription.status === "past_due") {
    billingStatus = "past_due";
  }

  // Get subscription item for period end
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end;

  // Update user
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscriptionItem?.price.id,
      billingStatus,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Subscription updated for user: ${user.id}, status: ${billingStatus}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Update user - subscription cancelled
  await db
    .update(users)
    .set({
      billingStatus: "cancelled",
      stripeSubscriptionId: null,
      stripePriceId: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Subscription cancelled for user: ${user.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  // In newer Stripe SDK, subscription is under parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  const subscriptionId = typeof subscriptionDetails?.subscription === 'string'
    ? subscriptionDetails.subscription
    : subscriptionDetails?.subscription?.id;

  if (!subscriptionId) return; // Not a subscription invoice

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Get subscription for current period end
  const stripe = getStripeClient();
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const subscription = subscriptionResponse as Stripe.Subscription;
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end;

  // Update user
  await db
    .update(users)
    .set({
      billingStatus: "active",
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Payment succeeded for user: ${user.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Update user to past_due status
  await db
    .update(users)
    .set({
      billingStatus: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Payment failed for user: ${user.id}`);

  // Send email notification (first attempt only)
  const attemptCount = invoice.attempt_count ?? 1;
  if (attemptCount > 1) {
    console.log(`Skipping email for retry attempt ${attemptCount}`);
    return;
  }

  try {
    // Create billing portal session for payment method update
    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      flow_data: {
        type: 'payment_method_update',
      },
    });

    // Prepare retry date (Stripe retries failed payments)
    const retryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Action Required: Payment Failed",
      html: renderPaymentFailedEmail({
        userName: user.name || "there",
        amount: (invoice.amount_due / 100).toFixed(2),
        currency: invoice.currency.toUpperCase(),
        billingPortalUrl: portalSession.url,
        retryDate,
      }),
    });

    console.log(`Payment failure email sent to: ${user.email}`);
  } catch (error) {
    console.error("Failed to send payment failure email:", error);
    // Don't fail the webhook if email fails
  }
}
