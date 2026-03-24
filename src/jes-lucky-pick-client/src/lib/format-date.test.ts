import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatDateShort } from "./format-date";

describe("formatDate", () => {
  it("returns a non-empty string", () => {
    expect(formatDate("2026-03-20T13:00:00Z")).toBeTruthy();
  });

  it("contains the year", () => {
    expect(formatDate("2026-03-20T13:00:00Z")).toContain("2026");
  });

  it("contains the day", () => {
    expect(formatDate("2026-03-20T13:00:00Z")).toContain("20");
  });
});

describe("formatDateTime", () => {
  it("returns a non-empty string", () => {
    expect(formatDateTime("2026-03-20T13:00:00Z")).toBeTruthy();
  });

  it("contains the day", () => {
    expect(formatDateTime("2026-03-20T13:00:00Z")).toContain("20");
  });

  it("includes time component", () => {
    // The formatted string should contain some time representation
    const result = formatDateTime("2026-03-20T13:00:00Z");
    // Should contain a colon from time formatting (e.g., "1:00" or "13:00")
    expect(result).toMatch(/:/);
  });
});

describe("formatDateShort", () => {
  it("returns a non-empty string", () => {
    expect(formatDateShort("2026-03-20T13:00:00Z")).toBeTruthy();
  });

  it("contains the day number", () => {
    expect(formatDateShort("2026-03-20T13:00:00Z")).toContain("20");
  });
});
