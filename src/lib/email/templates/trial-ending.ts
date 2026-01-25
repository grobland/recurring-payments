import { emailLayout, APP_NAME, APP_URL } from "./base";

interface TrialEndingEmailProps {
  userName: string;
  daysLeft: number;
  subscriptionCount: number;
  monthlySpend: string;
}

export function trialEndingEmail({
  userName,
  daysLeft,
  subscriptionCount,
  monthlySpend,
}: TrialEndingEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject =
    daysLeft === 0
      ? `Your ${APP_NAME} trial ends today`
      : daysLeft === 1
      ? `Your ${APP_NAME} trial ends tomorrow`
      : `Your ${APP_NAME} trial ends in ${daysLeft} days`;

  const content = `
    <h1>Your Trial is Ending Soon</h1>
    <p>Hi ${userName || "there"},</p>
    <p>Your free trial of ${APP_NAME} ${
    daysLeft === 0
      ? "ends today"
      : daysLeft === 1
      ? "ends tomorrow"
      : `ends in ${daysLeft} days`
  }.</p>

    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Your subscription summary:</strong></p>
      <p style="margin: 4px 0; color: #71717a;">
        ${subscriptionCount} subscription${subscriptionCount !== 1 ? "s" : ""} tracked
      </p>
      <p style="margin: 4px 0; color: #71717a;">
        ${monthlySpend}/month in recurring payments
      </p>
    </div>

    <p>After your trial ends, you'll still be able to view your subscriptions, but you won't be able to:</p>
    <ul style="color: #71717a;">
      <li>Add or edit subscriptions</li>
      <li>Import from bank statements</li>
      <li>Receive renewal reminders</li>
    </ul>

    <p><strong>Upgrade now to keep full access:</strong></p>
    <ul>
      <li><strong>Monthly:</strong> $4.99/month</li>
      <li><strong>Annual:</strong> $39.99/year (save 33%)</li>
    </ul>

    <p style="text-align: center;">
      <a href="${APP_URL}/settings/billing" class="button">Upgrade Now</a>
    </p>

    <p class="muted">
      Questions? Just reply to this email and we'll be happy to help.
    </p>
  `;

  const text = `
Your Trial is Ending Soon

Hi ${userName || "there"},

Your free trial of ${APP_NAME} ${
    daysLeft === 0
      ? "ends today"
      : daysLeft === 1
      ? "ends tomorrow"
      : `ends in ${daysLeft} days`
  }.

Your subscription summary:
- ${subscriptionCount} subscription${subscriptionCount !== 1 ? "s" : ""} tracked
- ${monthlySpend}/month in recurring payments

After your trial ends, you'll still be able to view your subscriptions, but you won't be able to add/edit subscriptions, import from bank statements, or receive renewal reminders.

Upgrade now to keep full access:
- Monthly: $4.99/month
- Annual: $39.99/year (save 33%)

Upgrade: ${APP_URL}/settings/billing

---
${APP_NAME}
  `.trim();

  return {
    subject,
    html: emailLayout({ previewText: subject, content }),
    text,
  };
}
