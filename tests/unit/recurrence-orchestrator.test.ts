import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectAndLinkRecurrences } from "@/lib/services/recurrence-orchestrator";

// Mock the detector and linker modules
vi.mock("@/lib/services/recurrence-detector", () => ({
  detectRecurringSeries: vi.fn(),
}));

vi.mock("@/lib/services/recurrence-linker", () => ({
  linkDetectedSeries: vi.fn(),
}));

import { detectRecurringSeries } from "@/lib/services/recurrence-detector";
import { linkDetectedSeries } from "@/lib/services/recurrence-linker";

const mockDb = {} as Parameters<typeof detectAndLinkRecurrences>[0];
const userId = "user-123";

const mockDetectionResult = {
  detectedSeries: [
    {
      merchantEntityId: "merchant-1",
      merchantName: "Netflix",
      rule: "B" as const,
      detectedFrequency: "monthly" as const,
      intervalDays: 30,
      dayOfMonth: 15,
      amountType: "fixed" as const,
      avgAmount: 15.99,
      minAmount: 15.99,
      maxAmount: 15.99,
      amountStddev: 0,
      confidence: 0.90,
      transactionCount: 6,
      firstSeenDate: new Date("2024-01-15"),
      lastSeenDate: new Date("2024-06-15"),
      nextExpectedDate: new Date("2024-07-15"),
      currency: "GBP",
      transactionIds: ["t1", "t2", "t3", "t4", "t5", "t6"],
    },
  ],
  skippedMerchants: 3,
  totalMerchantsAnalyzed: 4,
};

const mockLinkingResult = {
  seriesCreated: 1,
  mastersCreated: 1,
  mastersLinked: 0,
  reviewItemsCreated: 0,
  eventsLogged: 2,
  unmatchedSeries: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectAndLinkRecurrences", () => {
  it("returns null when detectRecurringSeries throws (non-fatal error handling)", async () => {
    vi.mocked(detectRecurringSeries).mockRejectedValueOnce(
      new Error("DB connection failed")
    );

    const result = await detectAndLinkRecurrences(mockDb, userId);

    expect(result).toBeNull();
    // Linker should NOT be called if detection threw
    expect(linkDetectedSeries).not.toHaveBeenCalled();
  });

  it("returns null when linkDetectedSeries throws (non-fatal error handling)", async () => {
    vi.mocked(detectRecurringSeries).mockResolvedValueOnce(mockDetectionResult);
    vi.mocked(linkDetectedSeries).mockRejectedValueOnce(
      new Error("Transaction rollback")
    );

    const result = await detectAndLinkRecurrences(mockDb, userId);

    expect(result).toBeNull();
  });

  it("includes durationMs in successful result", async () => {
    vi.mocked(detectRecurringSeries).mockResolvedValueOnce(mockDetectionResult);
    vi.mocked(linkDetectedSeries).mockResolvedValueOnce(mockLinkingResult);

    const result = await detectAndLinkRecurrences(mockDb, userId);

    expect(result).not.toBeNull();
    expect(typeof result!.durationMs).toBe("number");
    expect(result!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("calls detectRecurringSeries before linkDetectedSeries (order matters)", async () => {
    const callOrder: string[] = [];

    vi.mocked(detectRecurringSeries).mockImplementationOnce(async () => {
      callOrder.push("detect");
      return mockDetectionResult;
    });

    vi.mocked(linkDetectedSeries).mockImplementationOnce(async () => {
      callOrder.push("link");
      return mockLinkingResult;
    });

    await detectAndLinkRecurrences(mockDb, userId);

    expect(callOrder).toEqual(["detect", "link"]);
  });

  it("passes detected series from detector to linker", async () => {
    vi.mocked(detectRecurringSeries).mockResolvedValueOnce(mockDetectionResult);
    vi.mocked(linkDetectedSeries).mockResolvedValueOnce(mockLinkingResult);

    await detectAndLinkRecurrences(mockDb, userId);

    expect(linkDetectedSeries).toHaveBeenCalledWith(
      mockDb,
      userId,
      mockDetectionResult.detectedSeries
    );
  });

  it("returns full result with detection and linking data on success", async () => {
    vi.mocked(detectRecurringSeries).mockResolvedValueOnce(mockDetectionResult);
    vi.mocked(linkDetectedSeries).mockResolvedValueOnce(mockLinkingResult);

    const result = await detectAndLinkRecurrences(mockDb, userId);

    expect(result).not.toBeNull();
    expect(result!.detection).toEqual(mockDetectionResult);
    expect(result!.linking).toEqual(mockLinkingResult);
  });

  it("handles empty detection result gracefully", async () => {
    const emptyDetection = {
      detectedSeries: [],
      skippedMerchants: 5,
      totalMerchantsAnalyzed: 5,
    };
    const emptyLinking = {
      seriesCreated: 0,
      mastersCreated: 0,
      mastersLinked: 0,
      reviewItemsCreated: 0,
      eventsLogged: 0,
      unmatchedSeries: 0,
    };

    vi.mocked(detectRecurringSeries).mockResolvedValueOnce(emptyDetection);
    vi.mocked(linkDetectedSeries).mockResolvedValueOnce(emptyLinking);

    const result = await detectAndLinkRecurrences(mockDb, userId);

    expect(result).not.toBeNull();
    expect(result!.detection.detectedSeries).toHaveLength(0);
    expect(result!.linking.seriesCreated).toBe(0);
  });
});
