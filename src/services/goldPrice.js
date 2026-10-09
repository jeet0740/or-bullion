const GOLD_API_URL = "https://xaus.com/api/v1/spot?compact=1";

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
  if (!response.ok) throw new Error(`XAUS returned ${response.status}`);
  const data = await response.json();
  const price = Number(data.spot_usd_oz);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid XAUS gold price");
  const updatedAt = data.price_as_of || data.data_state?.as_of || data.updated_at;
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000 || data.stale || data.data_state?.status !== "fresh") {
    throw new Error("XAUS gold price is stale");
  }
  return { price, symbol: "XAU", source: "XAUS spot (indicative)", updatedAt };
}
