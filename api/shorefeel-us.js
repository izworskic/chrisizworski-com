'use strict';
// NWS-only expansion outside Michigan. No Open-Meteo free API, no location
// inference from the request, no fabricated bathing-water observations.
const {bySlug,validLocation,officialNwsUrl,interpret,unavailable}=require('../lib/shorefeel/us-coast.js');
const {nearbyWater}=require('../lib/shorefeel/nearshore-noaa.js');
const HEADERS={'User-Agent':'ChrisIzworski-ShoreFeel/2.0 (https://chrisizworski.com/great-lakes-beaches/around-the-lakes/)',
  Accept:'application/geo+json, application/json'};
async function nws(url){
  const r=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(4900)});
  if(!r.ok)throw new Error('NWS returned HTTP '+r.status);
  return r.json();
}
// The EPA shoreline line may lie on a marine forecast grid. When this happens,
// check only a few nearby offsets and require NWS itself to classify one as land.
// Each fallback is approximately 1.4 km from the mapped shoreline point.
async function landPointFor(beach){
 const p=beach.forecastReference;
 const pointUrl=q=>'https://api.weather.gov/points/'+q.lat.toFixed(4)+','+q.lon.toFixed(4);
 const choose=(point,reference)=>point?.properties?.type==='land'&&
   officialNwsUrl(point.properties.forecastHourly)?{point,reference}:null;
 const original=await nws(pointUrl(p));
 const found=choose(original,p);
 if(found||!beach.epaId)return found;
 const candidates=[
  {lat:p.lat+.014,lon:p.lon},{lat:p.lat-.014,lon:p.lon},
  {lat:p.lat,lon:p.lon+.020},{lat:p.lat,lon:p.lon-.020}
 ];
 const checked=await Promise.allSettled(candidates.map(q=>nws(pointUrl(q))));
 for(let i=0;i<checked.length;i++){
  const answer=checked[i];
  if(answer.status!=='fulfilled')continue;
  const valid=choose(answer.value,candidates[i]);
  if(valid)return valid;
 }
 return null;
}
async function lookup(beach,now=new Date()){
  if(!validLocation(beach))return unavailable(beach,'No verified weather reference for this place.');
  try{
    // NOAA is optional and runs concurrently with the official NWS fetch.
    // A NOAA outage may not replace or invent the NWS air answer.
    const waterPromise=nearbyWater(beach,now);
    const selected=await landPointFor(beach);
    if(!selected)return unavailable(beach,'NWS could not confirm a land-area forecast sufficiently close to this shoreline.');
    const url=officialNwsUrl(selected.point.properties.forecastHourly);
    if(!url)return unavailable(beach,'No validated official NWS hourly forecast endpoint was provided.');
    const hourly=await nws(url);
    const answer=interpret(beach,selected.point,hourly,now,await waterPromise);
    if(beach.epaId&&answer.status==='forecast-based'){
      answer.reference={...selected.reference};
      answer.epaRecord={beachId:beach.epaId,inventoryYear:2025};
      answer.scope+=' The NWS land forecast was checked at a point within about 2 km of the EPA shoreline reference; this is not measured air on the sand.';
    }
    return answer;
  }catch{return unavailable(beach,'The National Weather Service forecast could not be retrieved.');}
}
async function handler(req,res){
  // Data JSON endpoints must never be indexed as public landing pages.
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const raw=req?.query?.beach;
  if(typeof raw!=='string'||!bySlug.has(raw)){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'Choose a beach from the curated Great Lakes list.'});
  }
  const beach=bySlug.get(raw);
  const answer=await lookup(beach);
  res.setHeader('Cache-Control',answer.status==='forecast-based'
    ?'public, max-age=0, s-maxage=600, stale-while-revalidate=180':'no-store');
  return res.status(200).json({...answer,
    safetyAuthority:beach.safety.name,safetyUrl:beach.safety.url,
    officialParkUrl:beach.parkUrl,
    advisoryState:'not-integrated',
    advisoryExplanation:'Open the named official beach authority for the current sample, flags and closures. ShoreFeel has not checked those records.'
  });
}
module.exports=handler;
module.exports.lookup=lookup;
module.exports.nws=nws;
module.exports.landPointFor=landPointFor;
