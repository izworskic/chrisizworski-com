/* Source-agnostic AIS harbor watch. Transiting and unloading traffic is never labeled winter layup. */
'use strict';
const {normalize}=require('../lib/soo-ais');
const {aisActivity,seasonForDate,PORTS}=require('../lib/freighter-layup-season');
const BOXES=[[46,-93,49,-84],[41,-88,46,-81],[41,-81,45,-76]];
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'GET required'})}
 try{
  const headers={Accept:'application/geo+json,application/json','User-Agent':'FreighterLayupHarborWatch/1.0 (+https://chrisizworski.com/great-lakes-freighter-winter-layup/)'};
  if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
  const q=BOXES.map(b=>'bbox='+b.join(',')).join('&');
  const upstream=await fetch('https://ais.openwaters.io/v1/vessels?'+q,{headers,signal:AbortSignal.timeout(9500)});
  if(!upstream.ok)throw Error('provider response '+upstream.status);
  const now=Date.now(),raw=normalize(await upstream.json(),now,[41,-93,49,-76]);
  const activity=aisActivity(raw.vessels,now);
  res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=120');
  return res.status(200).json({ok:true,checkedAt:new Date(now).toISOString(),season:seasonForDate(now),
   signalType:'recent_harbor_AIS_only',notLayupConfirmations:true,harbors:PORTS.map(({id})=>id),
   activity,attribution:raw.attribution,limitations:'AIS reports may be missing or delayed. A stationary ship may be loading, unloading, repairing, or out of coverage. Never treat an AIS-only signal as confirmed winter layup.'});
 }catch(e){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({ok:false,activity:[],error:'AIS harbor watch temporarily unavailable; existing dated layup stories remain visible.',notLayupConfirmations:true});
 }
};
