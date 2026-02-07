import { emailLayout, APP_NAME, APP_URL } from "./base";

interface DigestAlert {
  type: "price_increase" | "missed_renewal";
  subscriptionName: string;
  message: string; // e.g., "$12 -> $14" or "Expected Jan 15"
}

interface WeeklySpending {
  total: string; // Formatted currency string
  renewalCount: number;
}

interface DigestEmailProps {
  userName: string;
  alerts: DigestAlert[];
  weeklySpending: WeeklySpending;
}

export function digestEmail({ userName, alerts, weeklySpending }: DigestEmailProps) {
  const hasAlerts = alerts.length > 0;

  const subject = hasAlerts
    ? `Weekly Update: ${alerts.length} alert${alerts.length > 1 ? "s" : ""} for your subscriptions`
    : "Your weekly subscription summary";

  const previewText = hasAlerts
    ? `You have ${alerts.length} subscription alert${alerts.length > 1 ? "s" : ""} to review`
    : `${weeklySpending.renewalCount} renewals totaling ${weeklySpending.total} this week`;

  const alertRows = alerts
    .map(
      (alert) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%;
            background-color: ${alert.type === "price_increase" ? "#ef4444" : "#eab308"};
            margin-right: 8px; vertical-align: middle;"></span>
          <strong>${escapeHtml(alert.subscriptionName)}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: right; color: #71717a;">
          ${escapeHtml(alert.message)}
        </td>
      </tr>
    `
    )
    .join("");

  const content = `
    <h1 style="font-size: 24px; margin-bottom: 16px;">Your Weekly Subscription Update</h1>
    <p>Hi ${escapeHtml(userName || "there")},</p>

    ${
      hasAlerts
        ? `
      <h2 style="margin-top: 24px; font-size: 18px; font-weight: 600;">Alerts</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tbody>${alertRows}</tbody>
      </table>
    `
        : ""
    }

    <h2 style="margin-top: 24px; font-size: 18px; font-weight: 600;">This Week</h2>
    <p style="margin: 12px 0;">
      You had <strong>${weeklySpending.renewalCount} renewal${weeklySpending.renewalCount !== 1 ? "s" : ""}</strong>
      totaling <strong>${weeklySpending.total}</strong>.
    </p>

    <p style="text-align: center; margin-top: 32px;">
      <a href="${APP_URL}/dashboard" class="button" style="
        display: inline-block;
        background-color: #18181b;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
      ">View Dashboard</a>
    </p>

    ${
      hasAlerts
        ? `
      <p style="text-align: center; margin-top: 16px;">
        <a href="${APP_URL}/alerts" style="color: #71717a; font-size: 14px;">View all alerts</a>
      </p>
    `
        : ""
    }
  `;

  const text = `
${subject}

Hi ${userName || "there"},

${
  hasAlerts
    ? `ALERTS (${alerts.length})
${alerts.map((a) => `- ${a.subscriptionName}: ${a.message}`).join("\n")}

`
    : ""
}THIS WEEK
You had ${weeklySpending.renewalCount} renewal${weeklySpending.renewalCount !== 1 ? "s" : ""} totaling ${weeklySpending.total}.

View your dashboard: ${APP_URL}/dashboard
${hasAlerts ? `View all alerts: ${APP_URL}/alerts` : ""}

---
${APP_NAME}
  `.trim();

  return {
    subject,
    html: emailLayout({ previewText, content }),
    text,
  };
}

// Simple HTML escape to prevent XSS in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
