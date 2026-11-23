'use strict';
// Only operator-controlled report pages. A request timestamp is NOT a report timestamp.
// Never infer ski operations from forecast, calendar, weather, season, or stale CMS content.
const SOURCES=Object.freeze({
  'boyne-mountain':{url:'https://www.boynemountain.com/mountain-report',parser:'boyne'},
  'the-highlands':{url:'https://www.highlandsharborsprings.com/mountain-report',parser:'highlands'},
  'crystal-mountain':{url:'https://www.crystalmountain.com/ski/cams-conditions/mountain-report',parser:'crystal'},
  'nubs-nob':{url:'https://www.nubsnob.com/conditions-tables/',parser:'nubs'},
  'shanty-creek':{url:'https://www.shantycreek.com/ski/conditions-cams/',parser:'shanty'},
  'caberfae-peaks':{url:'https://caberfaepeaks.com/snow-report/',parser:'caberfae'},
  'treetops':{url:'https://www.treetops.com/live/',parser:'treetops'},
  'mt-holly':{url:'https://skimtholly.com/snow-report/',parser:'mt-holly'},
  'pine-knob':{url:'https://skipineknob.com/snow-report/',parser:'pine-knob'},
  'cannonsburg':{url:'https://cannonsburg.com/',parser:'cannonsburg'},
  'mt-bohemia':{url:'https://www.mtbohemia.com/current-conditions/',parser:'bohemia'},
  'marquette-mountain':{url:'https://www.marquettemountain.com/the-mountain/lift-terrain-status/',parser:'marquette'},
  'big-powderhorn':{url:'https://bigpowderhorn.net/mountain-report/',parser:'powderhorn'},
  'snowriver':{url:'https://www.snowriver.com/mountain-info/mountain-report',parser:'snowriver'},
  'ski-brule':{url:'https://skibrule.com/brule-mountain/snow-conditions/',parser:'brule'},
  'porcupine-mountains':{url:'https://www.michigan.gov/skitheporkies/the-mountain/trail-and-snow-report',parser:'porkies'}
});
// Alpine Valley publishes operating-hours and season notices but no verifiable lift/trail
// report URL as of 2026-11-23. Keep it NOT_CONNECTED rather than treating its homepage as one.
const MAX_REPORT_AGE_MS=36*60*60*1000;
function clean(html){
 return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;|&ensp;|&emsp;/gi,' ')
  .replace(/&quot;/gi,'"').replace(/&amp;/gi,'&')
  .replace(/&#0*39;|&apos;/gi,"'").replace(/&rsquo;|&#8217;/gi,'’')
  .replace(/\s+/g,' ').trim();
}
function validPair(open,total,max){
 const o=Number(open),n=total==null?null:Number(total);
 if(!Number.isInteger(o)||o<0||o>max||n!==null&&(!Number.isInteger(n)||n<1||n>max||o>n))return null;
 return {open:o,total:n};
}
function pair(t,patterns,max){
 for(const pattern of patterns){const m=t.match(pattern);if(!m)continue;
  const found=validPair(m[1],m[2],max);if(found)return found;
 }return null;
}
const LIFT_PATTERNS=[
 /\bLIFTS?\s+OPEN\s*[:–—-]?\s*(\d{1,2})\s*(?:\/|of)\s*(\d{1,2})\b/i,
 /\b(\d{1,2})\s*(?:\/|of)\s*(\d{1,2})\s+LIFTS?\s+OPEN\b/i,
 /\bLIFT\s+REPORT\s*[·:–-]?\s*(\d{1,2})\s+of\s+(\d{1,2})\s+OPEN\b/i,
 /\bLIFTS?\s+OPEN\s*[:–—-]?\s*(\d{1,2})\b(?!\s*(?:[/／]|of\b))/i,
 /\bLIFTS\s+(\d{1,2})\s*(?:\/|of)\s*(\d{1,2})\b/i
];
const RUN_PATTERNS=[
 /\b(?:TRAILS?|SLOPES|RUNS)\s+OPEN\s*[:–—-]?\s*(\d{1,3})\s*(?:\/|of)\s*(\d{1,3})\b/i,
 /\b(\d{1,3})\s*(?:\/|of)\s*(\d{1,3})\s+(?:TRAILS?|SLOPES|RUNS)\s+OPEN\b/i,
 /\bTRAIL\s+REPORT\s*[·:–-]?\s*(\d{1,3})\s+of\s+(\d{1,3})\s+OPEN\b/i,
 /\b(?:NUMBER\s+OF\s+RUNS|TRAILS?|SLOPES)\s+OPEN\s*[:–—-]?\s*(\d{1,3})\b/i,
 /\bTRAILS\s+(\d{1,3})\s+of\s+(\d{1,3})\b/i,
 /\b(?:PRIMARY\s+TRAILS|TRAILS\s+PRIMARY)\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/i
];
function reportDate(t,slug){
 let m;
 // Explicit date published by the operator near its report (never article metadata,
 // forecast dates, a cached-response header, or a ticket/season calendar).
 if(slug==='nubs-nob'){
  m=t.match(/\bDate\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i);
  if(m){const y=Number(m[3]);return dateOnly(y<100?2000+y:y,Number(m[1]),Number(m[2]));}
 }
 const patterns=slug==='caberfae-peaks'?
  [/\bToday[’']?s\s+Date\s*:\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})\b/i]:
  slug==='ski-brule'?
  [/\bUPDATE\s*:\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i]:
  slug==='mt-bohemia'?
  [/\bUPDATED\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i]:
  [/\b(?:Report\s+Updated|Report\s+as\s+of|Last\s+updated)\s*[:–-]?\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i];
 for(const pattern of patterns){m=t.match(pattern);
  if(m){const month=monthIndex(m[1]);if(month)return dateOnly(Number(m[3]),month,Number(m[2]));}
 }
 return null;
}
function monthIndex(m){return ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(String(m).toLowerCase())+1;}
function dateOnly(y,m,d){
 if(!Number.isInteger(y)||y<2025||y>2032||m<1||m>12||d<1||d>31)return null;
 // Conservative midnight in Michigan, with no fabricated publication hour.
 const v=new Date(Date.UTC(y,m-1,d));
 if(v.getUTCFullYear()!==y||v.getUTCMonth()!==m-1||v.getUTCDate()!==d)return null;
 // Operator published a calendar date, not an update hour. Retain date-only precision.
 return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function operatorWords(t,slug){
 const patterns=slug==='mt-bohemia'?[/Another great season has come to a close\.?/i]:
 slug==='snowriver'?[/ANTICIPATED OPENING DAY OF THE 2026\/2027 SEASON IS [^.]{0,60}/i,/Opening Day Update\s*[\|·–-]?\s*[^.]{0,40}/i]:
 slug==='ski-brule'?[/We will NOT be opening [^.]{0,80}/i,/targeting Thanksgiving Day[^.]{0,60}/i]:
 slug==='pine-knob'?[/We are OPEN for the 2025\/2026 season\.?/i]:[];
 for(const p of patterns){const m=t.match(p);if(m)return m[0].slice(0,150);}
 return null;
}
function parse(slug,html){
 if(!SOURCES[slug])return null;
 const t=clean(html);
 if(t.length<70||t.length>1500000)return null;
 let lifts=pair(t,LIFT_PATTERNS,50),trails=pair(t,RUN_PATTERNS,250);
 // Distinguish individual-lift listings from a season-wide "Lifts Open" claim.
 if((slug==='mt-holly'||slug==='pine-knob')&&!lifts){
  const section=t.match(/\bSlope Access\b([\s\S]{0,3000}?)\bTrail Access\b/i)?.[1]||'';
  const statuses=[...section.matchAll(/\b(?:Wonder Carpet|Chair Lift|Rope Tow)\s*#[\w -]{1,30}?\s*:\s*(?:Image\s*)?(Open|Closed)\b/gi)];
  if(statuses.length>=3)lifts=validPair(statuses.filter(x=>x[1].toLowerCase()==='open').length,statuses.length,50);
 }
 // A season-closure narrative is not an operator-published lift count.
 // The preexisting three detailed report formats require both metric fields.
 if(['caberfae-peaks','crystal-mountain','shanty-creek'].includes(slug)&&(!lifts||!trails))return null;
 const reportUpdatedAt=reportDate(t,slug);
 const operatorStatusText=operatorWords(t,slug);
 if(!lifts&&!trails&&!operatorStatusText)return null;
 return {lifts,trails,reportUpdatedAt,operatorStatusText};
}
function classifyParsed(parsed,now=Date.now()){
 if(!parsed)return {status:'UNVERIFIED',reason:'UNRECOGNIZED_REPORT_FORMAT'};
 if(!parsed.reportUpdatedAt)return {...parsed,status:'UNVERIFIED',reason:'UNDATED_OPERATOR_REPORT'};
 // A date-only source is aged conservatively from 00:00 UTC, never assigned a fabricated hour.
 const ms=Date.parse(parsed.reportUpdatedAt),age=now-ms;
 if(!Number.isFinite(ms)||age < -3*3600000)return {...parsed,status:'UNVERIFIED',reason:'INVALID_REPORT_DATE'};
 if(age>MAX_REPORT_AGE_MS)return {...parsed,status:'STALE_REPORT',reason:'REPORT_OVER_36_HOURS'};
 if(!parsed.lifts||!Number.isInteger(parsed.lifts.open))return {...parsed,status:'UNVERIFIED',reason:'NO_LIFT_COUNT'};
 // If the report itself announces a future opening, do not claim lift-served skiing.
 if(parsed.lifts.open>0&&/anticipated opening day|we will not be opening|another great season has come to a close/i.test(parsed.operatorStatusText||''))return {...parsed,status:'UNVERIFIED',reason:'OPERATOR_STATUS_CONFLICT'};
 return {...parsed,status:parsed.lifts.open>0?'OPEN_PER_OPERATOR':'CLOSED_PER_OPERATOR'};
}
async function fetchOfficial(slug,fetcher=fetch,now=Date.now()){
 const src=SOURCES[slug];
 if(!src)return {status:'NOT_CONNECTED',url:null,checkedAt:new Date(now).toISOString()};
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4500);
 const checkedAt=new Date(now).toISOString();
 try{
  const response=await fetcher(src.url,{signal:abort.signal,redirect:'follow',
   headers:{'User-Agent':'ChrisIzworski Michigan Ski Decision Engine (contact via chrisizworski.com)','Accept':'text/html'}});
  if(!response.ok)return {status:'UNVERIFIED',url:src.url,checkedAt,reason:'SOURCE_HTTP_ERROR'};
  const html=await response.text();
  const parsed=classifyParsed(parse(slug,html),now);
  return {...parsed,url:src.url,checkedAt,disclosure:'Operator-published evidence only. A page fetch does not reset its report timestamp; confirm same-day lift operations with the resort.'};
 }catch{return {status:'UNVERIFIED',url:src.url,checkedAt,reason:'SOURCE_UNAVAILABLE'};}
 finally{clearTimeout(timer);}
}
module.exports={SOURCES,clean,parse,reportDate,classifyParsed,fetchOfficial,MAX_REPORT_AGE_MS};
