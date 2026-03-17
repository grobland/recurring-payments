import { describe, it, expect } from "vitest";
import {
  loanLineItemSchema,
  loanExtractionResultSchema,
} from "@/lib/validations/line-item";

describe("loanLineItemSchema", () => {
  it("validates a complete loan line item", () => {
    const item = {
      sequenceNumber: 1,
      date: "2026-01-15",
      description: "Monthly Repayment",
      paymentAmount: 850.0,
      principalAmount: 620.0,
      interestAmount: 215.0,
      feesAmount: 15.0,
      remainingBalance: 142350.0,
      rawDescription: "MORTGAGE PAYMENT DD REF 12345",
    };
    expect(loanLineItemSchema.safeParse(item).success).toBe(true);
  });

  it("validates item with minimal required fields", () => {
    const item = {
      sequenceNumber: 1,
      date: null,
      description: "Opening Balance",
      paymentAmount: null,
    };
    expect(loanLineItemSchema.safeParse(item).success).toBe(true);
  });

  it("rejects missing description", () => {
    const item = {
      sequenceNumber: 1,
      date: "2026-01-15",
      paymentAmount: 850.0,
    };
    expect(loanLineItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects empty description", () => {
    const item = {
      sequenceNumber: 1,
      date: null,
      description: "",
      paymentAmount: null,
    };
    expect(loanLineItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects non-positive sequenceNumber", () => {
    expect(
      loanLineItemSchema.safeParse({
        sequenceNumber: 0,
        date: null,
        description: "Test",
        paymentAmount: 100,
      }).success
    ).toBe(false);
  });

  it("accepts null optional breakdown fields", () => {
    const item = {
      sequenceNumber: 1,
      date: "2026-02-01",
      description: "Loan Payment",
      paymentAmount: 500.0,
      principalAmount: null,
      interestAmount: null,
      feesAmount: null,
      remainingBalance: null,
    };
    const result = loanLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("accepts interest-only payment", () => {
    const item = {
      sequenceNumber: 1,
      date: "2026-01-01",
      description: "Interest Charge",
      paymentAmount: 215.0,
      principalAmount: 0,
      interestAmount: 215.0,
    };
    const result = loanLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interestAmount).toBe(215.0);
      expect(result.data.principalAmount).toBe(0);
    }
  });

  it("accepts fee-only line", () => {
    const item = {
      sequenceNumber: 3,
      date: "2026-01-10",
      description: "Late Payment Fee",
      paymentAmount: null,
      feesAmount: 25.0,
    };
    expect(loanLineItemSchema.safeParse(item).success).toBe(true);
  });
});

describe("loanExtractionResultSchema", () => {
  it("validates an array of loan line items", () => {
    const items = [
      {
        sequenceNumber: 1,
        date: null,
        description: "Opening Balance",
        paymentAmount: null,
        remainingBalance: 150000.0,
      },
      {
        sequenceNumber: 2,
        date: "2026-01-15",
        description: "Monthly Repayment",
        paymentAmount: 850.0,
        principalAmount: 620.0,
        interestAmount: 230.0,
        remainingBalance: 149380.0,
      },
    ];
    const result = loanExtractionResultSchema.safeParse(items);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("validates an empty array", () => {
    expect(loanExtractionResultSchema.safeParse([]).success).toBe(true);
  });

  it("rejects array with invalid item", () => {
    const items = [
      {
        sequenceNumber: 1,
        date: null,
        description: "Valid",
        paymentAmount: 100,
      },
      {
        sequenceNumber: 2,
        // missing description
        paymentAmount: 200,
      },
    ];
    expect(loanExtractionResultSchema.safeParse(items).success).toBe(false);
  });
});
