'use strict';
/** NASA Wallops independent official-source pulse.
 * Runs with Vercel CDN caching, never asks the browser to scrape NASA.
 * Never joins NASA's page text to a particular LL2 mission without a
 * confirmed mission identifier; never infers a launch, a gate opening,
 * parking capacity or a webcast from the absence of an announcement.
 */
const SCHEDULE='https://www.nasa.gov/wallops-launch-schedule/';
const RANGE='https://www.nasa.gov/blogs/wallops-range/';
const MAX_SIZE=400000;
function safeText(html) {
 return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/\s+/g,' ').slice(0,MAX_SIZE);
}
function analyzeSchedule(html) {
 const text=safeText(html);
 if(!text.trim()||!(/Wallops/i.test(text)))return {status:'unverified',summary:'NASA source content could not be interpreted. Check NASA directly.'};
 if(/No public launches on the schedule at this time/i.test(text))
  return {status:'no-public-listed',summary:'NASA’s public Wallops schedule currently states that no public launches are listed. This does not rule out non-NASA range operations or upcoming short-notice missions.'};
 // A previous mission may appear on the page; do NOT treat any other date or
 // "Visitor Center Open" string as a current next launch/permission.
 return {status:'source-checked',summary:'NASA’s public schedule was retrieved, but this tool has not matched an announced future public launch. Read the original NASA page for its current entries.'};
}
async function fetchOfficial(url) {
 const response=await fetch(url,{redirect:'follow',headers:{Accept:'text/html',
   'User-Agent':'ChrisIzworskiWallopsGuide/1.0 (+https://chrisizworski.com/)'},
   signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('NASA source unavailable');
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>MAX_SIZE)throw Error('NASA page exceeds bounded fetch limit');
 const html=await response.text();
 if(html.length>MAX_SIZE)throw Error('NASA page exceeds bounded fetch limit');
 return html;
}
function handler(req,res) {
 if(req.method && req.method!=='GET'){
  res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});
 }
 res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 return Promise.allSettled([fetchOfficial(SCHEDULE),fetchOfficial(RANGE)]).then(results=>{
  const checkedAt=new Date().toISOString();
  const schedule=results[0].status==='fulfilled'?analyzeSchedule(results[0].value):
   {status:'unavailable',summary:'NASA public launch schedule could not be retrieved. No opening, date or empty schedule can be assumed.'};
  const range=results[1].status==='fulfilled'&&/Wallops/i.test(safeText(results[1].value))?
   {status:'source-checked',summary:'NASA Range Blog retrieved. Its operational notices are separate from the public launch calendar; they are not automatically open-to-public events.'}:
   {status:'unavailable',summary:'NASA Range Blog could not be checked. A blank national schedule does not mean the range is inactive.'};
  return res.status(200).json({ok:true,checkedAt,schedule:{...schedule,url:SCHEDULE,
   checkedAt:results[0].status==='fulfilled'?checkedAt:null},
   range:{...range,url:RANGE,checkedAt:range.status==='source-checked'?checkedAt:null},
   visitorCenterEventOpening:'unverified',
   youtubeLivestream:'unverified',
   disclosure:'NASA public calendar and range operations are different sources. No NASA visit, launch opening, parking capacity, precise window or webcast is confirmed for the selected launch by this generic check.'});
 }).catch(()=>res.status(200).json({ok:true,checkedAt:new Date().toISOString(),
  schedule:{url:SCHEDULE,status:'unavailable',checkedAt:null},
  range:{url:RANGE,status:'unavailable',checkedAt:null},visitorCenterEventOpening:'unverified',
  youtubeLivestream:'unverified'}));
}
module.exports=handler;
module.exports._test={analyzeSchedule,safeText};
