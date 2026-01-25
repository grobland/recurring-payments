import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { objectsToCSV, createCSVResponse } from "@/lib/utils/csv";
import { format } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all active subscriptions for the user
    const userSubscriptions = await db.query.subscriptions.findMany({
      where: (table) =>
        eq(table.userId, session.user!.id) && isNull(table.deletedAt),
      with: {
        category: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    // Transform data for CSV
    const exportData = userSubscriptions.map((sub) => ({
      name: sub.name,
      description: sub.description ?? "",
      category: sub.category?.name ?? "Uncategorized",
      amount: sub.amount,
      currency: sub.currency,
      frequency: sub.frequency,
      monthlyEquivalent: sub.normalizedMonthlyAmount,
      nextRenewalDate: format(new Date(sub.nextRenewalDate), "yyyy-MM-dd"),
      startDate: sub.startDate
        ? format(new Date(sub.startDate), "yyyy-MM-dd")
        : "",
      status: sub.status,
      url: sub.url ?? "",
      notes: sub.notes ?? "",
      createdAt: format(new Date(sub.createdAt), "yyyy-MM-dd"),
    }));

    const columns = [
      { key: "name" as const, header: "Name" },
      { key: "description" as const, header: "Description" },
      { key: "category" as const, header: "Category" },
      { key: "amount" as const, header: "Amount" },
      { key: "currency" as const, header: "Currency" },
      { key: "frequency" as const, header: "Frequency" },
      { key: "monthlyEquivalent" as const, header: "Monthly Equivalent" },
      { key: "nextRenewalDate" as const, header: "Next Renewal Date" },
      { key: "startDate" as const, header: "Start Date" },
      { key: "status" as const, header: "Status" },
      { key: "url" as const, header: "URL" },
      { key: "notes" as const, header: "Notes" },
      { key: "createdAt" as const, header: "Created At" },
    ];

    const csv = objectsToCSV(exportData, columns);
    const filename = `subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return createCSVResponse(csv, filename);
  } catch (error) {
    console.error("Export subscriptions error:", error);
    return new Response("An error occurred", { status: 500 });
  }
}
