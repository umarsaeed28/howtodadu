import { describe, expect, it } from "vitest";
import { cardBrand, formatCardNumber, formatCvc, formatExpiry } from "./card-format";

describe("card field formatting", () => {
  it("groups card numbers like the card", () => {
    expect(formatCardNumber("4111")).toBe("4111");
    expect(formatCardNumber("41111")).toBe("4111 1");
    expect(formatCardNumber("4111 1111-1111x1111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("4".repeat(25)).replace(/\s/g, "")).toHaveLength(19);
  });

  it("knows the brand from the first digits", () => {
    expect(cardBrand("4111")).toBe("visa");
    expect(cardBrand("5500")).toBe("mastercard");
    expect(cardBrand("2221")).toBe("mastercard");
    expect(cardBrand("3782")).toBe("amex");
    expect(cardBrand("6011")).toBe("discover");
    expect(cardBrand("9")).toBeNull();
  });

  it("formats the expiry as MM / YY", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12", "1")).toBe("12 / ");
    expect(formatExpiry("4")).toBe("04 / ");
    expect(formatExpiry("12 / 3", "12 / ")).toBe("12 / 3");
    expect(formatExpiry("1230")).toBe("12 / 30");
    expect(formatExpiry("12 /", "12 / ")).toBe("1");
  });

  it("keeps the CVC to 3 digits, 4 for Amex", () => {
    expect(formatCvc("12a34", "visa")).toBe("123");
    expect(formatCvc("1234", "amex")).toBe("1234");
  });
});
