import { describe, it, expect } from "vitest";
import { normalizeMerchantDescriptor } from "@/lib/utils/merchant-normalization";

describe("normalizeMerchantDescriptor", () => {
  it('strips SQ* prefix: "SQ*COFFEE SHOP LONDON GB" -> "coffee shop"', () => {
    expect(normalizeMerchantDescriptor("SQ*COFFEE SHOP LONDON GB")).toBe("coffee shop");
  });

  it('strips PAYPAL * prefix: "PAYPAL *NETFLIX.COM" -> "netflix.com"', () => {
    expect(normalizeMerchantDescriptor("PAYPAL *NETFLIX.COM")).toBe("netflix.com");
  });

  it('strips GOOGLE * prefix: "GOOGLE *YouTube Premium" -> "youtube premium"', () => {
    expect(normalizeMerchantDescriptor("GOOGLE *YouTube Premium")).toBe("youtube premium");
  });

  it('strips STRIPE* prefix and trailing digits: "STRIPE* NOTION INC 123456" -> "notion"', () => {
    expect(normalizeMerchantDescriptor("STRIPE* NOTION INC 123456")).toBe("notion");
  });

  it('strips LTD suffix: "AMAZON MARKETPLACE LTD" -> "amazon marketplace"', () => {
    expect(normalizeMerchantDescriptor("AMAZON MARKETPLACE LTD")).toBe("amazon marketplace");
  });

  it('strips trailing digits and country code: "TESCO STORES 3287 LONDON GB" -> "tesco stores"', () => {
    expect(normalizeMerchantDescriptor("TESCO STORES 3287 LONDON GB")).toBe("tesco stores");
  });

  it('strips PP* prefix: "PP*SPOTIFY" -> "spotify"', () => {
    expect(normalizeMerchantDescriptor("PP*SPOTIFY")).toBe("spotify");
  });

  it('strips CKO* prefix: "CKO*DELIVEROO" -> "deliveroo"', () => {
    expect(normalizeMerchantDescriptor("CKO*DELIVEROO")).toBe("deliveroo");
  });

  it('strips APPLE.COM* prefix: "APPLE.COM*BILL" -> "bill"', () => {
    expect(normalizeMerchantDescriptor("APPLE.COM*BILL")).toBe("bill");
  });

  it('collapses multiple spaces: "  MULTIPLE   SPACES  " -> "multiple spaces"', () => {
    expect(normalizeMerchantDescriptor("  MULTIPLE   SPACES  ")).toBe("multiple spaces");
  });

  it('handles empty string: "" -> ""', () => {
    expect(normalizeMerchantDescriptor("")).toBe("");
  });

  it('lowercases the result', () => {
    expect(normalizeMerchantDescriptor("NETFLIX")).toBe("netflix");
  });

  it('strips trailing 6+ digit reference numbers', () => {
    expect(normalizeMerchantDescriptor("MERCHANT 123456")).toBe("merchant");
  });

  it('does not strip trailing numbers shorter than 6 digits', () => {
    expect(normalizeMerchantDescriptor("SHOP 12345")).toBe("shop 12345");
  });

  it('strips INC suffix: "STRIPE INC" -> "stripe"', () => {
    expect(normalizeMerchantDescriptor("STRIPE INC")).toBe("stripe");
  });

  it('strips LLC suffix', () => {
    expect(normalizeMerchantDescriptor("COMPANY LLC")).toBe("company");
  });

  it('strips PLC suffix', () => {
    expect(normalizeMerchantDescriptor("COMPANY PLC")).toBe("company");
  });

  it('strips CORP suffix', () => {
    expect(normalizeMerchantDescriptor("COMPANY CORP")).toBe("company");
  });

  it('strips 2-letter country code at end', () => {
    expect(normalizeMerchantDescriptor("MERCHANT GB")).toBe("merchant");
  });

  it('strips TST* prefix', () => {
    expect(normalizeMerchantDescriptor("TST*RESTAURANT")).toBe("restaurant");
  });

  it('strips PAYPAL* prefix (no space)', () => {
    expect(normalizeMerchantDescriptor("PAYPAL*EBAY")).toBe("ebay");
  });

  it('strips GOOGLE* prefix (no space)', () => {
    expect(normalizeMerchantDescriptor("GOOGLE*STORAGE")).toBe("storage");
  });

  it('strips STRIPE * prefix (with space)', () => {
    expect(normalizeMerchantDescriptor("STRIPE *SERVICE")).toBe("service");
  });

  it('trims leading and trailing whitespace after normalization', () => {
    expect(normalizeMerchantDescriptor("  NETFLIX  ")).toBe("netflix");
  });
});
