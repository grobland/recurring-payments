import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, subscriptions, categories, reminderLogs, importAudits } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        displayCurrency: true,
        locale: true,
        reminderDaysBefore: true,
        emailRemindersEnabled: true,
        billingStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get subscriptions (including soft deleted)
    const userSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, userId),
      with: {
        category: {
          columns: {
            name: true,
            slug: true,
          },
        },
      },
    });

    // Get custom categories
    const userCategories = await db.query.categories.findMany({
      where: eq(categories.userId, userId),
    });

    // Get reminder logs (last 100)
    const userReminderLogs = await db.query.reminderLogs.findMany({
      where: eq(reminderLogs.userId, userId),
      limit: 100,
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    // Get import audits
    const userImportAudits = await db.query.importAudits.findMany({
      where: eq(importAudits.userId, userId),
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      subscriptions: userSubscriptions.map((sub) => ({
        ...sub,
        categoryName: sub.category?.name ?? null,
      })),
      customCategories: userCategories,
      reminderLogs: userReminderLogs,
      importHistory: userImportAudits,
    };

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="subscription-manager-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export user data error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
