'use strict';
const {bySlug,bboxUrl,interpret,empty}=require('../lib/shorefeel/canada.js');
// ECCC GeoMet's licensed public collection is served by the Government of Canada.
async function retrieve(url){
  if(typeof url!=='string'||!url.startsWith('https://api.weather.gc.ca/collections/citypageweather-realtime/items?bbox='))
    throw new Error('ECCC source URL not allowlisted');
  const response=await fetch(url,{signal:AbortSignal.timeout(6500),
    headers:{Accept:'application/geo+json, application/json',
      'User-Agent':'ChrisIzworski-ShoreFeel-Canada/1.0 (https://chrisizworski.com/great-lakes-beaches/canada/)'}});
  if(!response.ok)throw new Error('ECCC API source unavailable');
  const data=await response.json();
  if(!Array.isArray(data?.features)||data.features.length>12)throw new Error('Unexpected ECCC source shape');
  return data;
}
async function lookup(beach,now=new Date()){
  const url=bboxUrl(beach);
  if(!url)return empty(beach,'This location has no approved ECCC source reference.');
  try{return interpret(beach,await retrieve(url),now);}
  catch{return empty(beach,'Environment Canada hourly forecasts could not be retrieved.');}
}
async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const slug=req?.query?.beach;
  if(typeof slug!=='string'||!bySlug.has(slug)){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'Choose an Ontario beach from the verified catalog.'});
  }
  const beach=bySlug.get(slug),answer=await lookup(beach);
  res.setHeader('Cache-Control',answer.status==='forecast-based'
    ?'public, max-age=0, s-maxage=600, stale-while-revalidate=180':'no-store');
  return res.status(200).json({...answer,officialParkUrl:beach.officialUrl,
    officialAdvisoryUrl:beach.advisory.url,advisoryAuthority:beach.advisory.authority,
    advisoryStatus:'not-integrated',
    attribution:'Contains information licensed under the Data Server End-use Licence of Environment and Climate Change Canada.',
    licenceUrl:'https://eccc-msc.github.io/open-data/licence/readme_en/'});
}
module.exports=handler;
module.exports.lookup=lookup;
module.exports.retrieve=retrieve;
