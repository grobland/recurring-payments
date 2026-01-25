import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";
import { sendEmail } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "Reset email sent if account exists" });
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash) {
      // User signed up with OAuth, no password to reset
      return NextResponse.json({ message: "Reset email sent if account exists" });
    }

    // Generate reset token
    const token = uuidv4();
    const expires = addHours(new Date(), TOKEN_EXPIRY_HOURS);

    // Delete any existing tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // Create new token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expires,
    });

    // Send password reset email
    try {
      const emailContent = passwordResetEmail({ resetToken: token });
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      // Still return success to not expose email sending issues
    }

    return NextResponse.json({ message: "Reset email sent if account exists" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
