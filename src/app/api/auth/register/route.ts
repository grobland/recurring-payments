import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { sendEmail } from "@/lib/email/client";
import { welcomeEmail } from "@/lib/email/templates/welcome";

const TRIAL_DAYS = 14;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user with trial
    const now = new Date();
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        trialStartDate: now,
        trialEndDate: addDays(now, TRIAL_DAYS),
        billingStatus: "trial",
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Send welcome email (don't fail registration if email fails)
    try {
      const emailContent = welcomeEmail({
        name: newUser.name ?? "",
        trialDays: TRIAL_DAYS,
      });
      await sendEmail({
        to: newUser.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: { id: newUser.id, email: newUser.email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
