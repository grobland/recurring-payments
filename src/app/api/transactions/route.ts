import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, statements, transactionTags, tags, subscriptions, categories } from "@/lib/db/schema";
import { and, eq, or, lt, gte, lte, ilike, desc, inArray, sql } from "drizzle-orm";
import type { TransactionCursor, TransactionPage, TransactionTag } from "@/types/transaction";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const sourceType = searchParams.get("sourceType");
    const tagStatus = searchParams.get("tagStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const accountId = searchParams.get("accountId");
    const cursorDate = searchParams.get("cursorDate");
    const cursorId = searchParams.get("cursorId");

    // Build conditions starting with userId filter
    // Using SQL template for complex conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(transactions.userId, session.user.id),
    ];

    // Filter by tagStatus (skip if "all")
    if (tagStatus && tagStatus !== "all") {
      // Validate tagStatus is a valid enum value
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

    // Filter by accountId via statements.accountId FK join
    // The LEFT JOIN to statements is already present; adding this WHERE condition
    // effectively filters to only transactions from statements linked to the account
    if (accountId) {
      conditions.push(eq(statements.accountId, accountId));
    }

    // Apply keyset cursor for pagination
    // Cursor uses (transactionDate DESC, id DESC)
    // Next page: (date < cursorDate) OR (date = cursorDate AND id < cursorId)
    if (cursorDate && cursorId) {
      try {
        const cursorDateObj = new Date(cursorDate);
        if (!isNaN(cursorDateObj.getTime())) {
          conditions.push(
            or(
              lt(transactions.transactionDate, cursorDateObj),
              and(
                eq(transactions.transactionDate, cursorDateObj),
                lt(transactions.id, cursorId)
              )
            )!
          );
        }
      } catch {
        // Invalid cursor date, skip cursor
      }
    }

    // Build query with join to statements for sourceType
    // We need to handle sourceType filter in the WHERE clause if provided
    let results;

    // Select fields including category from subscription (for converted transactions)
    const selectFields = {
      id: transactions.id,
      statementId: transactions.statementId,
      userId: transactions.userId,
      transactionDate: transactions.transactionDate,
      merchantName: transactions.merchantName,
      amount: transactions.amount,
      currency: transactions.currency,
      description: transactions.description,
      fingerprint: transactions.fingerprint,
      tagStatus: transactions.tagStatus,
      confidenceScore: transactions.confidenceScore,
      // Use subscription's category name if converted, otherwise use categoryGuess
      categoryGuess: sql<string | null>`COALESCE(${categories.name}, ${transactions.categoryGuess})`.as("category_guess"),
      rawText: transactions.rawText,
      aiMetadata: transactions.aiMetadata,
      convertedToSubscriptionId: transactions.convertedToSubscriptionId,
      createdAt: transactions.createdAt,
      sourceType: statements.sourceType,
    };

    if (sourceType) {
      // Filter by sourceType requires join condition
      results = await db
        .select(selectFields)
        .from(transactions)
        .leftJoin(statements, eq(transactions.statementId, statements.id))
        .leftJoin(subscriptions, eq(transactions.convertedToSubscriptionId, subscriptions.id))
        .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
        .where(
          and(...conditions, eq(statements.sourceType, sourceType))
        )
        .orderBy(desc(transactions.transactionDate), desc(transactions.id))
        .limit(PAGE_SIZE + 1);
    } else {
      // No sourceType filter, still join to get sourceType in results
      results = await db
        .select(selectFields)
        .from(transactions)
        .leftJoin(statements, eq(transactions.statementId, statements.id))
        .leftJoin(subscriptions, eq(transactions.convertedToSubscriptionId, subscriptions.id))
        .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.transactionDate), desc(transactions.id))
        .limit(PAGE_SIZE + 1);
    }

    // Check if there are more results
    const hasMore = results.length > PAGE_SIZE;

    // Slice to PAGE_SIZE
    const page = hasMore ? results.slice(0, PAGE_SIZE) : results;

    // Fetch tags for all transactions in this page
    const transactionIds = page.map((t) => t.id);
    let tagsMap: Map<string, TransactionTag[]> = new Map();

    if (transactionIds.length > 0) {
      const tagResults = await db
        .select({
          transactionId: transactionTags.transactionId,
          tagId: tags.id,
          tagName: tags.name,
          tagColor: tags.color,
        })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(inArray(transactionTags.transactionId, transactionIds));

      // Group tags by transaction ID
      for (const row of tagResults) {
        const existingTags = tagsMap.get(row.transactionId) || [];
        existingTags.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
        });
        tagsMap.set(row.transactionId, existingTags);
      }
    }

    // Add tags to each transaction
    const transactionsWithTags = page.map((t) => ({
      ...t,
      tags: tagsMap.get(t.id) || [],
    }));

    // Build next cursor from last item
    let nextCursor: TransactionCursor | null = null;
    if (hasMore && page.length > 0) {
      const lastItem = page[page.length - 1];
      nextCursor = {
        transactionDate: lastItem.transactionDate.toISOString(),
        id: lastItem.id,
      };
    }

    const response: TransactionPage = {
      transactions: transactionsWithTags,
      nextCursor,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
