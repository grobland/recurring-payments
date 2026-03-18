import { detectRecurringSeries, type DetectionResult } from "./recurrence-detector";
import { linkDetectedSeries, type LinkingResult } from "./recurrence-linker";

type DbClient = typeof import("@/lib/db").db;

export interface RecurrenceOrchestrationResult {
  detection: DetectionResult;
  linking: LinkingResult;
  durationMs: number;
}

/**
 * Run the full recurrence detection and linking pipeline for a user.
 * Processes ALL user transactions to build complete series.
 * Non-fatal: errors are caught and logged, never crash the pipeline.
 */
export async function detectAndLinkRecurrences(
  db: DbClient,
  userId: string
): Promise<RecurrenceOrchestrationResult | null> {
  const start = Date.now();

  try {
    // Step 1: Detect recurring patterns across all user transactions
    const detection = await detectRecurringSeries(db, userId);

    console.log(
      `[recurrence] Detection complete: ${detection.detectedSeries.length} series found, ` +
      `${detection.skippedMerchants} merchants skipped (single occurrence), ` +
      `${detection.totalMerchantsAnalyzed} total analyzed`
    );

    // Step 2: Link detected series to masters / review queue
    const linking = await linkDetectedSeries(db, userId, detection.detectedSeries);

    const durationMs = Date.now() - start;
    console.log(
      `[recurrence] Linking complete in ${durationMs}ms: ` +
      `${linking.seriesCreated} series created, ${linking.mastersCreated} masters created, ` +
      `${linking.mastersLinked} linked, ${linking.reviewItemsCreated} review items, ` +
      `${linking.unmatchedSeries} unmatched`
    );

    return { detection, linking, durationMs };
  } catch (err) {
    console.error(
      "[recurrence] Detection/linking failed (non-fatal):",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
