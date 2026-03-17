import { describe, it, expect } from "vitest";
import {
  bankLineItemSchema,
  bankExtractionResultSchema,
} from "@/lib/validations/line-item";

describe("bankLineItemSchema", () => {
  it("validates a complete bank line item", () => {
    const item = {
      sequenceNumber: 1,
      date: "2025-01-15",
      description: "Netflix",
      debitAmount: 15.99,
      creditAmount: null,
      balance: 1484.01,
      reference: "REF001",
      type: "DD",
      rawDescription: "NETFLIX.COM",
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Netflix");
      expect(result.data.debitAmount).toBe(15.99);
    }
  });

  it("validates a credit line item (salary)", () => {
    const item = {
      sequenceNumber: 3,
      date: "2025-01-31",
      description: "Salary - Acme Corp",
      debitAmount: null,
      creditAmount: 3200.0,
      balance: 4684.01,
      reference: "SAL001",
      type: "BGC",
      rawDescription: "ACME CORP SALARY JAN",
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("validates an opening balance line with null date", () => {
    const item = {
      sequenceNumber: 1,
      date: null,
      description: "Opening Balance",
      debitAmount: null,
      creditAmount: null,
      balance: 1500.0,
      reference: null,
      type: null,
      rawDescription: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("rejects item with missing description", () => {
    const item = {
      sequenceNumber: 1,
      date: "2025-01-15",
      description: "",
      debitAmount: 10.0,
      creditAmount: null,
      balance: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("rejects item with zero sequenceNumber", () => {
    const item = {
      sequenceNumber: 0,
      date: "2025-01-15",
      description: "Test",
      debitAmount: 10.0,
      creditAmount: null,
      balance: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("rejects item with negative sequenceNumber", () => {
    const item = {
      sequenceNumber: -1,
      date: "2025-01-15",
      description: "Test",
      debitAmount: 10.0,
      creditAmount: null,
      balance: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("accepts item with no optional fields", () => {
    const item = {
      sequenceNumber: 1,
      date: null,
      description: "Some transaction",
      debitAmount: null,
      creditAmount: null,
      balance: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("rejects non-integer sequenceNumber", () => {
    const item = {
      sequenceNumber: 1.5,
      date: null,
      description: "Test",
      debitAmount: null,
      creditAmount: null,
      balance: null,
    };
    const result = bankLineItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

describe("bankExtractionResultSchema", () => {
  it("validates an array of bank line items", () => {
    const items = [
      {
        sequenceNumber: 1,
        date: null,
        description: "Opening Balance",
        debitAmount: null,
        creditAmount: null,
        balance: 1500.0,
      },
      {
        sequenceNumber: 2,
        date: "2025-01-05",
        description: "Netflix",
        debitAmount: 15.99,
        creditAmount: null,
        balance: 1484.01,
      },
    ];
    const result = bankExtractionResultSchema.safeParse(items);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("validates an empty array", () => {
    const result = bankExtractionResultSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("rejects if any item is invalid", () => {
    const items = [
      {
        sequenceNumber: 1,
        date: null,
        description: "Valid",
        debitAmount: null,
        creditAmount: null,
        balance: null,
      },
      {
        sequenceNumber: 0, // invalid
        date: null,
        description: "Invalid",
        debitAmount: null,
        creditAmount: null,
        balance: null,
      },
    ];
    const result = bankExtractionResultSchema.safeParse(items);
    expect(result.success).toBe(false);
  });
});
