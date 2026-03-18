import { describe, it, expect } from "vitest";
import { isTransferOrRefund } from "@/lib/utils/transfer-detection";

describe("isTransferOrRefund", () => {
  it('"TRANSFER TO SAVINGS" -> true', () => {
    expect(isTransferOrRefund("TRANSFER TO SAVINGS")).toBe(true);
  });

  it('"TFR 12345678" -> true', () => {
    expect(isTransferOrRefund("TFR 12345678")).toBe(true);
  });

  it('"REFUND FROM AMAZON" -> true', () => {
    expect(isTransferOrRefund("REFUND FROM AMAZON")).toBe(true);
  });

  it('"REVERSAL PAYMENT" -> true', () => {
    expect(isTransferOrRefund("REVERSAL PAYMENT")).toBe(true);
  });

  it('"PAYMENT RECEIVED" -> true', () => {
    expect(isTransferOrRefund("PAYMENT RECEIVED")).toBe(true);
  });

  it('"CASHBACK REWARD" -> true', () => {
    expect(isTransferOrRefund("CASHBACK REWARD")).toBe(true);
  });

  it('"INTEREST PAID" -> true', () => {
    expect(isTransferOrRefund("INTEREST PAID")).toBe(true);
  });

  it('"NETFLIX.COM SUBSCRIPTION" -> false', () => {
    expect(isTransferOrRefund("NETFLIX.COM SUBSCRIPTION")).toBe(false);
  });

  it('"TESCO STORES" -> false', () => {
    expect(isTransferOrRefund("TESCO STORES")).toBe(false);
  });

  it('"TRANSFER" standalone -> true', () => {
    expect(isTransferOrRefund("TRANSFER")).toBe(true);
  });

  it('"INTEREST EARNED" -> true', () => {
    expect(isTransferOrRefund("INTEREST EARNED")).toBe(true);
  });

  it('"DIRECT DEBIT RETURNED" -> true', () => {
    expect(isTransferOrRefund("DIRECT DEBIT RETURNED")).toBe(true);
  });

  it('"CHARGEBACK" -> true', () => {
    expect(isTransferOrRefund("CHARGEBACK")).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isTransferOrRefund("transfer to savings")).toBe(true);
    expect(isTransferOrRefund("Refund From Amazon")).toBe(true);
  });

  it('"AMAZON PRIME" -> false', () => {
    expect(isTransferOrRefund("AMAZON PRIME")).toBe(false);
  });

  it('"SPOTIFY SUBSCRIPTION" -> false', () => {
    expect(isTransferOrRefund("SPOTIFY SUBSCRIPTION")).toBe(false);
  });
});
