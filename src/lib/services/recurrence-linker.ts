import { db as defaultDb } from "@/lib/db";
import {
  recurringSeries,
  recurringSeriesTransactions,
  recurringMasters,
  recurringMasterSeriesLinks,
  reviewQueueItems,
  recurringEvents,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { DetectedSeries } from "@/lib/services/recurrence-detector";

// ============ Type Definitions ============

type DbClient = typeof defaultDb;

export interface LinkingResult {
  seriesCreated: number;
  mastersCreated: number;
  mastersLinked: number;
  reviewItemsCreated: number;
  eventsLogged: number;
  unmatchedSeries: number;
}

// ============ Pure Helper Functions ============

/**
 * Infer the recurring kind from frequency, amount type, and merchant category.
 * Categories are matched as substrings (case-insensitive).
 */
export function inferRecurringKind(
  frequency: string,
  amountType: "fixed" | "variable",
  merchantCategory: string | null
): "subscription" | "utility" | "insurance" | "loan" | "rent_mortgage" | "membership" | "installment" | "other_recurring" {
  const cat = merchantCategory?.toLowerCase() ?? "";

  // Utility: electricity, gas, water, telecom, internet, phone
  if (/utility|electric|gas|water|telecom|internet|phone/.test(cat)) {
    return "utility";
  }

  // Insurance
  if (/insurance/.test(cat)) {
    return "insurance";
  }

  // Loan / Rent & Mortgage
  if (/loan/.test(cat)) {
    return "loan";
  }
  if (/mortgage|rent/.test(cat)) {
    return "rent_mortgage";
  }

  // Subscription: fixed monthly entertainment/software/media/streaming
  if (
    amountType === "fixed" &&
    frequency === "monthly" &&
    /entertainment|software|media|streaming/.test(cat)
  ) {
    return "subscription";
  }

  // Membership: fixed monthly gym/fitness/club
  if (
    amountType === "fixed" &&
    frequency === "monthly" &&
    /gym|fitness|club/.test(cat)
  ) {
    return "membership";
  }

  return "other_recurring";
}

/**
 * Returns true when confidence is high enough to auto-link (>= 0.85).
 */
export function shouldAutoLink(confidence: number): boolean {
  return confidence >= 0.85;
}

/**
 * Returns true when confidence is in the review-queue range (0.60–0.84).
 */
export function shouldCreateReviewItem(confidence: number): boolean {
  return confidence >= 0.60 && confidence < 0.85;
}

/**
 * Detect whether the new average amount differs from the master's expected
 * amount by more than 10%.
 *
 * Returns `{ changed: false }` when masterExpected is null (no baseline).
 * percentChange is always a positive (absolute) value.
 */
export function detectAmountChange(
  newAvg: number,
  masterExpected: number | null
): { changed: boolean; percentChange: number } {
  if (masterExpected === null || masterExpected === 0) {
    return { changed: false, percentChange: 0 };
  }
  const percentChange = Math.abs((newAvg - masterExpected) / masterExpected) * 100;
  return {
    changed: percentChange > 10,
    percentChange,
  };
}

/**
 * Returns true when the percent change is larger than 50%.
 */
export function isLargeAmountChange(percentChange: number): boolean {
  return percentChange > 50;
}

// ============ Main Linking Function ============

/**
 * Link detected recurring series to recurring masters.
 *
 * For each detected series:
 * 1. Upsert the recurring_series record
 * 2. Insert recurring_series_transactions junction rows (idempotent)
 * 3. If already linked to a master: check for amount changes, update master dates
 * 4. If not linked: find matching master or auto-create, based on confidence
 * 5. Write full audit trail to recurring_events
 *
 * All writes per merchant group are wrapped in a single db.transaction() to
 * minimise connection usage against the Supabase 3-connection pool limit.
 */
export async function linkDetectedSeries(
  db: DbClient,
  userId: string,
  detectedSeries: DetectedSeries[]
): Promise<LinkingResult> {
  const result: LinkingResult = {
    seriesCreated: 0,
    mastersCreated: 0,
    mastersLinked: 0,
    reviewItemsCreated: 0,
    eventsLogged: 0,
    unmatchedSeries: 0,
  };

  for (const series of detectedSeries) {
    await db.transaction(async (tx) => {
      // ── Step 1: Upsert recurring_series ──────────────────────────────────
      const existingSeriesRows = await tx
        .select({ id: recurringSeries.id })
        .from(recurringSeries)
        .where(
          and(
            eq(recurringSeries.userId, userId),
            eq(recurringSeries.merchantEntityId, series.merchantEntityId)
          )
        )
        .limit(1);

      let seriesId: string;
      let isNewSeries = false;

      if (existingSeriesRows.length > 0) {
        // Update stats on existing series
        seriesId = existingSeriesRows[0].id;
        await tx
          .update(recurringSeries)
          .set({
            detectedFrequency: series.detectedFrequency,
            intervalDays: series.intervalDays,
            dayOfMonth: series.dayOfMonth,
            amountType: series.amountType,
            avgAmount: String(series.avgAmount),
            minAmount: String(series.minAmount),
            maxAmount: String(series.maxAmount),
            amountStddev: String(series.amountStddev),
            currency: series.currency,
            confidence: String(series.confidence),
            transactionCount: series.transactionCount,
            lastSeenAt: series.lastSeenDate,
            nextExpectedAt: series.nextExpectedDate ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(recurringSeries.id, seriesId));
      } else {
        // Insert new series
        isNewSeries = true;
        const [inserted] = await tx
          .insert(recurringSeries)
          .values({
            userId,
            merchantEntityId: series.merchantEntityId,
            detectedFrequency: series.detectedFrequency,
            intervalDays: series.intervalDays,
            dayOfMonth: series.dayOfMonth ?? undefined,
            amountType: series.amountType,
            avgAmount: String(series.avgAmount),
            minAmount: String(series.minAmount),
            maxAmount: String(series.maxAmount),
            amountStddev: String(series.amountStddev),
            currency: series.currency,
            confidence: String(series.confidence),
            transactionCount: series.transactionCount,
            firstSeenAt: series.firstSeenDate,
            lastSeenAt: series.lastSeenDate,
            nextExpectedAt: series.nextExpectedDate ?? undefined,
          })
          .returning({ id: recurringSeries.id });

        seriesId = inserted.id;
        result.seriesCreated++;
      }

      // ── Step 2: Insert series-transaction junction rows ───────────────────
      if (series.transactionIds.length > 0) {
        await tx
          .insert(recurringSeriesTransactions)
          .values(
            series.transactionIds.map((txId) => ({
              seriesId,
              transactionId: txId,
              matchConfidence: String(series.confidence),
            }))
          )
          .onConflictDoNothing();
      }

      // ── Step 3: Check for existing master link ────────────────────────────
      const existingLinks = await tx
        .select({
          id: recurringMasterSeriesLinks.id,
          masterId: recurringMasterSeriesLinks.recurringMasterId,
        })
        .from(recurringMasterSeriesLinks)
        .where(eq(recurringMasterSeriesLinks.seriesId, seriesId))
        .limit(1);

      if (existingLinks.length > 0) {
        const masterId = existingLinks[0].masterId;

        // Load master for amount comparison
        const masterRows = await tx
          .select({
            expectedAmount: recurringMasters.expectedAmount,
            nextExpectedDate: recurringMasters.nextExpectedDate,
          })
          .from(recurringMasters)
          .where(eq(recurringMasters.id, masterId))
          .limit(1);

        if (masterRows.length > 0) {
          const masterExpected = masterRows[0].expectedAmount
            ? parseFloat(masterRows[0].expectedAmount as unknown as string)
            : null;

          const amountDelta = detectAmountChange(series.avgAmount, masterExpected);

          if (amountDelta.changed) {
            // Log amount_changed event
            await tx.insert(recurringEvents).values({
              userId,
              recurringMasterId: masterId,
              eventType: "amount_changed",
              metadata: {
                oldAmount: masterExpected,
                newAmount: series.avgAmount,
                percentChange: amountDelta.percentChange,
                seriesId,
                rule: series.rule,
                confidence: series.confidence,
              },
            });
            result.eventsLogged++;

            if (isLargeAmountChange(amountDelta.percentChange)) {
              // Add review queue item for large changes
              await tx.insert(reviewQueueItems).values({
                userId,
                itemType: "amount_change",
                seriesId,
                recurringMasterId: masterId,
                confidence: String(series.confidence),
                suggestedAction: {
                  action: "review_amount",
                  targetMasterId: masterId,
                  reason: `Amount changed by ${amountDelta.percentChange.toFixed(1)}% (was ${masterExpected}, now ${series.avgAmount})`,
                },
              });
              result.reviewItemsCreated++;
            }
          }

          // Update master's lastChargeDate and nextExpectedDate
          await tx
            .update(recurringMasters)
            .set({
              lastChargeDate: series.lastSeenDate,
              nextExpectedDate: series.nextExpectedDate ?? undefined,
              updatedAt: new Date(),
            })
            .where(eq(recurringMasters.id, masterId));
        }

        // Series already linked — skip further linking logic
        if (isNewSeries) {
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: masterId,
            eventType: "series_created",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        }

        return; // Exit transaction — link preserved (LINK-06)
      }

      // ── Step 4: Find matching existing master ─────────────────────────────
      const candidateMasters = await tx
        .select({
          id: recurringMasters.id,
          billingFrequency: recurringMasters.billingFrequency,
          expectedAmount: recurringMasters.expectedAmount,
        })
        .from(recurringMasters)
        .where(
          and(
            eq(recurringMasters.userId, userId),
            eq(recurringMasters.merchantEntityId, series.merchantEntityId)
          )
        );

      // Filter by compatible frequency (same or master has no frequency set)
      const matchingMaster = candidateMasters.find((m) => {
        const freqOk =
          !m.billingFrequency || m.billingFrequency === series.detectedFrequency;
        return freqOk;
      });

      // ── Step 5: Apply confidence thresholds ───────────────────────────────

      if (shouldAutoLink(series.confidence)) {
        // HIGH confidence: auto-link
        let masterId: string;

        if (matchingMaster) {
          // Link to existing master
          masterId = matchingMaster.id;
          await tx
            .insert(recurringMasterSeriesLinks)
            .values({
              recurringMasterId: masterId,
              seriesId,
              isPrimary: true,
            })
            .onConflictDoNothing();

          // Update master billing info
          await tx
            .update(recurringMasters)
            .set({
              lastChargeDate: series.lastSeenDate,
              nextExpectedDate: series.nextExpectedDate ?? undefined,
              confidence: String(series.confidence),
              updatedAt: new Date(),
            })
            .where(eq(recurringMasters.id, masterId));

          result.mastersLinked++;

          // Audit: master_auto_linked
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: masterId,
            eventType: "master_auto_linked",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        } else {
          // Auto-create new master
          const recurringKind = inferRecurringKind(
            series.detectedFrequency,
            series.amountType,
            null // merchant category not yet available in DetectedSeries
          );

          const [newMaster] = await tx
            .insert(recurringMasters)
            .values({
              userId,
              merchantEntityId: series.merchantEntityId,
              name: series.merchantName,
              recurringKind,
              status: "active",
              amountType: series.amountType,
              expectedAmount: String(series.avgAmount),
              expectedAmountMin: String(series.minAmount),
              expectedAmountMax: String(series.maxAmount),
              currency: series.currency,
              billingFrequency: series.detectedFrequency,
              billingDayOfMonth: series.dayOfMonth ?? undefined,
              nextExpectedDate: series.nextExpectedDate ?? undefined,
              lastChargeDate: series.lastSeenDate,
              confidence: String(series.confidence),
            })
            .returning({ id: recurringMasters.id });

          masterId = newMaster.id;
          result.mastersCreated++;

          // Link new master to series
          await tx.insert(recurringMasterSeriesLinks).values({
            recurringMasterId: masterId,
            seriesId,
            isPrimary: true,
          });

          // Audit: master_created
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: masterId,
            eventType: "master_created",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        }

        // Audit: series_created (if new)
        if (isNewSeries) {
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: masterId,
            eventType: "series_created",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        }
      } else if (shouldCreateReviewItem(series.confidence)) {
        // MID confidence: add to review queue
        await tx.insert(reviewQueueItems).values({
          userId,
          itemType: "new_series",
          seriesId,
          recurringMasterId: matchingMaster?.id ?? undefined,
          confidence: String(series.confidence),
          suggestedAction: {
            action: matchingMaster ? "link" : "create_new",
            targetMasterId: matchingMaster?.id,
            reason: `Detected by rule ${series.rule} with confidence ${series.confidence}`,
          },
        });
        result.reviewItemsCreated++;

        // Audit: review_item_created
        await tx.insert(recurringEvents).values({
          userId,
          recurringMasterId: matchingMaster?.id ?? null,
          eventType: "review_item_created",
          metadata: {
            seriesId,
            rule: series.rule,
            confidence: series.confidence,
            transactionCount: series.transactionCount,
            amountRange: {
              min: series.minAmount,
              max: series.maxAmount,
              avg: series.avgAmount,
            },
          },
        });
        result.eventsLogged++;

        if (isNewSeries) {
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: null,
            eventType: "series_created",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        }
      } else {
        // LOW confidence: series recorded but no master link, no review item
        result.unmatchedSeries++;

        if (isNewSeries) {
          await tx.insert(recurringEvents).values({
            userId,
            recurringMasterId: null,
            eventType: "series_created",
            metadata: {
              seriesId,
              rule: series.rule,
              confidence: series.confidence,
              transactionCount: series.transactionCount,
              amountRange: {
                min: series.minAmount,
                max: series.maxAmount,
                avg: series.avgAmount,
              },
            },
          });
          result.eventsLogged++;
        }
      }
    });
  }

  return result;
}

/**
 * Convenience wrapper using the default db instance.
 */
export async function linkDetectedSeriesForUser(
  userId: string,
  detectedSeries: DetectedSeries[]
): Promise<LinkingResult> {
  return linkDetectedSeries(defaultDb, userId, detectedSeries);
}
