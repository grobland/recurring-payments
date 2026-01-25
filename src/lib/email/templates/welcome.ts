import { emailLayout, APP_NAME, APP_URL } from "./base";

interface WelcomeEmailProps {
  name: string;
  trialDays: number;
}

export function welcomeEmail({ name, trialDays }: WelcomeEmailProps) {
  const subject = `Welcome to ${APP_NAME}!`;

  const content = `
    <h1>Welcome${name ? `, ${name}` : ""}!</h1>
    <p>Thank you for signing up for ${APP_NAME}. We're excited to help you take control of your subscriptions.</p>
    <p>Your <strong>${trialDays}-day free trial</strong> has started. During this time, you'll have access to all features:</p>
    <ul style="margin: 16px 0; padding-left: 24px;">
      <li>Track unlimited subscriptions</li>
      <li>Import subscriptions from bank statements</li>
      <li>Get email reminders before renewals</li>
      <li>View spending analytics and charts</li>
      <li>Export your data anytime</li>
    </ul>
    <p style="text-align: center;">
      <a href="${APP_URL}/dashboard" class="button">Get Started</a>
    </p>
    <p class="muted">If you have any questions, feel free to reply to this email.</p>
  `;

  const html = emailLayout({
    previewText: `Welcome to ${APP_NAME}! Your ${trialDays}-day free trial has started.`,
    content,
  });

  const text = `
Welcome${name ? `, ${name}` : ""}!

Thank you for signing up for ${APP_NAME}. We're excited to help you take control of your subscriptions.

Your ${trialDays}-day free trial has started. During this time, you'll have access to all features:
- Track unlimited subscriptions
- Import subscriptions from bank statements
- Get email reminders before renewals
- View spending analytics and charts
- Export your data anytime

Get started: ${APP_URL}/dashboard

If you have any questions, feel free to reply to this email.
  `.trim();

  return { subject, html, text };
}
