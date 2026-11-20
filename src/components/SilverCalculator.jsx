import React, { useEffect, useMemo, useRef, useState } from "react";
import { shareMetalReceipt } from "../services/metalReceipt.js";
import { money } from "../calculations/gold.js";
import { SILVER_PURITIES, silverUnitPrice, silverRowTotal } from "../calculations/silver.js";
import { fetchLiveSilverPrice } from "../services/silverPrice.js";


export default function SilverCalculator({onMenu}) {
  const [spot, setSpot] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [price, setPrice] = useState("");
  const [payout, setPayout] = useState("");
  const [unit, setUnit] = useState("oz");
  const [weights, setWeights] = useState({});
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const loadQuote = async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const result = await fetchLiveSilverPrice();
      setSpot(result.price);
      setLastUpdated(new Date());
      
      setQuoteStatus("live");
    } catch {
      setQuoteStatus("error");
    } finally { busy.current = false; setRefreshing(false); }
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
    if (!active.length) { setNotice("Enter a weight first"); return; }
    try {
      await shareMetalReceipt({metal:"Silver",price,payout,unitLabel,rows:active,totalWeight,totalValue});
      setNotice("Receipt ready to share");
    } catch(e) {
      if(e?.name==="AbortError"||String(e?.message||"").toLowerCase().includes("cancel")){setNotice("Share cancelled");return;}
      console.error("Silver receipt sharing failed",e);
      setNotice("Could not share receipt: "+String(e?.message||e).slice(0,100));
    }
  };
  const reset = () => { setWeights({}); setUnit("oz"); setPayout(""); setPrice(""); setNotice(""); };
  return <div className="matchingMetalCalculator">
    <section className="compactHeader metalQuoteHeader"><button className="menuTrigger" type="button" aria-label="Open menu" onClick={onMenu}>☰</button><img className="squareLogo" src="/images/app-icon.png" alt="OR Bullion USA"/>
      <section className="liveSpot" aria-live="polite">
        <div className="liveSpotMain"><div className="liveSpotLabel"><i className={quoteStatus==="live"?"liveLight":"liveLight inactive"}/><strong className={quoteStatus==="live"?"":"notLive"}>{refreshing?"UPDATING":quoteStatus==="live"?"LIVE":"SILVER"}</strong><b> SILVER PRICE</b></div>
        <div className="liveSpotValue">{quoteStatus==="live"?money(spot):quoteStatus==="loading"?"Loading…":"Price unavailable"} <small>USD/oz</small></div></div>
        <div className="liveSpotSide">{lastUpdated&&<span className="quoteTime">{lastUpdated.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span>}<button type="button" onClick={loadQuote} aria-label="Refresh silver price" disabled={refreshing} className={refreshing?"refreshing":""}>↻</button></div>
      </section>
    </section>
    <section className="panel pricePanel"><div className="priceGrid">
      <label><span>Silver Price (USD/oz)</span><div className="bigInput"><b>$</b><input aria-label="Silver price" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></div></label>
      <label><span>Payout</span><div className="bigInput"><input aria-label="Silver payout" inputMode="decimal" value={payout} onChange={e=>setPayout(e.target.value)}/><b>%</b></div></label>
      <div className="unitLine"><strong>Weight Unit</strong><div className="toggle">{[["oz","Oz"],["gram","Gram"],["dwt","DWT"]].map(([value,label])=><button key={value} className={unit===value?"on":""} onClick={()=>setUnit(value)}>{label}</button>)}</div></div>
    </div></section>
    <section className="panel purityPanel"><div className="purityTitle"><div><h2>Silver by Purity</h2></div><span>{unit==="gram"?"GRAM":unit.toUpperCase()}</span></div>
      <div className="tableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
      {rows.map(row=><div className="metalRow" key={row.id}><div className="weightBox"><input aria-label={row.label+" silver weight"} inputMode="decimal" placeholder="0.000" value={row.weight} onChange={e=>setWeights(old=>({...old,[row.id]:e.target.value}))}/></div><strong>{row.label}</strong><b>{money(row.unitPrice)}</b><b className="gold">{money(row.total)}</b></div>)}
    </section>
    <div className="fixedBottom"><div className="summary"><div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit==="gram"?"g":unit==="oz"?"Oz":"DWT"}</strong></div><div><small>Total Value</small><strong>{money(totalValue)}</strong></div></div>
      <div className="bottomActions"><button onClick={copy} disabled={!active.length}>▣ <span>Copy</span></button><button onClick={share} disabled={!active.length}>▤ <span>Share Receipt</span></button><button onClick={reset}>↻ <span>Reset</span></button></div></div>
    {notice&&<div className="notice">{notice}</div>}
  </div>;
}
