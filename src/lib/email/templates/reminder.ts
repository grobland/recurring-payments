import { emailLayout, APP_NAME, APP_URL } from "./base";

interface ReminderEmailProps {
  userName: string;
  subscriptions: {
    name: string;
    amount: string;
    currency: string;
    renewalDate: string;
    daysUntil: number;
  }[];
}

export function reminderEmail({ userName, subscriptions }: ReminderEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subscriptionCount = subscriptions.length;
  const subject =
    subscriptionCount === 1
      ? `Reminder: ${subscriptions[0].name} renews in ${subscriptions[0].daysUntil} days`
      : `Reminder: ${subscriptionCount} subscriptions renewing soon`;

  const subscriptionRows = subscriptions
    .map(
      (sub) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">
          <strong>${sub.name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">
          ${sub.amount} ${sub.currency}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right;">
          ${sub.renewalDate}
          <br>
          <span style="color: #71717a; font-size: 12px;">
            ${sub.daysUntil === 0 ? "Today" : sub.daysUntil === 1 ? "Tomorrow" : `In ${sub.daysUntil} days`}
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  const content = `
    <h1>Subscription Renewal Reminder</h1>
    <p>Hi ${userName || "there"},</p>
    <p>This is a friendly reminder that ${
      subscriptionCount === 1
        ? "the following subscription is"
        : `${subscriptionCount} of your subscriptions are`
    } renewing soon:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <thead>
        <tr style="background-color: #f4f4f5;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e4e4e7;">Subscription</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e4e4e7;">Amount</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e4e4e7;">Renewal Date</th>
        </tr>
      </thead>
      <tbody>
        ${subscriptionRows}
      </tbody>
    </table>

    <p style="text-align: center;">
      <a href="${APP_URL}/subscriptions" class="button">View Subscriptions</a>
    </p>

    <p class="muted">
      You're receiving this email because you have email reminders enabled.
      You can manage your reminder preferences in your
      <a href="${APP_URL}/reminders" style="color: #71717a;">reminder settings</a>.
    </p>
  `;

  const text = `
Subscription Renewal Reminder

Hi ${userName || "there"},

This is a friendly reminder that ${
    subscriptionCount === 1
      ? "the following subscription is"
      : `${subscriptionCount} of your subscriptions are`
  } renewing soon:

${subscriptions
  .map(
    (sub) =>
      `- ${sub.name}: ${sub.amount} ${sub.currency} (${sub.renewalDate} - ${
        sub.daysUntil === 0 ? "Today" : sub.daysUntil === 1 ? "Tomorrow" : `In ${sub.daysUntil} days`
      })`
  )
  .join("\n")}

View your subscriptions: ${APP_URL}/subscriptions

---
${APP_NAME}
  `.trim();

  return {
    subject,
    html: emailLayout({ previewText: subject, content }),
    text,
  };
}
