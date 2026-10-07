import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULTS, KARATS } from "./config/karats.js";
import { money, rowTotal, unitPrice } from "./calculations/gold.js";
import { fetchLiveGoldPrice } from "./services/goldPrice.js";
import "./styles/app.css";

function App() {
  const [goldPrice,setGoldPrice]=useState(DEFAULTS.goldPrice);
  const [payout,setPayout]=useState(DEFAULTS.payout);
  const [unit,setUnit]=useState(DEFAULTS.weightUnit);
  const [weights,setWeights]=useState(()=>Object.fromEntries(KARATS.map(k=>[k,""])));
  const [priceState,setPriceState]=useState("loading");
  const [updatedAt,setUpdatedAt]=useState(null);
  const [notice,setNotice]=useState("");

  const loadPrice=async()=>{
    setPriceState("loading");
    try{
      const live=await fetchLiveGoldPrice();
      setGoldPrice(live.price.toFixed(2));
      setUpdatedAt(new Date(live.updatedAt));
      setPriceState("live");
    }catch{
      setPriceState("error");
    }
  };

  useEffect(()=>{ loadPrice(); },[]);

  const rows=useMemo(()=>KARATS.map(karat=>{
    const weight=weights[karat]||0;
    const price=goldPrice?unitPrice({goldPrice,payout,karat,unit}):0;
    const total=goldPrice?rowTotal({goldPrice,payout,karat,weight,unit}):0;
    return {karat,weight,price,total};
  }),[goldPrice,payout,unit,weights]);

  const activeRows=rows.filter(r=>Number(r.weight)>0);
  const grandTotal=rows.reduce((s,r)=>s+r.total,0);

  const receipt=()=>[
    "OR BULLION",
    "GOLD CALCULATION RECEIPT",
    new Date().toLocaleString(),
    "--------------------------------",
    `Gold Price: ${money(Number(goldPrice||0))}/ozt`,
    `Payout: ${payout}%`,
    `Weight Unit: ${unit.toUpperCase()}`,
    "",
    ...activeRows.map(r=>`${r.karat}K | ${Number(r.weight).toFixed(2)} ${unit.toUpperCase()} | ${money(r.price)} | ${money(r.total)}`),
    "--------------------------------",
    `TOTAL: ${money(grandTotal)}`,
    "",
    "OR Bullion • Precious Metal Refining"
  ].join("\n");

  const copyCalculation=async()=>{
    if(!goldPrice||!activeRows.length)return;
    try{await navigator.clipboard.writeText(receipt());setNotice("Calculation copied");}
    catch{setNotice("Could not copy calculation");}
  };

  const shareReceipt=async()=>{
    if(!goldPrice||!activeRows.length)return;
    try{
      if(navigator.share){await navigator.share({title:"OR Bullion Receipt",text:receipt()});setNotice("Receipt shared");}
      else{await navigator.clipboard.writeText(receipt());setNotice("Receipt copied — share from clipboard");}
    }catch(e){if(e?.name!=="AbortError")setNotice("Could not share receipt");}
  };

  const reset=()=>{
    setPayout(DEFAULTS.payout);setUnit(DEFAULTS.weightUnit);
    setWeights(Object.fromEntries(KARATS.map(k=>[k,""])));
    setNotice("");
  };

  return <main className="app">
    <section className="banner">
      <div className="logo">OR</div>
      <div><h1>OR BULLION</h1><p>PRECIOUS METAL REFINING</p></div>
    </section>

    <section className="card market">
      <div className="sectionTitle"><div><b>Gold Price</b><small>{priceState==="loading"?"Fetching live price…":priceState==="live"?`Live • ${updatedAt?.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:"Live price unavailable • manual entry enabled"}</small></div><button className="refresh" onClick={loadPrice} disabled={priceState==="loading"} aria-label="Refresh gold price">↻</button></div>
      <div className="settings">
        <label><span>Gold Price / OZT</span><div className="priceInput"><b>$</b><input inputMode="decimal" value={goldPrice} placeholder="0.00" onChange={e=>{setGoldPrice(e.target.value);setPriceState("manual")}} /></div></label>
        <label><span>Payout</span><div className="priceInput"><input inputMode="decimal" value={payout} onChange={e=>setPayout(e.target.value)} /><b>%</b></div></label>
      </div>
      <div className="unitToggle"><button className={unit==="dwt"?"selected":""} onClick={()=>setUnit("dwt")}>DWT</button><button className={unit==="gram"?"selected":""} onClick={()=>setUnit("gram")}>GRAMS</button></div>
    </section>

    <section className="card calculator">
      <div className="tableHead"><span>GOLD</span><span>GROSS WEIGHT</span><span>UNIT PRICE</span><span>TOTAL</span></div>
      {rows.map(r=><div className="calcRow" key={r.karat}>
        <strong>{r.karat}K</strong>
        <div className="weight"><input aria-label={`${r.karat}K weight`} inputMode="decimal" value={weights[r.karat]} placeholder="0.00" onChange={e=>setWeights({...weights,[r.karat]:e.target.value})}/><small>{unit}</small></div>
        <span>{goldPrice?money(r.price):"—"}</span>
        <b>{goldPrice&&r.weight?money(r.total):"—"}</b>
      </div>)}
    </section>

    <section className="totalCard"><div><span>ESTIMATED TOTAL</span><small>{activeRows.length} karat{activeRows.length===1?"":"s"} entered</small></div><strong>{money(grandTotal)}</strong></section>

    <section className="shareGrid">
      <button className="copy" onClick={copyCalculation} disabled={!goldPrice||!activeRows.length}>Copy Calculation</button>
      <button className="share" onClick={shareReceipt} disabled={!goldPrice||!activeRows.length}>Share Receipt</button>
    </section>
    <button className="reset" onClick={reset}>Reset Weights & Settings</button>
    {notice&&<div className="notice">{notice}</div>}
    <footer>OR BULLION • GOLD CALCULATOR</footer>
  </main>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
