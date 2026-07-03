import { describe, expect, it } from "vitest";
import { buildSaleWithProductName } from "./db";

describe("buildSaleWithProductName", () => {
  it("uses a fallback name when the product name is not provided", () => {
    const sale = buildSaleWithProductName({
      id: 1,
      productId: 10,
      quantity: 2,
      unitPrice: 12000,
      totalPrice: 24000,
      paymentMethod: "efectivo",
      date: new Date("2026-01-01"),
    });

    expect(sale.productName).toBe("Producto");
  });

  it("preserves the provided product name", () => {
    const sale = buildSaleWithProductName({
      id: 2,
      productId: 11,
      quantity: 1,
      unitPrice: 18000,
      totalPrice: 18000,
      paymentMethod: "transferencia",
      date: new Date("2026-01-01"),
      productName: "Chorizos Crudos",
    });

    expect(sale.productName).toBe("Chorizos Crudos");
  });
});
