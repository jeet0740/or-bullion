const GOLD_API_URL = "https://api.gold-api.com/price/XAU";
const XAUS_URL = "https://xaus.com/api/v1/spot?compact=1";
const MAX_QUOTE_AGE_MS = 5 * 60 * 1000;

async function requestJson(url, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Price API returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function validQuote(priceValue, timestamp, source) {
  const price = Number(priceValue);
  const time = Date.parse(timestamp);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(time)) {
    throw new Error(`Invalid ${source} gold quote`);
  }
  const age = Date.now() - time;
  if (age > MAX_QUOTE_AGE_MS || age < -60000) {
    throw new Error(`Stale ${source} gold quote`);
  }
  return { price, symbol: "XAU", source, updatedAt: new Date(time).toISOString() };
}

export async function fetchLiveGoldPrice({ signal } = {}) {
  try {
    const data = await requestJson(GOLD_API_URL, signal);
    return validQuote(data.price, data.updatedAt || data.updated_at, "Gold-API.com");
  } catch (primaryError) {
    if (signal?.aborted) throw primaryError;
  }

  const data = await requestJson(XAUS_URL, signal);
  if (data.stale === true || data.data_state?.status === "stale" || data.data_state?.status === "unavailable") {
    throw new Error("XAUS gold quote is stale or unavailable");
  }
  return validQuote(
    data.spot_usd_oz,
    data.price_as_of || data.data_state?.as_of || data.updated_at,
    "XAUS (backup)"
  );
}
