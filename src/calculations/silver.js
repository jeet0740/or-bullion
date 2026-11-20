export const SILVER_PURITIES = [
  { id: "800", label: "800", purity: 0.8 },
  { id: "900", label: "90%", purity: 0.9 },
  { id: "sterling", label: "Sterling", purity: 0.925 },
  { id: "pure", label: "Pure", purity: 0.999 },
];
export const SILVER_DEFAULT_PAYOUT = "";
export const SILVER_UNITS = ["oz", "gram", "dwt"];
export const TROY_OUNCE_GRAMS = 31.1034768;
export function silverOunces(weight, unit) {
  const w = Number(weight);
  if (!Number.isFinite(w) || w < 0) return 0;
  return unit === "gram" ? w / TROY_OUNCE_GRAMS : unit === "dwt" ? w / 20 : w;
}
export function silverUnitPrice(price, payout, purity, unit) {
  const spot = Number(price), percent = Number(payout);
  if (!Number.isFinite(spot) || spot <= 0 || !Number.isFinite(percent) || percent < 0) return 0;
  return silverOunces(1, unit) * spot * Number(purity) * percent / 100;
}
export function silverRowTotal(price, payout, purity, weight, unit) {
  return silverUnitPrice(price, payout, purity, unit) * Math.max(0, Number(weight) || 0);
}
