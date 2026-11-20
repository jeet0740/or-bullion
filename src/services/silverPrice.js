const SILVER_API_URL = "https://api.gold-api.com/price/XAG";
export async function fetchLiveSilverPrice({ signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const response = await fetch(SILVER_API_URL, {
      headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal,
    });
    if (!response.ok) throw new Error("Silver quote unavailable");
    const data = await response.json();
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid silver quote");
    return { price, source: "Gold-API.com", updatedAt: data.updatedAt || data.updated_at || null };
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
