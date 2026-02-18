import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, trialExtensions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { z } from "zod";

const extendTrialSchema = z.object({
  userId: z.string().uuid(),
  daysToAdd: z.number().int().min(1).max(365),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = extendTrialSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, daysToAdd, reason } = result.data;

  // Get target user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { trialEndDate: true, billingStatus: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only trial users can receive extensions
  if (user.billingStatus !== "trial") {
    return NextResponse.json(
      { error: "User is not on trial. Only trial users can receive trial extensions." },
      { status: 400 }
    );
  }

  // Cumulative: extend from current end date or now (whichever is later)
  const baseDate = user.trialEndDate
    ? new Date(Math.max(user.trialEndDate.getTime(), Date.now()))
    : new Date();
  const newTrialEndDate = addDays(baseDate, daysToAdd);

  // Update user trial end date
  await db
    .update(users)
    .set({ trialEndDate: newTrialEndDate, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Log the extension for audit
  await db.insert(trialExtensions).values({
    userId,
    daysAdded: daysToAdd,
    previousTrialEndDate: user.trialEndDate,
    newTrialEndDate,
    appliedByAdminId: session.user.id,
    reason: reason ?? null,
  });

  return NextResponse.json({
    success: true,
    email: user.email,
    daysAdded: daysToAdd,
    previousTrialEndDate: user.trialEndDate,
    newTrialEndDate,
  });
}
