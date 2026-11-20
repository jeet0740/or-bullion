import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { money } from "../calculations/gold.js";
import { SILVER_PURITIES, silverUnitPrice, silverRowTotal } from "../calculations/silver.js";
import { fetchLiveSilverPrice } from "../services/silverPrice.js";
import "./silver.css";

export default function SilverCalculator() {
  const [spot, setSpot] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("loading");
  const [price, setPrice] = useState("");
  const [payout, setPayout] = useState("");
  const [unit, setUnit] = useState("oz");
  const [weights, setWeights] = useState({});
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const loadQuote = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await fetchLiveSilverPrice();
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
  const rows = useMemo(() => SILVER_PURITIES.map(item => ({
    ...item, weight: weights[item.id] || "",
    unitPrice: silverUnitPrice(price, payout, item.purity, unit),
    total: silverRowTotal(price, payout, item.purity, weights[item.id], unit),
  })), [price, payout, weights, unit]);
  const active = rows.filter(row => Number(row.weight) > 0);
  const totalWeight = active.reduce((sum, row) => sum + Number(row.weight), 0);
  const totalValue = rows.reduce((sum, row) => sum + row.total, 0);
  const unitLabel = unit === "oz" ? "Troy Oz" : unit === "gram" ? "Grams" : "DWT";
  const receipt = () => [
    "OR BULLION USA — SILVER CALCULATION",
    new Date().toLocaleString(),
    "Silver Price: " + money(price) + " / troy oz",
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
        const saved = await Filesystem.writeFile({path:"OR-Bullion-Silver-"+Date.now()+".txt",data,directory:Directory.Cache});
        await Share.share({title:"OR Bullion USA Silver Calculation",url:saved.uri});
      } else if (navigator.share) {
        await navigator.share({title:"OR Bullion USA Silver Calculation",text:content});
      } else { await navigator.clipboard.writeText(content); setNotice("Calculation copied for sharing"); }
    } catch (e) { if (e?.name !== "AbortError") setNotice("Unable to share calculation"); }
  };
  const reset = () => { setWeights({}); setUnit("oz"); setPayout(""); setPrice(spot == null ? "" : String(spot)); setNotice(""); };
  return <div className="silverCalculator">
    <section className="silverLive"><div><span className={"silverDot "+(quoteStatus === "live" ? "on" : "")}/><strong>LIVE SILVER PRICE</strong><small>USD per Troy Oz</small></div><strong>{quoteStatus === "live" ? money(spot) : quoteStatus === "loading" ? "Loading…" : "Unavailable"}</strong><button onClick={loadQuote} aria-label="Refresh silver price">↻</button></section>
    <h2 className="silverHeading">Silver Calculator</h2>
    <section className="silverControls"><label>Silver Price (USD/oz)<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></label><label>Payout (%)<input inputMode="decimal" value={payout} onChange={e => setPayout(e.target.value)} /></label></section>
    <section className="silverUnits"><strong>Weight Unit</strong><div role="group" aria-label="Silver weight unit">{[["oz","Oz"],["gram","Gram"],["dwt","DWT"]].map(([value,label])=><button key={value} className={unit===value?"selected":""} onClick={()=>setUnit(value)}>{label}</button>)}</div></section>
    <section className="silverTable"><div className="silverTableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
      {rows.map(row=><div className="silverRow" key={row.id}><input aria-label={row.label+" silver weight"} inputMode="decimal" placeholder="0.000" value={row.weight} onChange={e=>setWeights(old=>({...old,[row.id]:e.target.value}))}/><strong>{row.label}</strong><span>{money(row.unitPrice)}</span><b>{money(row.total)}</b></div>)}
    </section>
    <section className="silverSummary"><div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit === "oz" ? "Oz" : unit === "gram" ? "g" : "DWT"}</strong></div><div><small>Total Value</small><strong>{money(totalValue)}</strong></div></section>
    <div className="silverActions"><button disabled={!active.length} onClick={copy}>▣ Copy</button><button disabled={!active.length} onClick={share}>▤ Share</button><button onClick={reset}>↻ Reset</button></div>
    {notice && <p className="silverNotice" role="status">{notice}</p>}
  </div>;
}
