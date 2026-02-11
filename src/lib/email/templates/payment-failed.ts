import { emailLayout, APP_NAME } from "./base";

export interface PaymentFailedEmailProps {
  userName: string;
  amount: string;
  currency: string;
  billingPortalUrl: string;
  retryDate: Date;
}

export function renderPaymentFailedEmail({
  userName,
  amount,
  currency,
  billingPortalUrl,
  retryDate,
}: PaymentFailedEmailProps): string {
  const formattedRetryDate = retryDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = `
    <h1>Action Required: Payment Failed</h1>
    <p>Hi ${userName || "there"},</p>
    <p>We were unable to process your subscription payment of <strong>${amount} ${currency}</strong>.</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b;"><strong>Common reasons for payment failures:</strong></p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #991b1b;">
        <li>Insufficient funds in your account</li>
        <li>Expired or outdated card details</li>
        <li>Card issuer declined the transaction</li>
      </ul>
    </div>

    <p><strong>What happens next:</strong></p>
    <p>We'll automatically retry your payment on <strong>${formattedRetryDate}</strong>. To avoid any service interruption, please update your payment method now.</p>

    <p style="text-align: center; margin: 32px 0;">
      <a href="${billingPortalUrl}" class="button">Update Payment Method</a>
    </p>

    <p class="muted">
      If you have any questions or need assistance, please reply to this email and we'll be happy to help.
    </p>
  `;

  const previewText = `Your payment of ${amount} ${currency} failed. Please update your payment method.`;

  return emailLayout({ previewText, content });
}
