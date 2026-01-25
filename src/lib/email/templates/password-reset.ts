import { emailLayout, APP_NAME, APP_URL } from "./base";

interface PasswordResetEmailProps {
  resetToken: string;
}

export function passwordResetEmail({ resetToken }: PasswordResetEmailProps) {
  const subject = `Reset your ${APP_NAME} password`;
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h1>Reset your password</h1>
    <p>We received a request to reset your password for your ${APP_NAME} account.</p>
    <p>Click the button below to set a new password:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p class="muted">This link will expire in 1 hour.</p>
    <p class="muted">If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
    <p class="muted" style="font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p class="muted" style="font-size: 12px; word-break: break-all;">${resetUrl}</p>
  `;

  const html = emailLayout({
    previewText: `Reset your ${APP_NAME} password`,
    content,
  });

  const text = `
Reset your password

We received a request to reset your password for your ${APP_NAME} account.

Click the link below to set a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
  `.trim();

  return { subject, html, text };
}
