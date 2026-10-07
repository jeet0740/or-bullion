import { describe, expect, it } from "vitest";
import { unitPriceDwt, rowTotal } from "../src/calculations/gold.js";

const expected = {
  9: [77.16, 385.78],
  10: [86.23, 431.17],
  12: [104.39, 521.94],
  14: [122.54, 612.71],
  16: [140.70, 703.49],
  18: [158.85, 794.26],
  21: [186.08, 930.42],
  22: [195.16, 975.80],
  24: [213.32, 1066.58],
};

describe("OR Bullion DWT reference calculations", () => {
  for (const [karat, [unit, total]] of Object.entries(expected)) {
    it(`${karat}K matches the verified $4,446 / 98% / 5 DWT reference`, () => {
      expect(unitPriceDwt(4446, 98, Number(karat))).toBeCloseTo(unit, 2);
      expect(
        rowTotal({ goldPrice: 4446, payout: 98, karat: Number(karat), weight: 5, unit: "dwt" })
      ).toBeCloseTo(total, 2);
    });
  }
});
