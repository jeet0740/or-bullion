import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import React,{useEffect,useMemo,useRef,useState}from"react";
import SilverCalculator from "./components/SilverCalculator.jsx";
import PlatinumCalculator from "./components/PlatinumCalculator.jsx";
import{createRoot}from"react-dom/client";
import{DEFAULTS,KARATS}from"./config/karats.js";
import{money,rowTotal,unitPrice}from"./calculations/gold.js";
import{fetchLiveGoldPrice}from"./services/goldPrice.js";
import"./styles/app.css";

function App(){
 const [metal,setMetal]=useState("gold");
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
 const makeReceiptImage=async()=>{
  const W=1080, rowH=90, unitLabel=unit==="gram"?"g":"DWT", top=440;
  const summaryY=top+64+active.length*rowH+30, H=Math.max(930,summaryY+300);
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  canvas.width=W;canvas.height=H;
  ctx.fillStyle="#fffefa";ctx.fillRect(0,0,W,H);
  const rounded=(x,y,w,h,r,fill,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
  const write=(value,x,y,size=24,color="#171b24",weight="700",align="center",font="Arial",maxWidth)=>{ctx.textAlign=align;ctx.fillStyle=color;ctx.font=weight+" "+size+"px "+font;ctx.fillText(String(value),x,y,maxWidth)};
  // Square logo on the left, headline on the right.
  try{const logo=await loadImage("/images/app-icon.png");ctx.save();ctx.beginPath();ctx.roundRect(55,40,175,175,23);ctx.clip();ctx.drawImage(logo,55,40,175,175);ctx.restore()}
  catch{rounded(55,40,175,175,23,"#080808","#d59b20");write("OR",142,135,74,"#e6b644","700","center","Georgia");write("BULLION USA",142,175,17,"#e6b644")}
  write("GOLD CALCULATION",650,130,49,"#92600a","700","center","Georgia");
  write("R E C E I P T",650,178,26,"#667085");
  rounded(55,250,970,150,24,"#fffaf0","#e5d7b3");
  const info=[["Gold Price",money(Number(goldPrice||0))+" / troy oz"],["Payout",payout+"%"],["Weight Unit",unit==="gram"?"GRAMS":"DWT"]];
  info.forEach((item,i)=>{const x=215+i*325;write(item[0],x,300,22,"#667085");write(item[1],x,354,i===0?32:35,"#171b24","700","center","Arial",305)});
  rounded(55,top,970,64,17,"#f6e8c5");
  const cols=[174,415,678,906];
  ["GROSS WEIGHT","PURITY","UNIT PRICE","TOTAL"].forEach((label,i)=>write(label,cols[i],top+41,21,"#805b13"));
  active.forEach((r,i)=>{const y=top+64+i*rowH;ctx.fillStyle="#ffffff";ctx.fillRect(55,y,970,rowH);ctx.strokeStyle="#e2e2e2";ctx.lineWidth=1;ctx.strokeRect(55,y,970,rowH);write(Number(r.weight).toFixed(3)+" "+unitLabel,cols[0],y+58,33,"#171b24","700","center","Arial",220);write(r.karat+"K",cols[1],y+58,35);write(money(r.price),cols[2],y+58,34,"#171b24","700","center","Arial",225);write(money(r.total),cols[3],y+58,34,"#b27a0b","700","center","Arial",215)});
  rounded(55,summaryY,970,145,26,"#d59b20");
  write("TOTAL WEIGHT",300,summaryY+43,23,"#ffffff");write("TOTAL VALUE",780,summaryY+43,23,"#ffffff");
  write(totalWeight.toFixed(3)+" "+unitLabel,300,summaryY+104,46,"#ffffff","700","center","Arial",430);
  write(money(grand),780,summaryY+104,48,"#ffffff","700","center","Arial",420);
  write("Date & Time",65,summaryY+204,17,"#667085","700","left");
  write(new Date().toLocaleString(),65,summaryY+233,19,"#171b24","400","left");
  write("Thank You",1000,summaryY+207,36,"#b27a0b","italic","right","Georgia");
  write("O R  B U L L I O N  U S A",1000,summaryY+238,16,"#171b24","700","right");
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
  {page!=="calculator"?<section className="infoScreen"><header className="infoHeader"><button onClick={()=>navigate("calculator")} aria-label="Back to calculator">‹ Back</button><img src="/images/app-icon.png" alt="OR Bullion USA" /></header>
  {page==="about"?<><h1>About OR Bullion USA</h1><p>OR Bullion USA is a precious-metal valuation calculator for Gold, Silver, and Platinum. It estimates metal values from a spot price, metal purity, gross weight, and a payout percentage chosen by the user.</p><p>Gold supports karat-based calculations, Silver supports 800, 900, Sterling, and Pure, and Platinum supports 900, 950, and Pure. The app provides live reference prices when available and allows you to enter your own price.</p><p>OR Bullion USA is a calculator only. It does not offer accounts, purchases, sales, payments, or binding price quotes.</p><p>App version 1.1.0</p></>
  :page==="help"?<><h1>How to Use</h1><ol><li>Select Gold, Silver, or Platinum from the metal tabs.</li><li>Check the live reference spot price in USD per troy ounce, or enter your preferred metal price. Market quotes may be delayed or temporarily unavailable.</li><li>Enter a payout percentage. The payout field starts blank for every metal; calculations show $0.00 until a valid payout is entered.</li><li>Choose a weight unit: Gold uses DWT or Gram; Silver uses Troy Oz, Gram, or DWT; Platinum uses DWT or Gram.</li><li>Enter the gross weight beside each applicable purity. Gold uses karats; Silver uses 800 (80%), 900 (90%), Sterling (92.5%), and Pure (99.9%); Platinum uses 900 (90%), 950 (95%), and Pure (99.9%).</li><li>Review each unit price and row total, then the total weight and total value.</li><li>Use Copy or Share Receipt to send the calculation. Reset clears the weights and payout and restores the metal's default weight unit.</li></ol><p>Values are estimates, not offers to buy or sell precious metals. Verify prices, purity, and weights before relying on a calculation.</p></>
  :page==="contact"?<><h1>Contact Us</h1><p><strong>Thank you for using OR Bullion USA.</strong></p><p>For business inquiries, technical support, or feedback about our gold calculator, please contact us using the information below.</p><div className="contactDetails"><p><strong>Email</strong><span><a href="mailto:support@orbullionusa.com">support@orbullionusa.com</a></span></p><p><strong>Phone</strong><span><a href="tel:+12018887673">(201) 888-7673</a></span></p><p><strong>Business Address</strong><span>1 Entin Road, Clifton, NJ 07014</span></p></div></>
  :page==="privacy"?<><h1>Privacy Policy</h1><p><strong>OR Bullion USA</strong></p><p>Effective Date: November 20, 2026</p><h2>1. Introduction</h2><p>This Privacy Policy describes how information is handled when you use the OR Bullion USA Gold, Silver, and Platinum calculators.</p><h2>2. Information You Enter</h2><p>The calculators do not require account registration or personal details. You may enter metal prices, gross weights, purity selections, and payout percentages. These entries are used to calculate estimated values on your device.</p><h2>3. How Information Is Used</h2><p>Entered values are used to generate calculations and receipts. The app does not process purchases, sales, or payments. The calculators do not include advertising or user-tracking services.</p><h2>4. Live Metal Prices and Third Parties</h2><p>The app connects to a third-party market-price service for Gold, Silver, and Platinum reference quotes. When requesting a quote, the service provider may receive technical network information, such as your IP address. Price data can be delayed or unavailable.</p><h2>5. Copying and Sharing</h2><p>When you choose Copy or Share Receipt, calculation information is passed to your device's clipboard or sharing features. Any information you choose to share is handled by the destination app or service under its own privacy practices.</p><h2>6. Storage and Security</h2><p>The calculators do not require a customer account or customer database. We seek to maintain a reliable app, but no connected service can guarantee absolute security.</p><h2>7. Children's Privacy</h2><p>The app is not specifically designed for children and does not knowingly request children's personal information.</p><h2>8. Changes</h2><p>We may update this policy when app features or data practices change. An updated version will show a revised effective date.</p><h2>9. Contact</h2><p>Questions about privacy can be sent to <a href="mailto:support@orbullionusa.com">support@orbullionusa.com</a>.</p></>
  :page==="terms"?<><h1>Terms of Use</h1><p><strong>OR Bullion USA</strong></p><p>Effective Date: November 20, 2026</p><h2>1. Acceptance</h2><p>By using OR Bullion USA, you agree to these Terms of Use.</p><h2>2. Calculator Purpose</h2><p>OR Bullion USA estimates Gold, Silver, and Platinum values using spot prices, weights, purity levels, and user-entered payout percentages. It is a calculation tool only and does not facilitate precious-metal purchases, sales, payments, or other financial transactions.</p><h2>3. Price Data and Calculation Accuracy</h2><p>Live reference quotes are supplied by third parties and may fluctuate, be delayed, or become unavailable. Users may edit the price and payout inputs. Results depend on those inputs and the selected purity and weight unit. Verify all inputs and calculations independently before making decisions.</p><h2>4. Estimates, Not Offers</h2><p>Displayed values are informational estimates, not guaranteed prices, appraisals, investment advice, or binding offers to buy or sell Gold, Silver, or Platinum.</p><h2>5. User Responsibilities</h2><p>You are responsible for accurate entries, lawful use, and any decision made based on calculation results.</p><h2>6. Third-Party Services</h2><p>We do not control or guarantee the accuracy, timeliness, or availability of third-party precious-metal market data or third-party sharing services.</p><h2>7. Availability and Updates</h2><p>Features may change or be discontinued, subject to applicable law.</p><h2>8. Intellectual Property</h2><p>The OR Bullion USA name, branding, and original app content are protected by applicable intellectual property laws.</p><h2>9. Changes to Terms</h2><p>We may revise these terms. Revisions will be accompanied by an updated effective date.</p><h2>10. Contact</h2><p>For questions, email <a href="mailto:support@orbullionusa.com">support@orbullionusa.com</a>.</p></>:null}</section>:<>

<div className="metalTabs" role="tablist" aria-label="Choose metal"><button role="tab" aria-selected={metal==="gold"} className={metal==="gold"?"active":""} onClick={()=>setMetal("gold")}>Gold</button><button role="tab" aria-selected={metal==="silver"} className={metal==="silver"?"active":""} onClick={()=>setMetal("silver")}>Silver</button><button role="tab" aria-selected={metal==="platinum"} className={metal==="platinum"?"active":""} onClick={()=>setMetal("platinum")}>Platinum</button></div>{metal==="silver"?<SilverCalculator onMenu={()=>setMenuOpen(true)}/>:metal==="platinum"?<PlatinumCalculator onMenu={()=>setMenuOpen(true)}/>:<>
  <div className="compactHeader"><button className="menuTrigger" type="button" aria-label="Open menu" onClick={()=>setMenuOpen(true)}>☰</button><img className="squareLogo" src="/images/app-icon.png" alt="OR Bullion USA" />
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
  <div className="bottomActions"><button onClick={copy} disabled={!active.length}>▣ <span>Copy</span></button><button onClick={shareReceipt} disabled={!active.length}>▤ <span>Share Receipt</span></button><button onClick={reset}>↻ <span>Reset</span></button></div>
  </div>

</>} </>}
  {menuOpen&&<div className="menuOverlay" onClick={()=>setMenuOpen(false)}><nav className="sideMenu" aria-label="App menu" onClick={e=>e.stopPropagation()}><div className="menuHeading"><img src="/images/app-icon.png" alt="OR Bullion USA" /><button aria-label="Close menu" onClick={()=>setMenuOpen(false)}>×</button></div><button className="menuActive" onClick={()=>navigate("calculator")}>▦ &nbsp; Calculator</button><div className="themeSwitchRow"><span>{theme==="dark"?"☾":"☀"} &nbsp; {theme==="dark"?"Dark Mode":"Light Mode"}</span><button type="button" role="switch" aria-label="Toggle dark and light mode" aria-checked={theme==="light"} className={"themeSwitch "+(theme==="light"?"enabled":"")} onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}><span className="themeSwitchThumb"/></button></div><div className="menuDivider"/><button onClick={()=>navigate("about")}>ⓘ &nbsp; About</button><button onClick={()=>navigate("help")}>ⓘ &nbsp; How to Use</button><div className="menuDivider"/><button onClick={()=>navigate("contact")}>✉ &nbsp; Contact Us</button><button onClick={()=>navigate("privacy")}>♢ &nbsp; Privacy Policy</button><button onClick={()=>navigate("terms")}>▤ &nbsp; Terms of Use</button></nav></div>}
  {notice&&<div className="notice">{notice}</div>}
 </main>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);