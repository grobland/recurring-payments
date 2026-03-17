import { describe, it, expect } from "vitest";
import {
  creditCardLineItemSchema,
  creditCardExtractionResultSchema,
} from "@/lib/validations/line-item";

describe("creditCardLineItemSchema", () => {
  it("validates a complete credit card line item", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-01-15",
      postingDate: "2026-01-17",
      description: "Amazon.co.uk",
      amount: 42.99,
      foreignCurrencyAmount: null,
      foreignCurrency: null,
      merchantCategory: "Shopping",
      reference: "TXN123456",
      rawDescription: "AMAZON.CO.UK AMZN.CO.UK/PM GBR",
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(true);
  });

  it("validates item with minimal required fields", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: null,
      description: "Opening Balance",
      amount: null,
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(true);
  });

  it("rejects missing description", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-01-15",
      amount: 42.99,
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects empty description", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-01-15",
      description: "",
      amount: 42.99,
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects non-positive sequenceNumber", () => {
    expect(
      creditCardLineItemSchema.safeParse({
        sequenceNumber: 0,
        transactionDate: null,
        description: "Test",
        amount: 10,
      }).success
    ).toBe(false);

    expect(
      creditCardLineItemSchema.safeParse({
        sequenceNumber: -1,
        transactionDate: null,
        description: "Test",
        amount: 10,
      }).success
    ).toBe(false);
  });

  it("accepts foreign currency fields", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-02-01",
      description: "Hotel Marrakech",
      amount: 156.78,
      foreignCurrencyAmount: 2000.0,
      foreignCurrency: "MAD",
      reference: null,
    };
    const result = creditCardLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.foreignCurrencyAmount).toBe(2000.0);
      expect(result.data.foreignCurrency).toBe("MAD");
    }
  });

  it("accepts null foreign currency fields", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-01-15",
      description: "Tesco",
      amount: 45.0,
      foreignCurrencyAmount: null,
      foreignCurrency: null,
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(true);
  });

  it("accepts negative amount for credits/refunds", () => {
    const item = {
      sequenceNumber: 1,
      transactionDate: "2026-01-20",
      description: "Refund - Amazon",
      amount: -15.99,
    };
    const result = creditCardLineItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(-15.99);
    }
  });

  it("accepts decimal sequenceNumber that is a positive integer", () => {
    const item = {
      sequenceNumber: 5,
      transactionDate: null,
      description: "Interest Charge",
      amount: 12.34,
    };
    expect(creditCardLineItemSchema.safeParse(item).success).toBe(true);
  });
});

describe("creditCardExtractionResultSchema", () => {
  it("validates an array of credit card line items", () => {
    const items = [
      {
        sequenceNumber: 1,
        transactionDate: null,
        description: "Previous Balance",
        amount: null,
      },
      {
        sequenceNumber: 2,
        transactionDate: "2026-01-05",
        description: "Payment Received - Thank You",
        amount: -500.0,
      },
      {
        sequenceNumber: 3,
        transactionDate: "2026-01-10",
        description: "Spotify",
        amount: 10.99,
        merchantCategory: "Entertainment",
      },
    ];
    const result = creditCardExtractionResultSchema.safeParse(items);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });

  it("validates an empty array", () => {
    expect(creditCardExtractionResultSchema.safeParse([]).success).toBe(true);
  });

  it("rejects array with invalid item", () => {
    const items = [
      {
        sequenceNumber: 1,
        transactionDate: "2026-01-05",
        description: "Valid",
        amount: 10,
      },
      {
        sequenceNumber: 2,
        // missing description
        amount: 20,
      },
    ];
    expect(creditCardExtractionResultSchema.safeParse(items).success).toBe(false);
  });
});
