import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  transactions,
  statements,
  transactionTags,
  tags,
  subscriptions,
  categories,
} from "@/lib/db/schema";
import {
  and,
  eq,
  or,
  gte,
  lte,
  ilike,
  desc,
  inArray,
  sql,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { objectsToCSV, createCSVResponse } from "@/lib/utils/csv";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters (no cursorDate/cursorId — export has no pagination)
    const sourceType = searchParams.get("sourceType");
    const tagStatus = searchParams.get("tagStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const accountId = searchParams.get("accountId");
    const paymentType = searchParams.get("paymentType");

    // Validate paymentType — invalid values are treated as "all" (no filter)
    const validPaymentTypes = ["recurring", "subscriptions", "one-time"];
    const effectivePaymentType =
      paymentType && validPaymentTypes.includes(paymentType)
        ? paymentType
        : null;

    // Build conditions starting with userId filter
    const conditions: ReturnType<typeof eq>[] = [
      eq(transactions.userId, session.user.id),
    ];

    // Filter by tagStatus (skip if "all")
    if (tagStatus && tagStatus !== "all") {
      const validStatuses = [
        "unreviewed",
        "potential_subscription",
        "not_subscription",
        "converted",
      ];
      if (validStatuses.includes(tagStatus)) {
        conditions.push(
          eq(
            transactions.tagStatus,
            tagStatus as
              | "unreviewed"
              | "potential_subscription"
              | "not_subscription"
              | "converted"
          )
        );
      }
    }

    // Filter by date range
    if (dateFrom) {
      try {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          conditions.push(gte(transactions.transactionDate, fromDate));
        }
      } catch {
        // Invalid date, skip filter
      }
    }

    if (dateTo) {
      try {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          conditions.push(lte(transactions.transactionDate, toDate));
        }
      } catch {
        // Invalid date, skip filter
      }
    }

    // Search in merchantName or categoryGuess
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(transactions.merchantName, searchTerm),
          ilike(transactions.categoryGuess, searchTerm)
        )!
      );
    }

    // Filter by sourceType via joined statements table
    if (sourceType) {
      conditions.push(eq(statements.sourceType, sourceType));
    }

    // Filter by accountId via statements.accountId FK join
    if (accountId) {
      conditions.push(eq(statements.accountId, accountId));
    }

    // Filter by paymentType
    if (effectivePaymentType === "subscriptions") {
      conditions.push(
        or(
          isNotNull(transactions.convertedToSubscriptionId),
          eq(transactions.tagStatus, "converted")
        )!
      );
    } else if (effectivePaymentType === "recurring") {
      conditions.push(
        or(
          sql`LOWER(${transactions.merchantName}) IN (SELECT LOWER(merchant_name) FROM recurring_patterns WHERE user_id = ${session.user.id})`,
          eq(transactions.tagStatus, "potential_subscription"),
          eq(transactions.tagStatus, "converted"),
          isNotNull(transactions.convertedToSubscriptionId)
        )!
      );
    } else if (effectivePaymentType === "one-time") {
      conditions.push(
        sql`LOWER(${transactions.merchantName}) NOT IN (SELECT LOWER(merchant_name) FROM recurring_patterns WHERE user_id = ${session.user.id})`
      );
      conditions.push(
        or(
          eq(transactions.tagStatus, "unreviewed"),
          eq(transactions.tagStatus, "not_subscription")
        )!
      );
      conditions.push(isNull(transactions.convertedToSubscriptionId));
    }

    // Select fields — same as main route, plus subscriptionName for Linked Subscription column
    const selectFields = {
      id: transactions.id,
      transactionDate: transactions.transactionDate,
      merchantName: transactions.merchantName,
      amount: transactions.amount,
      currency: transactions.currency,
      tagStatus: transactions.tagStatus,
      convertedToSubscriptionId: transactions.convertedToSubscriptionId,
      sourceType: statements.sourceType,
      // Use subscription's category name if converted, otherwise use categoryGuess
      categoryGuess: sql<string | null>`COALESCE(${categories.name}, ${transactions.categoryGuess})`.as(
        "category_guess"
      ),
      // Subscription name for "Linked Subscription" column
      subscriptionName: subscriptions.name,
    };

    // Full query without .limit() — export all matching rows
    const results = await db
      .select(selectFields)
      .from(transactions)
      .leftJoin(statements, eq(transactions.statementId, statements.id))
      .leftJoin(
        subscriptions,
        eq(transactions.convertedToSubscriptionId, subscriptions.id)
      )
      .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate), desc(transactions.id));

    // Fetch tags for ALL result IDs (no slicing — full export)
    const transactionIds = results.map((t) => t.id);
    const tagsMap = new Map<string, string[]>();

    if (transactionIds.length > 0) {
      const tagResults = await db
        .select({
          transactionId: transactionTags.transactionId,
          tagName: tags.name,
        })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(inArray(transactionTags.transactionId, transactionIds));

      for (const row of tagResults) {
        const existing = tagsMap.get(row.transactionId) ?? [];
        existing.push(row.tagName);
        tagsMap.set(row.transactionId, existing);
      }
    }

    // Map results to export columns
    const exportData = results.map((t) => ({
      date: format(new Date(t.transactionDate), "yyyy-MM-dd"),
      description: t.merchantName,
      amount: t.amount,
      currency: t.currency,
      source: t.sourceType ?? "",
      tags: (tagsMap.get(t.id) ?? []).join(", "),
      linkedSubscription: t.convertedToSubscriptionId
        ? (t.subscriptionName ?? "")
        : "",
    }));

    const columns = [
      { key: "date" as const, header: "Date" },
      { key: "description" as const, header: "Description" },
      { key: "amount" as const, header: "Amount" },
      { key: "currency" as const, header: "Currency" },
      { key: "source" as const, header: "Source" },
      { key: "tags" as const, header: "Tags" },
      { key: "linkedSubscription" as const, header: "Linked Subscription" },
    ];

    const csv = objectsToCSV(exportData, columns);
    return createCSVResponse(
      csv,
      `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  } catch (error) {
    console.error("Export transactions error:", error);
    return new Response("An error occurred", { status: 500 });
  }
}
