export const PLATINUM_PURITIES=[{id:"900",label:"900",purity:0.9},{id:"950",label:"950",purity:0.95},{id:"pure",label:"Pure",purity:0.999}];
export function platinumUnitPrice(price,payout,purity,unit){const spot=Number(price),percent=Number(payout);if(price===""||payout===""||!Number.isFinite(spot)||spot<=0||!Number.isFinite(percent)||percent<0)return 0;return spot*(unit==="gram"?1/31.1034768:1/20)*Number(purity)*percent/100;}
export function platinumRowTotal(price,payout,purity,weight,unit){return platinumUnitPrice(price,payout,purity,unit)*Math.max(0,Number(weight)||0);}
