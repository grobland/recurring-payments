import { Resend } from "resend";

// Initialize Resend lazily to avoid build errors when API key is not set
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Subscription Manager <noreply@example.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}
