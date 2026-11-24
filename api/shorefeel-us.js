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
async function lookup(beach,now=new Date()){
  if(!validLocation(beach))return unavailable(beach,'No verified weather reference for this place.');
  try{
    // NOAA is optional and runs concurrently with the official NWS fetch.
    // A NOAA outage may not replace or invent the NWS air answer.
    const waterPromise=nearbyWater(beach,now);
    const p=beach.forecastReference;
    const point=await nws('https://api.weather.gov/points/'+p.lat.toFixed(4)+','+p.lon.toFixed(4));
    if(point?.properties?.type!=='land')return unavailable(beach,'NWS did not identify the nearby reference as a land forecast.');
    const url=officialNwsUrl(point.properties.forecastHourly);
    if(!url)return unavailable(beach,'No validated official NWS hourly forecast endpoint was provided.');
    const hourly=await nws(url);
    return interpret(beach,point,hourly,now,await waterPromise);
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
