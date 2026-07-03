import { describe, it, expect } from "vitest";
import { formatPriceDisplay, formatPriceInputDisplay, parsePriceInput } from "./priceFormatter";

describe("Price Formatter", () => {
  describe("formatPriceDisplay", () => {
    it("should format 20000 as 20.000", () => {
      expect(formatPriceDisplay("20000")).toBe("20.000");
    });

    it("should format 1000 as 1.000", () => {
      expect(formatPriceDisplay("1000")).toBe("1.000");
    });

    it("should format 100 as 100", () => {
      expect(formatPriceDisplay("100")).toBe("100");
    });

    it("should format 1000000 as 1.000.000", () => {
      expect(formatPriceDisplay("1000000")).toBe("1.000.000");
    });

    it("should handle already formatted input", () => {
      expect(formatPriceDisplay("20.000")).toBe("20.000");
    });

    it("should return empty string for empty input", () => {
      expect(formatPriceDisplay("")).toBe("");
    });

    it("should handle numeric input", () => {
      expect(formatPriceDisplay(20000)).toBe("20.000");
    });

    it("should remove non-numeric characters", () => {
      expect(formatPriceDisplay("20a00b0")).toBe("20.000");
    });
  });

  describe("formatPriceInputDisplay", () => {
    it("should default empty input to empty string", () => {
      expect(formatPriceInputDisplay("")).toBe("");
    });

    it("should format typed digits for keypad display", () => {
      expect(formatPriceInputDisplay("20000")).toBe("20.000");
    });
  });

  describe("parsePriceInput", () => {
    it("should parse 20.000 as 20000", () => {
      expect(parsePriceInput("20.000")).toBe(20000);
    });

    it("should parse 1.000.000 as 1000000", () => {
      expect(parsePriceInput("1.000.000")).toBe(1000000);
    });

    it("should parse unformatted 20000 as 20000", () => {
      expect(parsePriceInput("20000")).toBe(20000);
    });

    it("should return 0 for empty input", () => {
      expect(parsePriceInput("")).toBe(0);
    });

    it("should handle mixed input", () => {
      expect(parsePriceInput("20.0a00")).toBe(200);
    });
  });

  describe("Round trip conversion", () => {
    it("should format and parse back correctly", () => {
      const original = 20000;
      const formatted = formatPriceDisplay(original);
      const parsed = parsePriceInput(formatted);
      expect(parsed).toBe(original);
    });

    it("should handle large numbers", () => {
      const original = 999999999;
      const formatted = formatPriceDisplay(original);
      const parsed = parsePriceInput(formatted);
      expect(parsed).toBe(original);
    });
  });
});
