'use strict';
// Public, evidence-only observation and NOAA ice adapter. No geolocation of an
// eagle, roost, nest or individual observer is returned or plotted.
// Reads one preapproved public viewing-area corridor at a time.
const SITES={"detroit":{"lat":42.1105,"lon":-83.1847,"lake":"erie"},"shiawassee":{"lat":43.32515,"lon":-84.0327,"lake":"huron"},"croton":{"lat":43.435561,"lon":-85.66678},"soo-cfre":{"lat":46.4904,"lon":-84.3546,"lake":"superior"},"menominee":{"lat":45.7597,"lon":-87.939,"lake":"michigan"},"tippy":{"lat":44.26841,"lon":-85.93562},"ausable":{"lat":44.43592,"lon":-83.62381,"lake":"huron"},"soo-rotary":{"lat":46.48378,"lon":-84.30077,"lake":"superior"},"soo-locks":{"lat":46.5025,"lon":-84.3484,"lake":"superior"},"escanaba-north":{"lat":45.77807,"lon":-87.06436,"lake":"michigan"},"seney":{"lat":46.21635,"lon":-85.96977},"prairie":{"lat":43.2896,"lon":-89.7215},"red-wing":{"lat":44.5595,"lon":-92.516},"wabasha":{"lat":44.3836,"lon":-92.0313},"fulton":{"lat":41.9001,"lon":-90.1566},"pleasant":{"lat":41.5632,"lon":-90.4041},"starved":{"lat":41.3187,"lon":-88.9708},"riverlands":{"lat":38.8812,"lon":-90.1866},"clarksville":{"lat":39.3696,"lon":-90.902}};
const NOAA_BASE='https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/';
const INAT_BASE='https://api.inaturalist.org/v1/observations';
const ICE_SOURCE='https://www.glerl.noaa.gov/data/ice/index.html';
const INAT_SOURCE='https://www.inaturalist.org/pages/api+recommended+practices';
const COL={superior:2,michigan:3,huron:4,erie:5,ontario:6,'st-clair':7,basin:8};
const toDate=d=>new Date(d).toISOString().slice(0,10);
const dateOnly=raw=>typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw)&&!Number.isNaN(Date.parse(raw))?raw:null;
function winterSeason(now) {
 const d=new Date(now),y=d.getUTCFullYear(),m=d.getUTCMonth()+1;
 const from=m>=11?y:m<=6?y-1:y-1;
 return {start:from,end:from+1,url:NOAA_BASE+'g'+from+'_'+(from+1)+'_ice.dat'};
}
function parseIce(text,lake,now=Date.now()){
 const index=COL[lake];if(!index||typeof text!=='string')return null;
 const rows=[];
 for(const line of text.split(/\r?\n/)){
  const parts=line.trim().split(/\s+/);
  if(parts.length!==9||!/^20\d\d$/.test(parts[0])||!/^\d{1,3}$/.test(parts[1]))continue;
  const year=Number(parts[0]),day=Number(parts[1]),utc=Date.UTC(year,0,day);
  if(day<1||day>(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000)continue;
  if(new Date(utc).getUTCFullYear()!==year)continue;
  if(utc>now+86400000)continue;
  const pct=Number(parts[index]);
  if(!Number.isFinite(pct)||pct<0||pct>100)continue;
  rows.push({date:new Date(utc).toISOString().slice(0,10),pct:Math.round(pct*100)/100,time:utc});
 }
 rows.sort((a,b)=>b.time-a.time);
 const latest=rows[0];if(!latest)return null;
 const prior=rows.find(r=>r.time<=latest.time-5*86400000&&r.time>=latest.time-10*86400000);
 const ageDays=Math.max(0,Math.floor((now-latest.time)/86400000));
 return {date:latest.date,percent:latest.pct,previousPercent:prior?.pct??null,deltaPctPoints:prior?Math.round((latest.pct-prior.pct)*100)/100:null,ageDays,recency:ageDays<=7?'recent':'historical',lake};
}
function summarizeObservations(json,now=Date.now()){
 if(!json||!Array.isArray(json.results)||!Number.isFinite(json.total_results))return null;
 const dateStart=now-31*86400000,dateEnd=now+86400000;
 const unique=new Set(),dates=[];
 for(const o of json.results){
  if(o?.quality_grade!=='research'||o?.captive===true)continue;
  // Taxonomic descendants (subspecies) may inherit the Bald Eagle taxon.
  if(o?.taxon?.id!==5305&&!o?.taxon?.ancestor_ids?.includes(5305))continue;
  const d=dateOnly(o?.observed_on),id=Number(o?.id);if(!d||!Number.isSafeInteger(id)||unique.has(id))continue;
  const day=Date.parse(d+'T12:00:00Z');
  if(!Number.isFinite(day)||day<dateStart||day>dateEnd)continue;
  unique.add(id);dates.push(d);
 }
 dates.sort((a,b)=>b.localeCompare(a));
 const observed=dates[0]||null;
 const ageDays=observed?Math.max(0,Math.floor((now-Date.parse(observed+'T12:00:00Z'))/86400000)):null;
 return {
  observationsSampled:dates.length,latestObservedOn:observed,ageDays,
  returnedRows:json.results.length,moreRecords:json.total_results>json.results.length,
  sourceTotalReported:json.total_results,hasObservations:dates.length>0
 };
}
async function fetchChecked(url,kind){
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),7800);
 try{
  const res=await fetch(url,{signal:ctrl.signal,headers:{'Accept':kind==='text'?'text/plain':'application/json','User-Agent':'ChrisIzworski-WinterEagleFieldGuide/1.0 (https://chrisizworski.com/winter-eagle-watching/)'}});
  if(!res.ok)throw Error('upstream '+res.status);
  const body=await res.text();if(body.length>(kind==='text'?200000:650000))throw Error('upstream body too large');
  return kind==='text'?body:JSON.parse(body);
 }finally{clearTimeout(timer)}
}
async function observations(site,now){
 const start=toDate(now-30*86400000),end=toDate(now);
 const u=new URL(INAT_BASE);
 for(const [k,v] of Object.entries({taxon_id:'5305',quality_grade:'research',verifiable:'true',lat:site.lat,lng:site.lon,radius:'40',d1:start,d2:end,per_page:'80',order_by:'observed_on',order:'desc'}))u.searchParams.set(k,String(v));
 // These are **broad 40 km corridor** reports, not observations at the trailhead.
 const base={source:'iNaturalist',scope:'40 km surrounding public viewing area',windowStart:start,windowEnd:end,searchUrl:'https://www.inaturalist.org/observations?'+u.searchParams.toString()};
 try{
  const data=summarizeObservations(await fetchChecked(u.href,'json'),now);
  if(!data)return {...base,status:'unavailable',reason:'Invalid community observation response'};
  return {...base,status:'ok',...data};
 }catch{return {...base,status:'unavailable',reason:'Community observation feed temporarily unavailable'}}
}
async function ice(site,now){
 if(!site.lake)return {status:'not_applicable',reason:'No lake-wide measurement is a valid proxy for this inland river location.',sourceUrl:ICE_SOURCE};
 const season=winterSeason(now);
 const base={source:'NOAA GLERL',sourceUrl:season.url,landingUrl:ICE_SOURCE,lake:site.lake,season:season.start+'–'+season.end,scope:'Lake-wide measurement, NOT local river ice'};
 try{
  const sample=parseIce(await fetchChecked(season.url,'text'),site.lake,now);
  if(!sample)return {...base,status:'unavailable',reason:'No parseable NOAA daily ice measurement'};
  return {...base,status:sample.recency==='recent'?'recent':'historical',...sample};
 }catch{return {...base,status:'unavailable',reason:'NOAA season file not yet available or temporarily unreachable'}}
}
async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, max-age=300, s-maxage=21600, stale-while-revalidate=43200');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET')return res.status(405).json({available:false,error:'Method not allowed'});
 const id=String(req.query?.site||'');
 if(!Object.prototype.hasOwnProperty.call(SITES,id))return res.status(400).json({available:false,error:'Unknown site'});
 const site=SITES[id],now=Date.now();
 const [obs,iceResult]=await Promise.all([observations(site,now),ice(site,now)]);
 return res.status(200).json({available:true,site:id,asOf:new Date(now).toISOString(),observations:obs,ice:iceResult,limitations:[
 'Community eagle reports are incomplete and may be reported late. Records are not counts of individual eagles.',
 '40-km reports do not confirm eagles at the selected viewing spot. No precise bird observation coordinates are provided.',
 'NOAA lake-wide ice is not a measurement of river, dam tailwater, inland marsh, or shore-access ice.',
 'Neither observation feed predicts talon-locking cartwheels, feeding concentrations or nesting behavior.'
 ]});
}
module.exports=handler;
module.exports._test={winterSeason,parseIce,summarizeObservations,SITES};
