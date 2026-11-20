import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { money } from "../calculations/gold.js";
import { PLATINUM_PURITIES, platinumUnitPrice, platinumRowTotal } from "../calculations/platinum.js";
import { fetchLivePlatinumPrice } from "../services/platinumPrice.js";
import "./platinum.css";

export default function PlatinumCalculator() {
  const [spot, setSpot] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("loading");
  const [price, setPrice] = useState("");
  const [payout, setPayout] = useState("");
  const [unit, setUnit] = useState("dwt");
  const [weights, setWeights] = useState({});
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const loadQuote = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await fetchLivePlatinumPrice();
      setSpot(result.price);
      setPrice(old => old === "" ? String(result.price) : old);
      setQuoteStatus("live");
    } catch {
      setQuoteStatus("error");
    } finally { busy.current = false; }
  };
  useEffect(() => {
    loadQuote();
    const timer = setInterval(() => { if (document.visibilityState === "visible") loadQuote(); }, 30000);
    const resume = () => { if (document.visibilityState === "visible") loadQuote(); };
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, []);
  const rows = useMemo(() => PLATINUM_PURITIES.map(item => ({
    ...item, weight: weights[item.id] || "",
    unitPrice: platinumUnitPrice(price, payout, item.purity, unit),
    total: platinumRowTotal(price, payout, item.purity, weights[item.id], unit),
  })), [price, payout, weights, unit]);
  const active = rows.filter(row => Number(row.weight) > 0);
  const totalWeight = active.reduce((sum, row) => sum + Number(row.weight), 0);
  const totalValue = rows.reduce((sum, row) => sum + row.total, 0);
  const unitLabel = unit === "gram" ? "Grams" : "DWT";
  const receipt = () => [
    "OR BULLION USA — PLATINUM CALCULATION",
    new Date().toLocaleString(),
    "Platinum Price: " + money(price) + " / troy oz",
    "Payout: " + payout + "%",
    "Unit: " + unitLabel, "",
    ...active.map(row => row.label + " (" + (row.purity * 100) + "%): " + row.weight + " " + unitLabel + " × " + money(row.unitPrice) + " = " + money(row.total)),
    "", "Total Weight: " + totalWeight.toFixed(3) + " " + unitLabel,
    "Total Value: " + money(totalValue),
  ].join("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(receipt()); setNotice("Calculation copied"); }
    catch { setNotice("Unable to copy calculation"); }
  };
  const share = async () => {
    try {
      const content = receipt();
      if (Capacitor.isNativePlatform()) {
        const data = btoa(unescape(encodeURIComponent(content)));
        const saved = await Filesystem.writeFile({path:"OR-Bullion-Platinum-"+Date.now()+".txt",data,directory:Directory.Cache});
        await Share.share({title:"OR Bullion USA Platinum Calculation",url:saved.uri});
      } else if (navigator.share) {
        await navigator.share({title:"OR Bullion USA Platinum Calculation",text:content});
      } else { await navigator.clipboard.writeText(content); setNotice("Calculation copied for sharing"); }
    } catch (e) { if (e?.name !== "AbortError") setNotice("Unable to share calculation"); }
  };
  const reset = () => { setWeights({}); setUnit("dwt"); setPayout(""); setPrice(spot == null ? "" : String(spot)); setNotice(""); };
  return <div className="platinumCalculator">
    <section className="platinumLive"><div><span className={"platinumDot "+(quoteStatus === "live" ? "on" : "")}/><strong>LIVE PLATINUM PRICE</strong><small>USD per Troy Oz</small></div><strong>{quoteStatus === "live" ? money(spot) : quoteStatus === "loading" ? "Loading…" : "Unavailable"}</strong><button onClick={loadQuote} aria-label="Refresh platinum price">↻</button></section>
    <h2 className="platinumHeading">Platinum Calculator</h2>
    <section className="platinumControls"><label>Platinum Price (USD/oz)<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></label><label>Payout (%)<input inputMode="decimal" value={payout} onChange={e => setPayout(e.target.value)} /></label></section>
    <section className="platinumUnits"><strong>Weight Unit</strong><div role="group" aria-label="Platinum weight unit">{[["dwt","DWT"],["gram","Gram"]].map(([value,label])=><button key={value} className={unit===value?"selected":""} onClick={()=>setUnit(value)}>{label}</button>)}</div></section>
    <section className="platinumTable"><div className="platinumTableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
      {rows.map(row=><div className="platinumRow" key={row.id}><input aria-label={row.label+" platinum weight"} inputMode="decimal" placeholder="0.000" value={row.weight} onChange={e=>setWeights(old=>({...old,[row.id]:e.target.value}))}/><strong>{row.label}</strong><span>{money(row.unitPrice)}</span><b>{money(row.total)}</b></div>)}
    </section>
    <section className="platinumSummary"><div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit === "gram" ? "g" : "DWT"}</strong></div><div><small>Total Value</small><strong>{money(totalValue)}</strong></div></section>
    <div className="platinumActions"><button disabled={!active.length} onClick={copy}>▣ Copy</button><button disabled={!active.length} onClick={share}>▤ Share</button><button onClick={reset}>↻ Reset</button></div>
    {notice && <p className="platinumNotice" role="status">{notice}</p>}
  </div>;
}
