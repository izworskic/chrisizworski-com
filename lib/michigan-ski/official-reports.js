'use strict';
// Allowlisted official reports only. This is not an untrusted user-supplied URL fetch.
// A fetch timestamp records inspection, NOT the resort's last update time.
const SOURCES=Object.freeze({
  'caberfae-peaks':{url:'https://caberfaepeaks.com/snow-report/',parser:'caberfae'},
  'crystal-mountain':{url:'https://www.crystalmountain.com/ski/cams-conditions/mountain-report',parser:'crystal'},
  'shanty-creek':{url:'https://www.shantycreek.com/ski/conditions-cams/',parser:'shanty'}
});
function clean(html){
  return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&quot;/gi,'"').replace(/&amp;/gi,'&')
    .replace(/\s+/g,' ').trim();
}
function pair(text,label,style,max){
  const pat=style==='of'?new RegExp('\\b'+label+'\\s+(\\d+)\\s+of\\s+(\\d+)\\b','i'):
    new RegExp('\\b'+label+'\\s+(\\d+)\\s*[/／]\\s*(\\d+)\\b','i');
  const m=text.match(pat);if(!m)return null;
  const open=Number(m[1]),total=Number(m[2]);
  return total>=1&&total<=max&&open>=0&&open<=total?{open,total}:null;
}
function parse(slug,html){
  const t=clean(html);
  if(t.length<80||t.length>500000)return null;
  let lifts=null,trails=null,baseDepthInches=null,recentSnowInches=null;
  if(slug==='caberfae-peaks'){
    lifts=pair(t,'LIFTS OPEN\\s*[–—:-]?','slash',30);
    trails=pair(t,'SLOPES OPEN\\s*[–—:-]?','slash',150);
    const b=t.match(/\bSNOW BASE\s*[–—:-]?\s*(\d{1,3})\s*[″"\u201c]?/i);
    const n=t.match(/\b24\s*HOUR SNOWFALL\s*[:–—-]?\s*(\d{1,2})\s*[″"]?/i);
    if(b)baseDepthInches=Number(b[1]);if(n)recentSnowInches=Number(n[1]);
  }else if(slug==='crystal-mountain'){
    lifts=pair(t,'Lifts Open','slash',50);
    trails=pair(t,'Trails Open','slash',200);
    const b=t.match(/\bBase Depth\s+(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*["″]?/i);
    const n=t.match(/\b24h Snowfall\s+(\d{1,2})\s*["″]?/i);
    if(b)baseDepthInches=Number(b[2]||b[1]);if(n)recentSnowInches=Number(n[1]);
  }else if(slug==='shanty-creek'){
    lifts=pair(t,'Lifts','of',50);
    trails=pair(t,'Trails','of',200);
    const n=t.match(/\bPast 24 Hours\s+(\d{1,2})\s+inches\b/i);
    if(n)recentSnowInches=Number(n[1]);
  }else return null;
  // Avoid accidentally claiming a verified open/closed ski operation from a partial page.
  if(!lifts||!trails)return null;
  if(baseDepthInches!==null&&(baseDepthInches<0||baseDepthInches>120))baseDepthInches=null;
  if(recentSnowInches!==null&&(recentSnowInches<0||recentSnowInches>48))recentSnowInches=null;
  return {lifts,trails,baseDepthInches,recentSnowInches};
}
async function fetchOfficial(slug,fetcher=fetch){
 const src=SOURCES[slug];
 if(!src)return {status:'NOT_CONNECTED',url:null};
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),5000);
 try{
   const response=await fetcher(src.url,{signal:abort.signal,redirect:'follow',
     headers:{'User-Agent':'ChrisIzworski Michigan Ski Decision Engine (contact via chrisizworski.com)',
       'Accept':'text/html'}});
   if(!response.ok)return {status:'UNVERIFIED',url:src.url,reason:'SOURCE_HTTP_ERROR'};
   const html=await response.text();
   const parsed=parse(slug,html);
   if(!parsed)return {status:'UNVERIFIED',url:src.url,reason:'UNRECOGNIZED_REPORT_FORMAT'};
   return {...parsed,status:'PUBLISHED_OFFICIAL_REPORT',url:src.url,checkedAt:new Date().toISOString(),
     reportUpdatedAt:null,disclosure:'As published when checked. Resort update time is not verified; this is current-page status, not guaranteed weekend operations.'};
 }catch{return {status:'UNVERIFIED',url:src.url,reason:'SOURCE_UNAVAILABLE'};}
 finally{clearTimeout(timer);}
}
module.exports={SOURCES,parse,fetchOfficial};
