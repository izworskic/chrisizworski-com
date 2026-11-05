'use strict';
/**
 * PMRF independently checked official source desk.
 * Contract: status is a published GENERAL POLICY or dated PARK NOTICE,
 * never permission to enter PMRF, a live maritime-zone activation, or
 * confirmation of a rocket flight. No LL2, visitor IDs, geolocation,
 * user-submitted URLs, secrets, scraping bypasses or personal data.
 */
const SOURCES=Object.freeze({
 beach:'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/',
 guest:'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Resources/MWR-Guest-Pass-Program/',
 park:'https://dlnr.hawaii.gov/dsp/important-park-notices/',
 navcen:'https://navcen.uscg.gov/local-notices-to-mariners-by-cg-district'
});
const MAX_BYTES=700000;
const normalize=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/&rsquo;|&lsquo;|&#8217;|&#8216;/gi,"'")
 .replace(/[\u2018\u2019\u02bb\u201b]/g,"'")
 .replace(/\s+/g,' ').trim().toUpperCase();
const contains=(s,r)=>r.test(normalize(s));
function beachPolicy(body){
 const content=normalize(body);
 if(!content.includes('CURRENT BEACH ACCESS'))return {status:'unverified',message:'The current Navy shoreline policy wording was not located.'};
 if(content.includes('ALL PUBLIC ACCESSIBLE SHORELINE AREAS ARE OPEN')&&content.includes('RESTRICTED AREA SIGNAGE'))
  return {status:'general-policy-retrieved',message:'Navy page states that generally accessible shoreline areas are open except posted restricted areas. This is NOT a mission-time opening or an exemption from unannounced restrictions.'};
 return {status:'unverified',message:'The Navy shoreline policy may have changed. Confirm the published notice and posted restrictions.'};
}
function guestPolicy(body){
 const content=normalize(body);
 const recreational=content.includes('RECREATIONAL PURPOSES ONLY');
 const check=content.includes('BACKGROUND INVESTIGATION');
 if(recreational&&check)return {status:'recreation-only-confirmed',
  message:'Navy guest cards require a background check and cover authorized recreation, not launch viewing. Force-protection and range restrictions can override ordinary access.'};
 return {status:'unverified',message:'Guest-card terms could not be verified. Consult the Navy Pass & ID desk.'};
}
function parkPolicy(body){
 const content=normalize(body),anchor=content.search(/(?:11\/2\/26|10\/30\/26|11\/02\/26)/);
 const early=anchor<0?content.slice(0,17000):content.slice(anchor,anchor+11000);
 const closure=early.includes('ALL OTHER KAUA')&&early.includes('STATE PARKS REMAIN CLOSED');
 const reopened=early.includes('POLIHALE STATE PARK HAS REOPENED')||
  early.includes('POLIHALE STATE PARK REOPENED')||early.includes('POLIHALE STATE PARK HAS REOPENED');
 if(closure&&!reopened)return {status:'published-closure',message:'DLNR notice still states that other Kauaʻi state parks remain closed. Polihale is not among its listed reopenings. This is a dated agency notice, not a live gate sensor.'};
 return {status:'unverified',message:'Could not establish Polihale access from the latest parsed DLNR notice. Do not assume it reopened.'};
}
async function fetchOfficial(url,fetcher=fetch){
 // Fixed allowlisted authorities only. Never proxy URL parameters supplied by visitors.
 if(!Object.values(SOURCES).includes(url))throw Error('untrusted-source');
 const response=await fetcher(url,{headers:{Accept:'text/html','User-Agent':'ChrisIzworskiRangeDesk/1.0 (+https://chrisizworski.com)'},signal:AbortSignal.timeout(8500)});
 if(!response?.ok)throw Error('source-http-unavailable');
 const hint=Number(response.headers?.get?.('content-length')||0);
 if(hint>MAX_BYTES)throw Error('source-size-exceeded');
 const body=await response.text();
 if(body.length>MAX_BYTES)throw Error('source-size-exceeded');
 return body;
}
async function readOfficial({fetcher=fetch,now=new Date().toISOString()}={}){
 const keys=['beach','guest','park'];
 const results=await Promise.allSettled(keys.map(k=>fetchOfficial(SOURCES[k],fetcher)));
 const parser={beach:beachPolicy,guest:guestPolicy,park:parkPolicy};
 const evidence={};
 for(let i=0;i<keys.length;i++){
  const k=keys[i],item=results[i];
  const parsed=item.status==='fulfilled'?parser[k](item.value):
   {status:'source-unavailable',message:'Official source could not be retrieved. Follow the official link and do not infer any opening.'};
  evidence[k]={...parsed,sourceUrl:SOURCES[k],checkedAt:now};
 }
 return {ok:true,checkedAt:now,
  rule:{type:'conditional-maritime-safety-zone',citation:'33 CFR 165.1406',
   sourceUrl:'https://www.ecfr.gov/current/title-33/chapter-I/subchapter-P/part-165/section-165.1406',
   bulletinUrl:SOURCES.navcen,activationStatus:'not-checked',message:'Regulatory geometry applies to specified STARS launch operations when activated by Coast Guard notice. This source desk does not monitor live zone activation.'},
  evidence};
}
function createHandler(deps={}){
 return async (req,res)=>{
  if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{return res.status(200).json(await readOfficial(deps));}
  catch{return res.status(502).json({ok:false,error:'Official source desk unavailable; access not verified.'});}
 };
}
module.exports=createHandler();
module.exports._test={SOURCES,MAX_BYTES,normalize,beachPolicy,guestPolicy,parkPolicy,fetchOfficial,readOfficial,createHandler};
