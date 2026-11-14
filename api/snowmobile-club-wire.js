'use strict';
// GET /api/snowmobile-club-wire?region=<one of six verified regions>
// Fixed, audited source list only. This feed is separate from scoring and
// from the Michigan DNR legal-closure authority.
const {SOURCES,MAX_REPORT_BYTES,parseReport,reportUnavailable,seasonActive}=require('../lib/snowmobile/club-wire.cjs');
const cache=new Map(),TTL=30*60*1000;
function send(res,status,body){
  res.status(status);
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control',status===200?'public, s-maxage=1800, stale-while-revalidate=600':'no-store');
  return res.json(body);
}
async function fetchReport(source,now){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
  try{
    const res=await fetch(source.url,{signal:ctrl.signal,headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'ChrisIzworski-Snowmobile-Source-Desk/1.0'}});
    if(!res.ok)throw Error('Source HTTP status '+res.status);
    const len=Number(res.headers?.get?.('content-length'));
    if(Number.isFinite(len)&&len>MAX_REPORT_BYTES)throw Error('Source document exceeds size limit');
    const body=await res.text();
    return parseReport(body,source,now);
  }catch(e){
    return reportUnavailable(source,'Source fetch or report-date verification failed');
  }finally{clearTimeout(timer);}
}
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,405,{error:'Only GET supported'});
  const query=req.query||{},region=Array.isArray(query.region)?'':query.region;
  if(typeof region!=='string'||!Object.prototype.hasOwnProperty.call(SOURCES,region))return send(res,400,{error:'Unknown local club region'});
  const existing=cache.get(region);if(existing&&Date.now()-existing.at<TTL)return send(res,200,existing.body);
  const now=new Date(),reports=await Promise.all(SOURCES[region].map(source=>fetchReport(source,now)));
  const body={region,sourceCheckedAt:now.toISOString(),seasonActive:seasonActive(now),reports,
    reportCoverage:'Local club/operator area only. No region-wide grooming or ride score is inferred.',
    notAuthorizedToRide:true,legalSource:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where',
    authority:'Third-party club and visitor-organization posts. DNR does not control their timeliness or accuracy.',
    sourceUnavailable:reports.every(x=>x.state==='UNAVAILABLE')};
  if(!body.sourceUnavailable)cache.set(region,{at:Date.now(),body});
  return send(res,200,body);
};
module.exports._test={clearCache(){cache.clear();}};
