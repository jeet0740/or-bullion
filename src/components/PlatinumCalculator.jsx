import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { money } from "../calculations/gold.js";
import { PLATINUM_PURITIES, platinumUnitPrice, platinumRowTotal } from "../calculations/platinum.js";
import { fetchLivePlatinumPrice } from "../services/platinumPrice.js";


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
  return <div className="matchingMetalCalculator">
    <section className="compactHeader metalQuoteHeader">
      <section className="liveSpot" aria-live="polite">
        <div className="liveSpotMain"><div className="liveSpotLabel"><i className={quoteStatus==="live"?"liveLight":"liveLight inactive"}/><strong className={quoteStatus==="live"?"":"notLive"}>{quoteStatus==="live"?"LIVE":"PLATINUM"}</strong><b> PLATINUM PRICE</b></div>
        <div className="liveSpotValue">{quoteStatus==="live"?money(spot):quoteStatus==="loading"?"Loading…":"Price unavailable"} <small>USD/oz</small></div></div>
        <div className="liveSpotSide"><button type="button" onClick={loadQuote} aria-label="Refresh platinum price">↻</button></div>
      </section>
    </section>
    <section className="panel pricePanel"><div className="priceGrid">
      <label><span>Platinum Price (USD/oz)</span><div className="bigInput"><b>$</b><input aria-label="Platinum price" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></div></label>
      <label><span>Payout</span><div className="bigInput"><input aria-label="Platinum payout" inputMode="decimal" value={payout} onChange={e=>setPayout(e.target.value)}/><b>%</b></div></label>
      <div className="unitLine"><strong>Weight Unit</strong><div className="toggle">{[["dwt","DWT"],["gram","Grams"]].map(([value,label])=><button key={value} className={unit===value?"on":""} onClick={()=>setUnit(value)}>{label}</button>)}</div></div>
    </div></section>
    <section className="panel purityPanel"><div className="purityTitle"><div><h2>Platinum by Purity</h2></div><span>{unit==="gram"?"GRAM":unit.toUpperCase()}</span></div>
      <div className="tableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
      {rows.map(row=><div className="metalRow" key={row.id}><div className="weightBox"><input aria-label={row.label+" platinum weight"} inputMode="decimal" placeholder="0.000" value={row.weight} onChange={e=>setWeights(old=>({...old,[row.id]:e.target.value}))}/></div><strong>{row.label}</strong><b>{money(row.unitPrice)}</b><b className="gold">{money(row.total)}</b></div>)}
    </section>
    <div className="fixedBottom"><div className="summary"><div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit==="gram"?"g":unit==="oz"?"Oz":"DWT"}</strong></div><div><small>Total Value</small><strong>{money(totalValue)}</strong></div></div>
      <div className="bottomActions"><button onClick={copy} disabled={!active.length}>▣ <span>Copy</span></button><button onClick={share} disabled={!active.length}>▤ <span>Share Receipt</span></button><button onClick={reset}>↻ <span>Reset</span></button></div></div>
    {notice&&<div className="notice">{notice}</div>}
  </div>;
}
