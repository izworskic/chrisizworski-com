import {acisRange} from './thermal.mjs';
import {michiganIceClock} from './season.mjs';
import weather from '../nws-grid.cjs';
import {SITES,STATIONS,REPORTS,ACCESS_REVIEWS,DEFERRED} from './sites.mjs';
const DAY=86400000;
export function localDate(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function seasonFor(now=new Date()){
 const clock=michiganIceClock(now),today=clock.today,year=clock.seasonYear;
 const start=year+'-11-01',end=(year+1)+'-04-30',yesterday=new Date(Date.parse(today+'T12:00:00Z')-DAY).toISOString().slice(0,10);
 return {year,label:year+'–'+String(year+1).slice(-2),start,end,today,through:yesterday<end?yesterday:end,preSeason:today<start,ended:today>end};
}
function dates(start,end){const out=[];for(let t=Date.parse(start+'T12:00Z');t<=Date.parse(end+'T12:00Z');t+=DAY)out.push(new Date(t).toISOString().slice(0,10));return out;}
function numeric(v){return typeof v==='number'?Number.isFinite(v)?v:null:typeof v==='string'&&/^-?\d+(\.\d+)?$/.test(v)?Number(v):null;}
export function thermalHistory(rows,start,end){
 const map=new Map((rows||[]).map(r=>[r[0],r]));let cold=0,thaw=0,net=0,complete=true,validDays=0,lastValid=null,streak=0;
 const daily=dates(start,end).map(date=>{
  const r=map.get(date),high=numeric(r?.[1]),low=numeric(r?.[2]);
  if(high===null||low===null||high<low||high>140||low< -100){complete=false;streak=0;return {date,valid:false,fdd:null};}
  const mean=(high+low)/2,freeze=Math.max(0,32-mean),warm=Math.max(0,mean-32);
  validDays++;lastValid=date;cold+=freeze;thaw+=warm;net=Math.max(0,net+32-mean);streak=high<32?streak+1:0;
  return {date,valid:true,high,low,freeze,thaw:warm,fdd:complete?Math.round(cold*10)/10:null,netCold:complete?Math.round(net*10)/10:null};
 });
 return {start,end,daily,expectedDays:daily.length,validDays,complete:complete&&validDays>0,lastValid,
  fdd:complete&&validDays?Math.round(cold*10)/10:null,thaw:complete&&validDays?Math.round(thaw*10)/10:null,
  observedColdLowerBound:validDays?Math.round(cold*10)/10:null,freezingStreak:complete?streak:null};
}
function validDay(v){try{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00Z').toISOString().slice(0,10)===v;}catch{return false;}}
function duration(v){const m=String(v).match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);return m?((+m[1]||0)*24+(+m[2]||0)+(+m[3]||0)/60)*3600000:0;}
export function forecastSummary(grid,now=new Date()){
 const p=grid?.properties;if(!p||p.temperature?.uom!=='wmoUnit:degC')return null;
 const issue=Date.parse(p.updateTime),t=now.getTime();if(!Number.isFinite(issue)||issue>t+300000||t-issue>12*3600000)return null;
 const hours=new Map();
 for(const r of p.temperature.values||[]){
  if(typeof r.value!=='number'||!Number.isFinite(r.value))continue;
  const [a,b]=String(r.validTime).split('/'),start=Date.parse(a),end=start+duration(b),from=Math.max(start,t),to=Math.min(end,t+7*DAY);
  for(let h=Math.floor(from/3600000)*3600000;h<to;h+=3600000){const overlap=Math.max(0,Math.min(h+3600000,to)-Math.max(h,from));if(overlap)hours.set(h,{at:Math.max(h,from),f:r.value*9/5+32,hours:overlap/3600000});}
 }
 const grouped=new Map();for(const r of [...hours.values()].sort((a,b)=>a.at-b.at)){
  const date=localDate(new Date(r.at));if(!grouped.has(date))grouped.set(date,[]);grouped.get(date).push(r);
 }
 return {issuedAt:p.updateTime,source:'National Weather Service forecast grid',grid:p['@id']||null,days:[...grouped].map(([date,r])=>({date,low:Math.round(Math.min(...r.map(x=>x.f))),high:Math.round(Math.max(...r.map(x=>x.f))),hours:Math.round(r.reduce((s,x)=>s+x.hours,0)*10)/10,
  thawHours:Math.round(r.filter(x=>x.f>32).reduce((s,x)=>s+x.hours,0)*10)/10,freezeDegreeHours:Math.round(r.reduce((s,x)=>s+Math.max(0,32-x.f)*x.hours,0)),thawDegreeHours:Math.round(r.reduce((s,x)=>s+Math.max(0,x.f-32)*x.hours,0))}))};
}
export function evidenceFor(site,{now=new Date(),season=seasonFor(now),reports=REPORTS,reviews=ACCESS_REVIEWS,forecast=null,history=null}={}){
 const t=now.getTime(),day=localDate(now);
 const supported=new Set([new URL(site.authority).hostname,new URL(site.source).hostname]);
 const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&supported.has(u.hostname);}catch{return false;}};
 const review=reviews.filter(r=>r.siteId===site.id&&r.viewingScope===site.scope&&r.authority===site.manager&&official(r.source)&&['open','closed'].includes(r.state)&&Number.isFinite(Date.parse(r.reviewedAt))&&Date.parse(r.reviewedAt)<=t).sort((a,b)=>Date.parse(b.reviewedAt)-Date.parse(a.reviewedAt))[0];
 const access=review?.state==='closed'?'closed':review?.state==='open'&&t-Date.parse(review.reviewedAt)<=DAY?'reviewed-open':'unverified';
 const report=reports.filter(r=>r.siteId===site.id&&validDay(r.observedOn)&&validDay(r.publishedOn)&&r.publishedOn>=r.observedOn&&r.publishedOn<=day&&r.observedOn>=season.start&&r.observedOn<=day&&r.viewingScope===site.scope&&r.authority===site.manager&&['not-forming','forming','formed','degrading'].includes(r.state)&&official(r.source)).sort((a,b)=>b.observedOn.localeCompare(a.observedOn))[0];
 // Date-only reports expire conservatively from the start of their UTC observation date.
 const fresh=!!report&&t-Date.parse(report.observedOn+'T00:00:00Z')<=72*3600000;
 const forecastThaw=forecast?.days?.length&&forecast.days.reduce((sum,d)=>sum+(d.hours||0),0)>=24?forecast.days.some(d=>d.thawHours>0):null;
 const laterThaw=report&&history?.daily?.some(d=>d.date>=report.observedOn&&d.valid&&d.high>32);
 const laterGap=report&&history?.daily?.some(d=>d.date>=report.observedOn&&!d.valid);
 const weatherThaw=forecastThaw===null?null:!!(forecastThaw||laterThaw||laterGap);
 let state=season.preSeason?'pre-season':season.ended?'season-ended':'unconfirmed',label=season.preSeason?'Formation season ahead':season.ended?'Season record · check current reports':'No recent formation confirmation';
 if(fresh){state=report.state;label=({'not-forming':'Not Forming Yet',forming:'Forming',formed:'Formed',degrading:'Degrading'})[state];}
 const validUntil=report&&review&&forecast?Math.min(Date.parse(report.observedOn+'T00:00Z')+72*3600000,Date.parse(review.reviewedAt)+DAY,Date.parse(forecast.issuedAt)+12*3600000):null;
 const prime=fresh&&state==='formed'&&report.prime===true&&access==='reviewed-open'&&weatherThaw===false&&validUntil>t&&history?.complete===true;
 if(prime)label='Formed — Prime Viewing';
 return {state,label,access,accessReviewedAt:review?.reviewedAt||null,prime,validUntil:validUntil?new Date(validUntil).toISOString():null,report:report||null,reportFresh:fresh,basis:fresh?'dated official report':season.preSeason?'seasonal context':'no current official confirmation',weatherThaw,
  recommendation:prime?'Recent viewing evidence and reviewed access support considering this trip.':'A dedicated ice-formation trip is not currently confirmed. Use the official sources before committing to the drive.'};
}
let cache=null,expires=0,inFlight=null;
export async function collectCaves(now=new Date()){
 const season=seasonFor(now),through=season.through;
 const grids=new Map(SITES.map(site=>[site.lat+','+site.lon,site]));
 const gridJobs=new Map([...grids].map(([key,site])=>[key,weather.gridAt(site)]));
 const histories=await Promise.all(Object.entries(STATIONS).map(async([key,s])=>{
  let current=null,previous=null;
  // On November 1 there is not yet a completed season day. Never query
  // ACIS with a backward or same-day unfinished observation window.
  if(!season.preSeason && through>=season.start){
   try{current=thermalHistory(await acisRange(s.id,season.start,through),season.start,through);}catch{}
  }
  // Keep the day-by-day prior winter inspector available after November 1.
  // Previous observations are always separate from this year's current field.
  const a=(season.year-1)+'-11-01',b=season.year+'-03-31';
  try{previous=thermalHistory(await acisRange(s.id,a,b),a,b);}catch{}
  return [key,{...s,current,previous}];
 }));
 const stationMap=Object.fromEntries(histories);
 const sites=await Promise.all(SITES.map(async site=>{
  const grid=await gridJobs.get(site.lat+','+site.lon),forecast=forecastSummary(grid.grid,now);
  return {...site,station:stationMap[site.station],forecast,evidence:evidenceFor(site,{now,season,forecast,history:stationMap[site.station].current})};
 }));
 return {ok:true,generatedAt:now.toISOString(),season,sites,deferred:DEFERRED,
  weekend:'Only a current official viewing report and reviewed access can support a featured ice trip. No report is inferred from accumulated cold.',
  method:'ACIS observed daily max/min; NWS forecast grid. FDD measures weather exposure, not curtain size, stability or safe access.'};
}
export async function cavesResponse(req){
 const url=new URL(req.url),allowed=new Set(['view']);
 if(req.method!=='GET')return new Response(JSON.stringify({error:'METHOD_NOT_ALLOWED'}),{status:405,headers:{Allow:'GET','X-Robots-Tag':'noindex, nofollow'}});
 if([...url.searchParams.keys()].some(k=>!allowed.has(k)))return new Response(JSON.stringify({error:'UNSUPPORTED_PARAMETERS'}),{status:400,headers:{'X-Robots-Tag':'noindex, nofollow'}});
 const now=Date.now();
 const clock=michiganIceClock(new Date(now));
 if(!cache||now>=expires||cache.season.start!==clock.seasonStart||
    cache.season.preSeason!==clock.preSeason){
  if(!inFlight)inFlight=collectCaves().then(v=>{cache=v;expires=Date.now()+15*60000;return v;}).finally(()=>{inFlight=null;});
  await inFlight;
 }
 return new Response(JSON.stringify(cache),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':clock.rolloverWindow?'no-store':'public, max-age=300, stale-while-revalidate=600','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
}
