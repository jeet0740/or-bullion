import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { money } from "../calculations/gold.js";

const loadLogo = () => new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=reject;
  img.src="/images/app-icon.png";
});

export async function makeMetalReceipt({metal,price,payout,unitLabel,rows,totalWeight,totalValue}){
  const W=1080,rowH=90,top=440;
  const summaryY=top+64+rows.length*rowH+30;
  const H=Math.max(930,summaryY+300);
  const canvas=document.createElement("canvas");
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Canvas is unavailable");
  ctx.fillStyle="#fffefa";ctx.fillRect(0,0,W,H);
  const rounded=(x,y,w,h,r,fill,stroke)=>{
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  };
  const write=(value,x,y,size=24,color="#171b24",weight="700",align="center",font="Arial",maxWidth)=>{
    ctx.textAlign=align;ctx.fillStyle=color;ctx.font=weight+" "+size+"px "+font;
    ctx.fillText(String(value),x,y,maxWidth);
  };
  try{
    const logo=await loadLogo();
    ctx.save();ctx.beginPath();ctx.roundRect(55,40,175,175,23);ctx.clip();
    ctx.drawImage(logo,55,40,175,175);ctx.restore();
  }catch{
    rounded(55,40,175,175,23,"#080808","#d59b20");
    write("OR",142,135,74,"#e6b644","700","center","Georgia");
    write("BULLION USA",142,175,17,"#e6b644");
  }
  write(metal.toUpperCase()+" CALCULATION",650,130,metal==="Platinum"?40:49,"#92600a","700","center","Georgia",750);
  write("R E C E I P T",650,178,26,"#667085");
  rounded(55,250,970,150,24,"#fffaf0","#e5d7b3");
  const info=[[""+metal+" Price",money(Number(price||0))+" / troy oz"],["Payout",payout+"%"],["Weight Unit",unitLabel.toUpperCase()]];
  info.forEach((item,i)=>{
    const x=215+i*325;
    write(item[0],x,300,22,"#667085");
    write(item[1],x,354,i===0?30:35,"#171b24","700","center","Arial",305);
  });
  rounded(55,top,970,64,17,"#f6e8c5");
  const cols=[174,415,678,906];
  ["GROSS WEIGHT","PURITY","UNIT PRICE","TOTAL"].forEach((label,i)=>write(label,cols[i],top+41,21,"#805b13"));
  rows.forEach((r,i)=>{
    const y=top+64+i*rowH;
    ctx.fillStyle="#fff";ctx.fillRect(55,y,970,rowH);
    ctx.strokeStyle="#e2e2e2";ctx.lineWidth=1;ctx.strokeRect(55,y,970,rowH);
    write(Number(r.weight).toFixed(3)+" "+unitLabel,cols[0],y+58,32,"#171b24","700","center","Arial",225);
    write(r.label,cols[1],y+58,34);
    write(money(r.unitPrice),cols[2],y+58,34,"#171b24","700","center","Arial",225);
    write(money(r.total),cols[3],y+58,34,"#b27a0b","700","center","Arial",215);
  });
  rounded(55,summaryY,970,145,26,"#d59b20");
  write("TOTAL WEIGHT",300,summaryY+43,23,"#fff");
  write("TOTAL VALUE",780,summaryY+43,23,"#fff");
  write(totalWeight.toFixed(3)+" "+unitLabel,300,summaryY+104,46,"#fff","700","center","Arial",430);
  write(money(totalValue),780,summaryY+104,48,"#fff","700","center","Arial",420);
  write("Date & Time",65,summaryY+204,17,"#667085","700","left");
  write(new Date().toLocaleString(),65,summaryY+233,19,"#171b24","400","left");
  write("Thank You",1000,summaryY+207,36,"#b27a0b","italic","right","Georgia");
  write("O R  B U L L I O N  U S A",1000,summaryY+238,16,"#171b24","700","right");
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("PNG creation failed")),"image/png",1));
}

export async function shareMetalReceipt(options){
  const blob=await makeMetalReceipt(options);
  const filename="OR-Bullion-"+options.metal+"-Receipt-"+Date.now()+".png";
  if(Capacitor.isNativePlatform()){
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result).split(",")[1]);
      reader.onerror=()=>reject(new Error("Receipt encoding failed"));
      reader.readAsDataURL(blob);
    });
    const saved=await Filesystem.writeFile({path:filename,data:base64,directory:Directory.Cache});
    await Share.share({title:"OR Bullion USA "+options.metal+" Receipt",url:saved.uri,dialogTitle:"Share Receipt"});
    return;
  }
  const file=new File([blob],filename,{type:"image/png"});
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    await navigator.share({title:"OR Bullion USA "+options.metal+" Receipt",files:[file]});
    return;
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
