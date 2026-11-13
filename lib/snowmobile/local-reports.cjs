/* Michigan snowmobile local groomer report desk.
 * Official source links from MISORVA groomer directory, checked 2026-11-13.
 * These local reports are NEVER regional surface scores, proof of legal
 * opening, or freshness inferred from when our API fetched the page.
 */
'use strict';
const ROOT='https://misorva.org/trail-reports/';
const CLUBS=Object.freeze({
 'eastern-up':[
  ['Sault Snowmobile Association','Sault / Brimley / Kinross','sault-snowmobile-association/'],
  ['Paradise Area Night Riders','Paradise / Whitefish Point','paradise-area-night-riders/'],
  ['Tahquamenon Snowmobile Association','Newberry / Tahquamenon area','tahquamenon-snowmobile-association/']],
 'keweenaw-copper-country':[
  ['Keweenaw Trails Services','Houghton / Keweenaw club report','keweenaw-trails-services-inc/'],
  ['Baraga County','Baraga and nearby trail systems','baraga-county-convention-visitors-bureau/'],
  ['North Country Snowmobile Club','Ontonagon area','north-country-snowmobile-club/']],
 'central-western-up':[
  ['Moose Country Snowmobile Club','Michigamme / Republic','moose-country-snowmobile-club/'],
  ['Big Bay 550 Snowmobile Club','Big Bay / County Road 550','big-bay-550-snowmobile-club-2/'],
  ['Gogebic Area Grooming','Lake Gogebic area','gogebic-area-grooming-inc/']],
 'northeast-sunrise':[
  ['Cheboygan Trail Blazers','Cheboygan area','cheboygan-trail-blazers/'],
  ['Presque Isle Sno-Trails','Rogers City / Presque Isle','presque-isle-sno-trails-club/'],
  ['Lewiston Area Trail Groomers','Lewiston and nearby trails','lewiston-area-trail-groomers/']],
 'northwest-michigan':[
  ['Petoskey Snowmobile Club','Petoskey area','petoskey-snowmobile-club/'],
  ['Jordan Valley Trails Council','Jordan Valley / Antrim','jordan-valley-trails-council/'],
  ['Grand Traverse Area Snowmobile Club','Grand Traverse area','grand-traverse-area-snowmobile-club/']],
 'west-michigan':[
  ['Cadillac Winter Promotions','Cadillac area','cadillac-winter-promotions/'],
  ['Pere Marquette Snowmobile Club','Baldwin / Lake County','pere-marquette-snowmobile-club/'],
  ['Benzie-Manistee Snowmobile Club','Benzie / Manistee','im-bybenzie-manistee-snowmobile-club/']]
});
function roster(region){
 const rows=CLUBS[region];return rows?rows.map(([name,scope,slug])=>({name,scope,url:ROOT+slug})):null;
}
const MONTHS=Object.freeze({january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11});
function parseDate(raw){
 const m=String(raw||'').match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
 if(!m)return null;
 const month=MONTHS[m[1].toLowerCase()],day=Number(m[2]),year=Number(m[3]);
 if(year<2010||year>2100)return null; // sentinel 1970 is NOT a grooming observation
 const date=new Date(Date.UTC(year,month,day,12));
 if(date.getUTCDate()!==day||date.getUTCMonth()!==month||date.getUTCFullYear()!==year)return null;
 return date.toISOString().slice(0,10);
}
function localDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function dayAge(date,now=new Date()){
 if(!date)return null;
 const stamped=Date.parse(date+'T12:00:00Z');if(!Number.isFinite(stamped))return null;
 const today=Date.parse(localDay(now)+'T12:00:00Z');
 const age=Math.floor((today-stamped)/86400000);
 return age < -1?null:Math.max(0,age);
}
function freshState(date,now=new Date()){
 const n=dayAge(date,now);return n===null?'UNKNOWN':n<=3?'RECENT':n<=7?'AGING':'STALE';
}
function decode(raw){
 return String(raw||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;|&#x27;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Math.max(0,Number(n))))).replace(/&[a-z]+;/gi,' ');
}
function extractHtml(html){
 const src=String(html||'').slice(0,300000);
 const text=decode(src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
 // MISORVA has a structured block and a separate free-form report body.
 // Only the structured lines are parsed; old narrative must not masquerade
 // as a current report or leak broad claims to the dashboard.
 const m=text.match(/Trail Condition:\s*([\s\S]{1,75}?)\s+Last Groomed:\s*([\s\S]{1,70}?)\s+Reported On:\s*([\s\S]{1,75}?)(?=\s+Groomer Report\b|\s+Poor Trail Complaint\b|$)/i);
 if(!m)return null;
 const condition=m[1].trim(),grooming=parseDate(m[2]),reported=parseDate(m[3]);
 return {condition:/^(excellent|very good|good|fair|poor|good to excellent|fair to good)$/i.test(condition)?condition:null,reportedAt:reported,lastGroomedAt:grooming};
}
function buildReport(record,parsed,now=new Date()){
 const reportAge=dayAge(parsed?.reportedAt,now),groomAge=dayAge(parsed?.lastGroomedAt,now);
 const reportedAt=reportAge===null?null:parsed.reportedAt,lastGroomedAt=groomAge===null?null:parsed.lastGroomedAt;
 const freshness=freshState(reportedAt,now),groomingFreshness=freshState(lastGroomedAt,now);
 const recent=freshness==='RECENT',hasObservation=Boolean(reportedAt);
 const isSeason=[12,1,2,3].includes(Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).format(now)));
 return {
  ...record,state:parsed?(hasObservation?(recent?'RECENT':freshness==='AGING'?'AGING':'STALE'):'UNDATED'):'UNAVAILABLE',
  reportedAt:reportedAt||null,reportAgeDays:reportAge,
  lastGroomedAt:lastGroomedAt||null,groomingAgeDays:groomAge,
  groomingFreshness:groomingFreshness==='RECENT'&&isSeason?'RECENT':groomingFreshness==='AGING'&&isSeason?'AGING':'NOT_CURRENT',
  // Only current, in-season structured conditions may appear; stale prior
  // winters' GOOD/EXCELLENT can never show as present-day ride evidence.
  condition:recent&&isSeason?parsed.condition:null,
  scope:'LOCAL_ONLY',
  advisory:'Club report does not override DNR closure or apply to the whole region.'
 };
}
async function fetchOne(record,now=new Date(),fetchImpl=fetch){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6200);
 try{
  const response=await fetchImpl(record.url,{signal:ctrl.signal,headers:{'Accept':'text/html','User-Agent':'ChrisIzworskiSnowmobileLocalReports/1.0'}});
  if(!response.ok)throw Error('source unavailable');
  const html=await response.text(),parsed=extractHtml(html);
  return buildReport(record,parsed,now);
 }catch{
  return buildReport(record,null,now);
 }finally{clearTimeout(timer)}
}
async function checkRegion(region,now=new Date(),fetchImpl=fetch){
 const sites=roster(region);
 if(!sites)return null;
 const reports=await Promise.all(sites.map(r=>fetchOne(r,now,fetchImpl)));
 return {region,checkedAt:now.toISOString(),source:'MISORVA individual club groomer reports',
   sourceDirectory:'https://misorva.org/trail-report/',
   policy:'Local, structured, dated context only; not a region-wide surface score, a route opening, or permission to ride.',
   reports,
   totals:{monitored:reports.length,available:reports.filter(r=>r.state!=='UNAVAILABLE').length,recent:reports.filter(r=>r.state==='RECENT').length,stale:reports.filter(r=>r.state==='STALE').length}};
}
module.exports={CLUBS,roster,parseDate,localDay,dayAge,freshState,extractHtml,buildReport,fetchOne,checkRegion};
