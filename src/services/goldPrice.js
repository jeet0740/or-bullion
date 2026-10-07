const GOLD_API_URL = "https://api.gold-api.com/price/XAU";

export async function fetchLiveGoldPrice({ signal } = {}) {
  const response = await fetch(GOLD_API_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Gold price service returned ${response.status}`);
  }

  const data = await response.json();
  const price = Number(data.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Gold price service returned an invalid price");
  }

  return {
    price,
    symbol: data.symbol || "XAU",
    source: "Gold API",
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
  };
}
