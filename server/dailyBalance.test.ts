import { describe, expect, it } from "vitest";
import { buildDailyBalanceDelta } from "./db";

describe("buildDailyBalanceDelta", () => {
  it("adds the sale amount to the correct payment bucket", () => {
    const delta = buildDailyBalanceDelta({
      totalPrice: 12500,
      paymentMethod: "efectivo",
    });

    expect(delta.totalSales).toBe(12500);
    expect(delta.cashSales).toBe(12500);
    expect(delta.transferSales).toBe(0);
    expect(delta.creditSales).toBe(0);
  });
});
