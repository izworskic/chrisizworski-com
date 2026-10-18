'use strict';
// Diagnostic, not a build gate: upstream NOAA / Michigan DNR availability can vary.
// Reads only public data, prints source status, never private precise observation locations.
const handler=require('../api/waterfowl-freeze-line.js');
const {parseDNR}=require('../lib/waterfowl-snow-surveys.js');
const sourceUrl='https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/shiawassee-river-sga/waterfowl-counts';
function summarizeResponse(body){
 if(!body||body.error)return {error:body?.error||'invalid response'};
 return {
  date:body.generatedAt,region:body.region?.id,
  weather:body.weather?.status,forecastHours:body.weather?.validHours,
  noaaIMS:body.surface?.status,imsFileDate:body.surface?.validAt,
  noaaIceChart:body.lakeIce?.status,
  noaaSnowDepth:body.snowDepth?.status,
  snowDepthInches:body.snowDepth?.approximateDepthInches??null,
  snowRawMeters:body.snowDepth?.rawSnowDepthMeters??null,
  marshLakeOutlook:body.habitatShift?.status,
  dnr:(body.surveys?.sites||[]).map(s=>({site:s.id,status:s.status,duckDate:s.ducks?.date||null,ducks:s.ducks?.count??null,geese:s.geese?.count??null})),
  sightings:body.sightings?.status
 };
}
(async()=>{
 const res={statusCode:200,body:null,setHeader(){return this},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
 await handler({method:'GET',query:{mode:'region',region:'saginaw-bay'}},res);
 process.stdout.write('WATERFOWL_API '+JSON.stringify({httpStatus:res.statusCode,...summarizeResponse(res.body)})+'\n');
 let raw={httpStatus:null,bytes:null,tableElements:null,includesDatedRows:null};
 try{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),11000);
  try{
   const response=await fetch(sourceUrl,{headers:{'User-Agent':'WaterfowlFreezeLineSourceCheck/1.0','Accept':'text/html'},signal:ctl.signal});
   const html=await response.text();
   const parsed=parseDNR(html);
   const first=(html.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)||[])[0]||'';
   const header=(first.match(/<thead\b[^>]*>[\s\S]*?<\/thead>/i)||[])[0]||'';
   raw={httpStatus:response.status,bytes:html.length,tableElements:(html.match(/<table\b/gi)||[]).length,
     includesDatedRows:/Week Ending|Total ducks|(?:09|10|11)\/\d{2}\/2026/i.test(html),
     parsedStatus:parsed.status,duckDate:parsed.ducks?.date||null,duckCount:parsed.ducks?.count??null,
     firstTableHeader:header.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,220),
     tableRowCount:(first.match(/<tr\b/gi)||[]).length};
  }finally{clearTimeout(timer)}
 }catch(e){raw={...raw,error:e.name||'request error'}}
 process.stdout.write('MICHIGAN_DNR_RAW_HTML '+JSON.stringify(raw)+'\n');
 // A missing upstream result is a warning here; source status is carried into UI as unavailable.
})().catch(e=>{console.error('Source probe failed:',e.message);process.exitCode=1});
