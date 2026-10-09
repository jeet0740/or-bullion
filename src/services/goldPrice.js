const GOLD_API_URL = "https://api.gold-api.com/price/XAU";

export async function fetchLiveGoldPrice({ signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  let response;
  try {
    response = await fetch(GOLD_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Gold API returned ${response.status}`);
  const data = await response.json();
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid gold price");
  const updatedAt = data.updatedAt || data.updated_at;
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) {
    throw new Error("Gold API returned no valid quote timestamp");
  }
  return { price, symbol: "XAU", source: "Gold-API.com spot", updatedAt };
}
