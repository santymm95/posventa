import { describe, expect, it } from "vitest";
import { getInventoryProductIds } from "./db";

describe("getInventoryProductIds", () => {
  it("returns the sold product and its parent when selling a variant", () => {
    expect(getInventoryProductIds(42, 7)).toEqual([42, 7]);
  });

  it("returns only the sold product when selling a parent product", () => {
    expect(getInventoryProductIds(7, undefined)).toEqual([7]);
  });
});
