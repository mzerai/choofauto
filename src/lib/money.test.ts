import { describe, expect, it } from "vitest";
import { dinarsToMillimes } from "./money";

describe("dinarsToMillimes", () => {
  it("convertit des dinars entiers en millimes", () => {
    expect(dinarsToMillimes(32794)).toBe(32_794_000);
    expect(dinarsToMillimes(0)).toBe(0);
  });

  it("refuse un montant à virgule, négatif ou trop grand", () => {
    expect(() => dinarsToMillimes(32794.5)).toThrow(RangeError);
    expect(() => dinarsToMillimes(-1)).toThrow(RangeError);
    expect(() => dinarsToMillimes(2_200_000)).toThrow(RangeError);
  });
});
