const GOLD_API_URL = "https://api.gold-api.com/price/XAU";

export async function fetchLiveGoldPrice({ signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const response = await fetch(GOLD_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Gold-API returned ${response.status}`);
    const data = await response.json();
    const rawPrice = Number(data.price);
    const price = Math.round((rawPrice - 2) * 100) / 100;
    const updatedAt = data.updatedAt || data.updated_at;
    if (!Number.isFinite(price) || price <= 0 || !updatedAt || !Number.isFinite(Date.parse(updatedAt))) {
      throw new Error("Gold-API returned an invalid quote");
    }
    return { price, symbol: "XAU", source: "Gold-API.com − $2 adjustment", updatedAt };
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
