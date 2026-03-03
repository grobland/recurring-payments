import { describe, expect, it } from "vitest";
import { objectsToCSV, createCSVResponse } from "@/lib/utils/csv";

// Access the private escapeCSVValue via objectsToCSV behavior tests

describe("CSV Formula Injection Sanitization (EXPRT-03)", () => {
  // Test via objectsToCSV since sanitizeFormulaInjection is private

  it("prefixes cells starting with = with a tab to prevent formula execution", () => {
    const data = [{ formula: "=SUM(1+1)" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    // After sanitization, value becomes "\t=SUM(1+1)" — then quoted because \t is a tab char
    // The tab-prefixed value contains no comma/quote/newline so it is not further quoted
    expect(csv).toContain("\t=SUM(1+1)");
  });

  it("prefixes cells starting with + with a tab", () => {
    const data = [{ formula: "+cmd|'/C calc'!A0" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    expect(csv).toContain("\t+cmd");
  });

  it("prefixes cells starting with - with a tab", () => {
    const data = [{ formula: "-100" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    expect(csv).toContain("\t-100");
  });

  it("prefixes cells starting with @ with a tab", () => {
    const data = [{ formula: "@SUM(A1:A10)" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    expect(csv).toContain("\t@SUM(A1:A10)");
  });

  it("prefixes cells starting with a tab character with an additional tab", () => {
    const data = [{ formula: "\tvalue" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    expect(csv).toContain("\t\tvalue");
  });

  it("prefixes cells starting with CR (carriage return) with a tab", () => {
    const data = [{ formula: "\rvalue" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    expect(csv).toContain("\t\rvalue");
  });

  it("leaves normal text unchanged", () => {
    const data = [{ formula: "Normal text" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Normal text");
  });

  it("leaves numeric strings unchanged (numbers do not start with formula chars)", () => {
    const data = [{ formula: "100" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("100");
  });

  it("leaves empty string unchanged", () => {
    const data = [{ formula: "" }];
    const columns = [{ key: "formula" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("");
  });
});

describe("escapeCSVValue existing behavior (preserved after sanitization)", () => {
  it("returns empty string for null values", () => {
    const data = [{ val: null }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data as Record<string, unknown>[], columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("");
  });

  it("returns empty string for undefined values", () => {
    const data = [{ val: undefined }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data as Record<string, unknown>[], columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("");
  });

  it("wraps values containing commas in double quotes", () => {
    const data = [{ val: "Hello, World" }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Hello, World"');
  });

  it("escapes double quotes by doubling them and wraps in quotes", () => {
    const data = [{ val: 'Say "hello"' }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Say ""hello"""');
  });

  it("wraps values containing newlines in double quotes", () => {
    const data = [{ val: "line1\nline2" }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    // The quoted value contains an embedded newline, so we check the whole CSV string
    expect(csv).toContain('"line1\nline2"');
  });

  it("tab-prefixes formula values AND quotes them when containing a comma after prefix", () => {
    // "=SUM(1+1)" becomes "\t=SUM(1+1)" — no comma, not quoted
    // But "=a,b" becomes "\t=a,b" — comma present, MUST be quoted
    const data = [{ val: "=a,b" }];
    const columns = [{ key: "val" as const, header: "Value" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"\t=a,b"');
  });
});

describe("UTF-8 BOM in createCSVResponse (EXPRT-04)", () => {
  it("response body starts with UTF-8 BOM character \\uFEFF", async () => {
    const csv = "Name,Amount\nNetflix,15.99";
    const response = createCSVResponse(csv, "test.csv");
    const text = await response.text();
    expect(text.startsWith("\uFEFF")).toBe(true);
  });

  it("CSV content follows the BOM immediately", async () => {
    const csv = "a,b\n1,2";
    const response = createCSVResponse(csv, "test.csv");
    const text = await response.text();
    expect(text).toBe("\uFEFFa,b\n1,2");
  });

  it("Content-Type header is text/csv; charset=utf-8", () => {
    const response = createCSVResponse("a,b", "test.csv");
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  });

  it("Content-Disposition header contains the filename", () => {
    const response = createCSVResponse("a,b", "subscriptions-2026-03-03.csv");
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("subscriptions-2026-03-03.csv");
    expect(disposition).toContain("attachment");
  });
});

describe("objectsToCSV headers sanitized", () => {
  it("sanitizes formula injection in header values", () => {
    const data = [{ val: "test" }];
    const columns = [{ key: "val" as const, header: "=FORMULA" }];
    const csv = objectsToCSV(data, columns);
    const lines = csv.split("\n");
    // Header should be tab-prefixed
    expect(lines[0]).toContain("\t=FORMULA");
  });

  it("produces correct CSV structure with multiple columns", () => {
    const data = [{ name: "Netflix", amount: 15.99 }];
    const columns = [
      { key: "name" as const, header: "Name" },
      { key: "amount" as const, header: "Amount" },
    ];
    const csv = objectsToCSV(data, columns);
    expect(csv).toBe("Name,Amount\nNetflix,15.99");
  });
});
