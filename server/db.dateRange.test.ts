import { describe, expect, it } from "vitest";
import { normalizeDateRange } from "./db";

describe("normalizeDateRange", () => {
  it("expands the end date to the end of the selected day", () => {
    const startDate = new Date("2026-06-30T00:00:00.000Z");
    const endDate = new Date("2026-06-30T00:00:00.000Z");

    const { start, end } = normalizeDateRange(startDate, endDate);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});
