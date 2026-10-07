import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{DEFAULTS,KARATS}from"./config/karats.js";
import{money,rowTotal,unitPrice}from"./calculations/gold.js";
import{fetchLiveGoldPrice}from"./services/goldPrice.js";
import"./styles/app.css";

function App(){
 const[goldPrice,setGoldPrice]=useState(DEFAULTS.goldPrice),[payout,setPayout]=useState(DEFAULTS.payout),[unit,setUnit]=useState(DEFAULTS.weightUnit);
 const[weights,setWeights]=useState(()=>Object.fromEntries(KARATS.map(k=>[k,""]))),[priceState,setPriceState]=useState("loading"),[notice,setNotice]=useState(""),[updatedAt,setUpdatedAt]=useState(null);
 const loadPrice=async()=>{setPriceState("loading");try{const x=await fetchLiveGoldPrice();setGoldPrice(x.price.toFixed(2));setUpdatedAt(new Date());setPriceState("live")}catch{setPriceState("error")}};
 useEffect(()=>{loadPrice()},[]);
 useEffect(()=>{if(priceState!=="live")return;const timer=setTimeout(loadPrice,60000);return()=>clearTimeout(timer)},[priceState,updatedAt]);
 const rows=useMemo(()=>KARATS.map(karat=>{const weight=weights[karat]||0,price=goldPrice?unitPrice({goldPrice,payout,karat,unit}):0,total=goldPrice?rowTotal({goldPrice,payout,karat,weight,unit}):0;return{karat,weight,price,total}}),[goldPrice,payout,unit,weights]);
 const active=rows.filter(r=>Number(r.weight)>0),totalWeight=active.reduce((s,r)=>s+Number(r.weight),0),grand=rows.reduce((s,r)=>s+r.total,0);
 const receipt=()=>["OR BULLION USA","GOLD VALUATION RECEIPT",new Date().toLocaleString(),"",`Gold Price: ${money(Number(goldPrice||0))}/ozt`,`Payout: ${payout}%`,`Unit: ${unit.toUpperCase()}`,"",...active.map(r=>`${r.karat}K  ${Number(r.weight).toFixed(3)} ${unit.toUpperCase()}  @ ${money(r.price)}  = ${money(r.total)}`),"",`Total Weight: ${totalWeight.toFixed(3)} ${unit.toUpperCase()}`,`Total Value: ${money(grand)}`].join("\\n");\n const copy=async()=>{if(!active.length)return;try{await navigator.clipboard.writeText(receipt());setNotice("Calculation copied")}catch{setNotice("Copy failed")}};
 const share=async()=>{if(!active.length)return;try{if(navigator.share){await navigator.share({title:"OR Bullion USA Receipt",text:receipt()});setNotice("Receipt shared")}else{await navigator.clipboard.writeText(receipt());setNotice("Receipt copied")}}catch(e){if(e?.name!=="AbortError")setNotice("Share failed")}};
 const reset=()=>{setWeights(Object.fromEntries(KARATS.map(k=>[k,""])));setPayout(DEFAULTS.payout);setUnit(DEFAULTS.weightUnit);setNotice("")};
 return <main className="app">
  <header className="brandBanner"><div className="menuIcon">☰</div><div className="brandName">OR BULLION<span>USA</span></div><div className="goldWave"></div></header>
  <section className="intro"><div className="eyebrow"><i/> GOLD BUYING</div><h1>Metal Calculator</h1><p>Fast buying &amp; valuation calculator</p></section>
  <section className="panel pricePanel">
   <div className="priceGrid">
    <label><span>Gold Price</span><div className="bigInput"><b>$</b><input inputMode="decimal" value={goldPrice} placeholder="0.00" onChange={e=>{setGoldPrice(e.target.value);setPriceState("manual")}}/></div><small>{priceState==="loading"?"Refreshing live price…":priceState==="live"?`● LIVE • Updated ${updatedAt?.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:priceState==="manual"?"Manual price • Auto-refresh paused":"Live unavailable • Manual entry enabled"}</small></label>
    <label><span>Payout</span><div className="bigInput"><input inputMode="decimal" value={payout} onChange={e=>setPayout(e.target.value)}/><b>%</b></div></label>
   </div>
   <div className="divider"/>
   <div className="unitLine"><strong>Weight Unit</strong><div className="toggle"><button className={unit==="dwt"?"on":""} onClick={()=>setUnit("dwt")}>DWT</button><button className={unit==="gram"?"on":""} onClick={()=>setUnit("gram")}>Grams</button></div></div>
   <button className="refresh" onClick={loadPrice} disabled={priceState==="loading"}>↻</button>
  </section>
  <section className="panel purityPanel">
   <div className="purityTitle"><div><h2>Gold by Purity</h2><p>Enter gross weight for each karat.</p></div><span>{unit}</span></div>
   <div className="tableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
   {rows.map(r=><div className="metalRow" key={r.karat}>
    <div className="weightBox"><input aria-label={`${r.karat}K weight`} inputMode="decimal" value={weights[r.karat]} placeholder="0.000" onChange={e=>setWeights({...weights,[r.karat]:e.target.value})}/></div>
    <strong>{r.karat}K</strong><b>{goldPrice?money(r.price):"$0.00"}</b><b className="gold">{r.weight?money(r.total):"$0.00"}</b>
   </div>)}
   <div className="summary">
    <div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit.toUpperCase()}</strong></div>
    <div><small>Total Value</small><strong>{money(grand)}</strong></div>
    <div className="summaryActions"><button onClick={share}>↗<small>Share Receipt</small></button><button onClick={reset}>↻<small>Reset</small></button></div>
   </div>
  </section>
  <button className="copyButton" onClick={copy} disabled={!active.length}>Copy Calculation</button>
  {notice&&<div className="notice">{notice}</div>}
  <footer>OR BULLION USA&nbsp; • &nbsp;Gold valuation tool</footer>
  <nav className="bottomNav"><span>▦</span><b>Calculator</b></nav>
 </main>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);