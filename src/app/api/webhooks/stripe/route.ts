import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeClient } from "@/lib/stripe/client";
import type Stripe from "stripe";

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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
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

  // TODO: Send email notification about failed payment
}
