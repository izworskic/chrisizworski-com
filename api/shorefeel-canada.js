'use strict';
// Canadian Great Lakes weather from official ECCC experimental city forecasts.
// Never infer beach-water safety or construct a fetch URL from user input.
const {bySlug,sourceUrl,chooseForecast,unavailable}=require('../lib/shorefeel/canada.js');
async function fetchCityForecast(beach,now=new Date()){
  const url=sourceUrl(beach);
  if(!url)return unavailable(beach,'No verified Canadian park reference.');
  try{
    const res=await fetch(url,{headers:{
      'User-Agent':'ChrisIzworski-ShoreFeel/3.0 (+https://chrisizworski.com/great-lakes-beaches/canada/)',
      Accept:'application/geo+json, application/json'
    },signal:AbortSignal.timeout(5800)});
    if(!res.ok)throw new Error('ECCC returned '+res.status);
    const json=await res.json();
    return chooseForecast(beach,json,now);
  }catch{
    return unavailable(beach,'The official ECCC city forecast could not be verified for this park.');
  }
}
async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const slug=req?.query?.beach;
  if(typeof slug!=='string'||!bySlug.has(slug)){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'Choose a reviewed Ontario shoreline park.'});
  }
  const park=bySlug.get(slug),forecast=await fetchCityForecast(park);
  res.setHeader('Cache-Control',forecast.status==='regional-forecast'
    ?'public, max-age=0, s-maxage=600, stale-while-revalidate=180':'no-store');
  return res.status(200).json({...forecast,
    country:'Canada',province:'Ontario',parkUrl:park.parkUrl,
    officialBeachSamplesUrl:park.waterSafety.url,officialParkAlertsUrl:park.alertsUrl,
    advisoryState:'not-integrated',officialAttribution:'Data Source: Environment and Climate Change Canada'});
}
module.exports=handler;
module.exports.fetchCityForecast=fetchCityForecast;
