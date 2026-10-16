import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import React,{useEffect,useMemo,useRef,useState}from"react";
import{createRoot}from"react-dom/client";
import{DEFAULTS,KARATS}from"./config/karats.js";
import{money,rowTotal,unitPrice}from"./calculations/gold.js";
import{fetchLiveGoldPrice}from"./services/goldPrice.js";
import"./styles/app.css";

function App(){
 const[goldPrice,setGoldPrice]=useState(""),[payout,setPayout]=useState(DEFAULTS.payout),[unit,setUnit]=useState(DEFAULTS.weightUnit);
 const[livePrice,setLivePrice]=useState(null),[liveSource,setLiveSource]=useState(""),[weights,setWeights]=useState(()=>Object.fromEntries(KARATS.map(k=>[k,""]))),[priceState,setPriceState]=useState("loading"),[notice,setNotice]=useState(""),[updatedAt,setUpdatedAt]=useState(null);
 const requestRef=useRef(0),busyRef=useRef(false);
 const [theme,setTheme]=useState("dark"),[menuOpen,setMenuOpen]=useState(false),[page,setPage]=useState("calculator");
 const navigate=next=>{setPage(next);setMenuOpen(false);window.scrollTo(0,0)};
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#080c10":"#f7f5ef")},[theme]);
 const loadPrice=async()=>{if(busyRef.current)return;busyRef.current=true;const request=++requestRef.current;try{const x=await fetchLiveGoldPrice();if(request!==requestRef.current)return;setLivePrice(x.price);setLiveSource(x.source);setUpdatedAt(new Date());setPriceState("live")}catch{setLivePrice(null);setLiveSource("");setUpdatedAt(null);setPriceState("error")}finally{busyRef.current=false}};
 useEffect(()=>{loadPrice();const timer=setInterval(()=>{if(document.visibilityState==="visible")loadPrice()},30000);const resume=()=>{if(document.visibilityState==="visible")loadPrice()};document.addEventListener("visibilitychange",resume);window.addEventListener("focus",resume);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",resume);window.removeEventListener("focus",resume)}},[]);
 const refreshPrice=()=>{if(busyRef.current)return;setPriceState("loading");loadPrice()};
 const rows=useMemo(()=>KARATS.map(karat=>{const weight=weights[karat]||0,price=goldPrice?unitPrice({goldPrice,payout,karat,unit}):0,total=goldPrice?rowTotal({goldPrice,payout,karat,weight,unit}):0;return{karat,weight,price,total}}),[goldPrice,payout,unit,weights]);
 const active=rows.filter(r=>Number(r.weight)>0),totalWeight=active.reduce((s,r)=>s+Number(r.weight),0),grand=rows.reduce((s,r)=>s+r.total,0);
 const receipt=()=>{const unitLabel=unit==="gram"?"g":"DWT";return ["OR BULLION USA","Gold Valuation Receipt","────────────────────",new Date().toLocaleString(),"",`Gold Spot: ${money(Number(goldPrice||0))} / oz`,`Payout: ${payout}%`,`Weight Unit: ${unit==="gram"?"Grams":"DWT"}`,"","ITEMS",...active.flatMap(r=>[`${r.karat}K Gold`,`  Weight: ${Number(r.weight).toFixed(3)} ${unitLabel}`,`  Rate:   ${money(r.price)} / ${unitLabel}`,`  Value:  ${money(r.total)}`]),"","────────────────────",`TOTAL WEIGHT: ${totalWeight.toFixed(3)} ${unitLabel}`,`TOTAL VALUE:  ${money(grand)}`,"────────────────────","OR Bullion USA"].join("\n")};
 const copyText=async text=>{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return}const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.focus();area.select();const ok=document.execCommand("copy");area.remove();if(!ok)throw new Error("Copy failed")};
 const copy=async()=>{if(!active.length){setNotice("Enter a weight first");return}try{await copyText(receipt());setNotice("Receipt copied — ready to paste")}catch{setNotice("Could not copy receipt")}};
 const share=async()=>{if(!active.length){setNotice("Enter a weight first");return}const text=receipt();try{if(navigator.share){await navigator.share({title:"OR Bullion USA — Gold Valuation",text});setNotice("Receipt shared");return}await copyText(text);setNotice("Sharing is not available here — receipt copied instead")}catch(e){if(e?.name==="AbortError"){setNotice("Share cancelled");return}try{await copyText(text);setNotice("Share unavailable — receipt copied instead")}catch{setNotice("Could not share or copy receipt")}}};
 const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
 const makeReceiptImage=async()=>{const W=1080,H=Math.max(1350,930+active.length*82),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d"),unitLabel=unit==="gram"?"g":"DWT";canvas.width=W;canvas.height=H;
  ctx.fillStyle="#f7f7f5";ctx.fillRect(0,0,W,H);
  const banner=await loadImage("/images/or-bullion-banner.jpeg");ctx.save();ctx.beginPath();ctx.roundRect(55,40,970,250,28);ctx.clip();ctx.drawImage(banner,55,40,970,250);ctx.restore();
  ctx.textAlign="center";ctx.fillStyle="#b27a0b";ctx.font="700 56px Georgia";ctx.fillText("GOLD CALCULATION",W/2,375);ctx.fillStyle="#6b7280";ctx.font="700 27px Arial";ctx.fillText("R E C E I P T",W/2,420);
  ctx.fillStyle="#fffaf0";ctx.strokeStyle="#e5d7b3";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(55,455,970,135,25);ctx.fill();ctx.stroke();
  const info=[["Gold Price",money(Number(goldPrice||0))+" / troy oz"],["Payout",payout+"%"],["Weight Unit",unit==="gram"?"GRAMS":"DWT"]];info.forEach((x,i)=>{const xPos=215+i*325;ctx.fillStyle="#667085";ctx.font="700 22px Arial";ctx.fillText(x[0],xPos,500);ctx.fillStyle="#171b24";ctx.font="700 31px Arial";ctx.fillText(x[1],xPos,548)});
  const top=625,rowH=70;ctx.fillStyle="#f6e8c5";ctx.beginPath();ctx.roundRect(55,top,970,62,18);ctx.fill();const cols=[190,440,690,920];["GROSS WEIGHT","PURITY","UNIT PRICE","TOTAL"].forEach((t,i)=>{ctx.fillStyle="#805b13";ctx.font="700 20px Arial";ctx.fillText(t,cols[i],top+39)});
  active.forEach((r,i)=>{const y=top+62+i*rowH;ctx.fillStyle="#fff";ctx.fillRect(55,y,970,rowH);ctx.strokeStyle="#e2e2e2";ctx.strokeRect(55,y,970,rowH);ctx.fillStyle="#171b24";ctx.font="700 24px Arial";ctx.fillText(Number(r.weight).toFixed(3)+" "+unitLabel,cols[0],y+rowH*.62);ctx.fillText(r.karat+"K",cols[1],y+rowH*.62);ctx.fillText(money(r.price),cols[2],y+rowH*.62);ctx.fillStyle="#b27a0b";ctx.fillText(money(r.total),cols[3],y+rowH*.62)});
  const sy=top+62+active.length*rowH+28;ctx.fillStyle="#d59b20";ctx.beginPath();ctx.roundRect(55,sy,970,135,28);ctx.fill();ctx.fillStyle="#fff";ctx.font="700 22px Arial";ctx.fillText("TOTAL WEIGHT",300,sy+42);ctx.fillText("TOTAL VALUE",780,sy+42);ctx.font="700 42px Arial";ctx.fillText(totalWeight.toFixed(3)+" "+unitLabel,300,sy+96);ctx.fillText(money(grand),780,sy+96);
  ctx.textAlign="left";ctx.fillStyle="#667085";ctx.font="700 20px Arial";ctx.fillText("Date & Time",65,sy+185);ctx.fillStyle="#171b24";ctx.font="700 25px Arial";ctx.fillText(new Date().toLocaleString(),65,sy+222);ctx.textAlign="right";ctx.fillStyle="#b27a0b";ctx.font="italic 42px Georgia";ctx.fillText("Thank You",1000,sy+205);ctx.fillStyle="#171b24";ctx.font="700 17px Arial";ctx.fillText("O R  B U L L I O N  U S A",1000,sy+235);
  return new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));
 };
 const shareReceipt=async()=>{
  let stage="generating image";
  if(!active.length){setNotice("Enter a weight first");return}
  try{
   const blob=await makeReceiptImage();
   if(!blob)throw new Error("Receipt image failed");
   if(Capacitor.isNativePlatform()){
    stage="encoding image";
    const base64=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(String(reader.result).split(",")[1]);
     reader.onerror=()=>reject(new Error("Unable to read receipt image"));
     reader.readAsDataURL(blob);
    });
    const name="OR-Bullion-Receipt-"+Date.now()+".png";
    stage="saving temporary image";
    const saved=await Filesystem.writeFile({path:name,data:base64,directory:Directory.Cache});
    stage="opening Android share menu";
    await Share.share({title:"OR Bullion USA Receipt",url:saved.uri,dialogTitle:"Share Receipt"});
    setNotice("Receipt ready to share");
    return;
   }
   const file=new File([blob],"OR-Bullion-Receipt.png",{type:"image/png"});
   if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    await navigator.share({title:"OR Bullion USA Receipt",files:[file]});
    setNotice("Receipt shared");
    return;
   }
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="OR-Bullion-Receipt.png";a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   setNotice("Receipt download requested");
  }catch(e){
   if(e?.name==="AbortError"||String(e?.message||"").toLowerCase().includes("cancel")){setNotice("Share cancelled");return}
   setNotice("Receipt failed at "+stage+": "+String(e?.message||e).slice(0,120));
   console.error("Receipt share error",stage,e);
  }
 };
  const reset=()=>{setWeights(Object.fromEntries(KARATS.map(k=>[k,""])));setPayout(DEFAULTS.payout);setUnit(DEFAULTS.weightUnit);setNotice("")};
 return <main className={`app theme-${theme}`}>
  {page!=="calculator"?<section className="infoScreen"><header className="infoHeader"><button onClick={()=>navigate("calculator")} aria-label="Back to calculator">‹ Back</button><img src="/images/or-bullion-square.svg" alt="OR Bullion USA" /></header>{page==="about"?<><h1>About OR Bullion USA</h1><p>OR Bullion USA is a gold valuation calculator for estimating gold values using spot price, payout percentage, purity, and weight in DWT or grams.</p><h2>Business Contact</h2><p>Contact details have not yet been provided. Business email, phone, and address can be added here once confirmed.</p><p>App version 1.0.0 · Build 14</p></>:page==="help"?<><h1>How to Use</h1><ol><li>Check the live gold price or enter your preferred Gold Price in USD per troy ounce.</li><li>Set the payout percentage (98% by default).</li><li>Select DWT or Grams.</li><li>Enter gross weight next to each gold purity.</li><li>Review each unit price and row total, then check Total Weight and Total Value.</li><li>Use Copy Calculation or Share Receipt to send results; Reset clears weights and restores the default payout and unit.</li></ol><p>The live quote is a reference only; the editable Gold Price field controls the calculation.</p></>:<><h1>Disclaimer</h1><p>This calculator provides estimates for informational purposes only. Live spot prices may be delayed or unavailable and can change at any time.</p><p>Calculated values depend on the entered gold price, purity, weight, and payout percentage. Actual gold content, testing results, fees, and purchase offers may differ.</p><p>Results are not a binding purchase offer, financial advice, or a guarantee of price.</p></>}</section>:<>

  <div className="compactHeader"><button className="menuTrigger" type="button" aria-label="Open menu" onClick={()=>setMenuOpen(true)}>☰</button><img className="squareLogo" src="/images/or-bullion-square.svg" alt="OR Bullion USA" />
  <section className="liveSpot" aria-live="polite">
   <div className="liveSpotMain"><div className="liveSpotLabel"><i className={priceState==="live"?"liveLight":"liveLight inactive"}/><strong className={priceState==="live"?"":"notLive"}>{priceState==="live"?"LIVE":"GOLD"}</strong><b> GOLD PRICE</b></div><div className="liveSpotValue">{priceState==="live"&&livePrice!==null?money(livePrice):priceState==="loading"?"Loading gold price…":"Price unavailable"} <small>USD/oz</small></div></div>
   <div className="liveSpotSide"><span>{priceState==="loading"?"Refreshing…":priceState==="error"?"Price unavailable":updatedAt?updatedAt.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Waiting for quote"}</span><button type="button" aria-label="Refresh live gold price" onClick={refreshPrice}>↻</button></div>
  </section></div>
  <section className="panel pricePanel">
   <div className="priceGrid">
    <label><span>Gold Price (USD/oz)</span><div className="bigInput"><b>$</b><input aria-label="Custom gold price" inputMode="decimal" value={goldPrice} placeholder="" onChange={e=>setGoldPrice(e.target.value)}/></div></label>
    <label><span>Payout</span><div className="bigInput"><input inputMode="decimal" value={payout} onChange={e=>setPayout(e.target.value)}/><b>%</b></div></label>
   <div className="unitLine"><strong>Weight Unit</strong><div className="toggle"><button className={unit==="dwt"?"on":""} onClick={()=>setUnit("dwt")}>DWT</button><button className={unit==="gram"?"on":""} onClick={()=>setUnit("gram")}>Grams</button></div></div>
   </div>
  </section>
  <section className="panel purityPanel">
   <div className="purityTitle"><div><h2>Gold by Purity</h2></div><span>{unit}</span></div>
   <div className="tableHead"><span>GROSS WEIGHT</span><span>PURITY</span><span>UNIT PRICE</span><span>TOTAL</span></div>
   {rows.map(r=><div className="metalRow" key={r.karat}>
    <div className="weightBox"><input aria-label={`${r.karat}K weight`} inputMode="decimal" value={weights[r.karat]} placeholder="0.000" onChange={e=>setWeights({...weights,[r.karat]:e.target.value})}/></div>
    <strong>{r.karat}K</strong><b>{goldPrice?money(r.price):"$0.00"}</b><b className="gold">{r.weight?money(r.total):"$0.00"}</b>
   </div>)}
  </section>
  <div className="fixedBottom"><div className="summary">
    <div><small>Total Weight</small><strong>{totalWeight.toFixed(3)} {unit.toUpperCase()}</strong></div>
    <div><small>Total Value</small><strong>{money(grand)}</strong></div>
   </div>
  <div className="bottomActions"><button onClick={copy} disabled={!active.length}>▣ <span>Copy Calculation</span></button><button onClick={shareReceipt} disabled={!active.length}>▤ <span>Share Receipt</span></button><button onClick={reset}>↻ <span>Reset</span></button></div>
  </div>
  </>}
  {menuOpen&&<div className="menuOverlay" onClick={()=>setMenuOpen(false)}><nav className="sideMenu" aria-label="App menu" onClick={e=>e.stopPropagation()}><div className="menuHeading"><img src="/images/or-bullion-square.svg" alt="OR Bullion USA" /><button aria-label="Close menu" onClick={()=>setMenuOpen(false)}>×</button></div><button className="menuActive" onClick={()=>navigate("calculator")}>▦ &nbsp; Calculator</button><button onClick={()=>{setTheme("dark");setMenuOpen(false)}} aria-pressed={theme==="dark"}>☾ &nbsp; Dark Mode {theme==="dark"?"✓":""}</button><button onClick={()=>{setTheme("light");setMenuOpen(false)}} aria-pressed={theme==="light"}>☀ &nbsp; Light Mode {theme==="light"?"✓":""}</button><div className="menuDivider"/><button onClick={()=>navigate("about")}>ⓘ &nbsp; About</button><button onClick={()=>navigate("help")}>ⓘ &nbsp; How to Use</button><button onClick={()=>navigate("disclaimer")}>▤ &nbsp; Disclaimer</button></nav></div>}
  {notice&&<div className="notice">{notice}</div>}
 </main>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);