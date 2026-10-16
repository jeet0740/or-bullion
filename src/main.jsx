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
  {page==="about"?<><h1>About OR Bullion USA</h1><p>OR Bullion USA is a gold valuation calculator for estimating gold values using spot price, payout percentage, purity, and weight in DWT or grams.</p><p>App version 1.0.0 · Build 14</p></>
  :page==="help"?<><h1>How to Use</h1><ol><li>Check the live gold price or enter your preferred Gold Price in USD per troy ounce.</li><li>Set the payout percentage (98% by default).</li><li>Select DWT or Grams.</li><li>Enter gross weight next to each gold purity.</li><li>Review each unit price and row total, then check Total Weight and Total Value.</li><li>Use Copy Calculation or Share Receipt to send results; Reset clears weights and restores the default payout and unit.</li></ol><p>The live quote is a reference only; the editable Gold Price field controls the calculation.</p></>
  :page==="contact"?<><h1>Contact Us</h1><p><strong>Thank you for using OR Bullion USA.</strong></p><p>For business inquiries, technical support, or feedback about our gold calculator, please contact us using the information below.</p><div className="contactDetails"><p><strong>Email</strong><span><a href="mailto:support@orbullionusa.com">support@orbullionusa.com</a></span></p><p><strong>Phone</strong><span><a href="tel:+12018887673">(201) 888-7673</a></span></p><p><strong>Business Address</strong><span>1 Entin Road, Clifton, NJ 07014</span></p></div></>
  :page==="privacy"?<><h1>Privacy Policy</h1><p><strong>OR Bullion USA</strong></p><p>Effective Date: To be confirmed</p><h2>1. Introduction</h2><p>OR Bullion USA respects your privacy. This Privacy Policy explains how information is handled when you use our gold calculator application.</p><h2>2. Information We Collect</h2><p>OR Bullion USA does not require users to create an account or provide personal information to use the calculator. The application does not include advertising, analytics, or user-tracking services. Users can enter gold prices, weights, purity levels, and payout percentages to perform calculations.</p><h2>3. How We Use Information</h2><p>Information entered into the calculator is used to calculate estimated gold values. The application does not provide account registration, payment processing, or gold buying and selling services.</p><h2>4. Third-Party Services</h2><p>OR Bullion USA uses a third-party gold-price API to retrieve live gold market prices. When the application connects to this service, the API provider may receive technical information, such as an IP address, as part of the network request.</p><h2>5. Data Storage</h2><p>The calculator does not require a user account or a customer database. Calculations are performed within the application. Users can choose to copy or share calculation results using their device's available features.</p><h2>6. Data Security</h2><p>We aim to maintain a secure and reliable application. However, no internet-based service can guarantee absolute security.</p><h2>7. Children's Privacy</h2><p>OR Bullion USA is not specifically designed for children and does not knowingly request personal information from children.</p><h2>8. Changes to This Policy</h2><p>We may update this Privacy Policy when the application or its data practices change.</p><h2>9. Contact Us</h2><p>For questions about this Privacy Policy, please contact OR Bullion USA. Email: support@orbullionusa.com.</p></>
  :page==="terms"?<><h1>Terms of Use</h1><p><strong>OR Bullion USA</strong></p><p>Effective Date: To be confirmed</p><h2>1. Acceptance of Terms</h2><p>By using OR Bullion USA, you agree to these Terms of Use.</p><h2>2. Purpose of the Application</h2><p>OR Bullion USA is a gold calculator designed to estimate gold values using gold prices, weights, purity levels, and payout percentages. The application does not facilitate gold purchases, sales, or financial transactions.</p><h2>3. Calculation Accuracy</h2><p>Calculation results depend on the information entered by users. Gold market prices are obtained through a third-party API and may fluctuate, be delayed, or become temporarily unavailable. Users should verify calculations before making financial decisions.</p><h2>4. No Guaranteed Gold Value</h2><p>All values displayed in the application are estimates for informational purposes only. They do not constitute a guaranteed purchase price, official appraisal, or binding offer to buy or sell gold.</p><h2>5. User Responsibilities</h2><p>Users are responsible for entering accurate information and using the application lawfully.</p><h2>6. Third-Party Services</h2><p>OR Bullion USA relies on an external gold-price provider. We do not control or guarantee the accuracy or availability of third-party market data.</p><h2>7. Application Availability</h2><p>We may update, modify, or discontinue application features without prior notice, subject to applicable law.</p><h2>8. Intellectual Property</h2><p>The OR Bullion USA name, branding, and original application content are protected by applicable intellectual property laws.</p><h2>9. Changes to These Terms</h2><p>We may update these Terms of Use from time to time. Updated terms will include a revised effective date.</p><h2>10. Contact Us</h2><p>For questions about these Terms of Use, please contact OR Bullion USA. Email: support@orbullionusa.com.</p></>:null}</section>:<>

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
  </>}
  {menuOpen&&<div className="menuOverlay" onClick={()=>setMenuOpen(false)}><nav className="sideMenu" aria-label="App menu" onClick={e=>e.stopPropagation()}><div className="menuHeading"><img src="/images/app-icon.png" alt="OR Bullion USA" /><button aria-label="Close menu" onClick={()=>setMenuOpen(false)}>×</button></div><button className="menuActive" onClick={()=>navigate("calculator")}>▦ &nbsp; Calculator</button><div className="themeSwitchRow"><span>{theme==="dark"?"☾":"☀"} &nbsp; {theme==="dark"?"Dark Mode":"Light Mode"}</span><button type="button" role="switch" aria-label="Toggle dark and light mode" aria-checked={theme==="light"} className={"themeSwitch "+(theme==="light"?"enabled":"")} onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}><span className="themeSwitchThumb"/></button></div><div className="menuDivider"/><button onClick={()=>navigate("about")}>ⓘ &nbsp; About</button><button onClick={()=>navigate("help")}>ⓘ &nbsp; How to Use</button><div className="menuDivider"/><button onClick={()=>navigate("contact")}>✉ &nbsp; Contact Us</button><button onClick={()=>navigate("privacy")}>♢ &nbsp; Privacy Policy</button><button onClick={()=>navigate("terms")}>▤ &nbsp; Terms of Use</button></nav></div>}
  {notice&&<div className="notice">{notice}</div>}
 </main>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);