import { TROY_OUNCE_DWT, TROY_OUNCE_GRAMS } from "../config/karats.js";

export function effectiveKaratFactor(karat) {
  return (Number(karat) - 0.5) / 24;
}

export function unitPriceDwt(goldPrice, payout, karat) {
  return (
    (Number(goldPrice) / TROY_OUNCE_DWT) *
    (Number(payout) / 100) *
    effectiveKaratFactor(karat)
  );
}

export function unitPriceGram(goldPrice, payout, karat) {
  return (
    (Number(goldPrice) / TROY_OUNCE_GRAMS) *
    (Number(payout) / 100) *
    effectiveKaratFactor(karat)
  );
}

export function unitPrice({ goldPrice, payout, karat, unit = "dwt" }) {
  return unit === "gram"
    ? unitPriceGram(goldPrice, payout, karat)
    : unitPriceDwt(goldPrice, payout, karat);
}

export function rowTotal({ goldPrice, payout, karat, weight, unit = "dwt" }) {
  return unitPrice({ goldPrice, payout, karat, unit }) * Number(weight || 0);
}

export function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
