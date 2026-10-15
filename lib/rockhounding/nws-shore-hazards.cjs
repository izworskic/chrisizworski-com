'use strict';
// NWS alert evaluation for Grand Marais research; absence of alerts != a safe beach.
const URLS=Object.freeze([
 'https://api.weather.gov/alerts/active?zone=LSZ250',
 'https://api.weather.gov/alerts/active?zone=LSZ251',
 'https://api.weather.gov/alerts/active?point=46.675,-85.985'
]);
const RELEVANT=/gale|storm|hurricane|tropical|small craft|special marine|hazardous seas|high surf|beach hazards|rip current|lakeshore flood|coastal flood|flood warning|high wind|wind advisory|extreme wind|waterspout|dense fog|freezing spray|winter storm|blizzard|ice storm|thunderstorm|tornado|marine weather/i;
function assessAlerts(payloads,nowISO){
 const now=Date.parse(nowISO);if(!Number.isFinite(now))return {status:'UNKNOWN',reason:'CLOCK_INVALID'};
 if(!Array.isArray(payloads)||payloads.length!==URLS.length)return {status:'UNKNOWN',reason:'SOURCES_INCOMPLETE'};
 const active=[];let failures=0,counts=0;
 for(const p of payloads){
  if(!p?.ok||!Array.isArray(p.data?.features)){failures++;continue;}
  counts++;
  for(const f of p.data.features){
   const item=f?.properties||{},event=item.event||'';
   if(!RELEVANT.test(event))continue;
   const expiration=Date.parse(item.ends||item.expires||'');
   if(Number.isFinite(expiration)&&expiration<now)continue;
   active.push({event,headline:item.headline||event,severity:item.severity||'Unknown',
    ends:item.ends||item.expires||null,source:'NWS_ACTIVE_ALERTS'});
  }
 }
 if(active.length)return {status:'ACTIVE',alerts:active,partialSourceFailure:failures>0};
 if(failures)return {status:'UNKNOWN',reason:'SOURCES_UNAVAILABLE',sourcesReturned:counts};
 return {status:'CLEAR',alerts:[],caveat:'No currently relevant NWS alerts returned; NOT proof of safe wave or shore conditions'};
}
async function loadGrandMaraisHazards({fetchFn=fetch,nowISO=new Date().toISOString()}={}){
 const payloads=[];
 for(const url of URLS){
  try{
   const res=await fetchFn(url,{headers:{'Accept':'application/geo+json',
    'User-Agent':'ChrisIzworskiRockhounding/0.1 (chrisizworski.com)'},signal:AbortSignal.timeout(7000)});
   if(!res?.ok){payloads.push({ok:false});continue;}
   const data=await res.json();payloads.push({ok:true,data});
  }catch{payloads.push({ok:false});}
 }
 return {...assessAlerts(payloads,nowISO),sources:URLS};
}
module.exports={URLS,RELEVANT,assessAlerts,loadGrandMaraisHazards};
