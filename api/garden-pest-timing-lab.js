'use strict';
// Separate, opt-in research endpoint. It never supplies operational emergence
// forecasts to the Garden Pest Watch decision engine.
const ZIP=require('../lib/leafcutter-zip.cjs');
const RELEASE=require('../lib/leafcutter-release.cjs');
const SCIENCE=require('../lib/garden-pest-science.cjs');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const rawZip=req.query?.zip;
 const hasZip=rawZip!==undefined&&rawZip!==null&&rawZip!=='';
 if(hasZip&&!ZIP.validMichiganZip(rawZip))return res.status(400).json({status:'UNAVAILABLE',code:'INVALID_ZIP'});
 const siteId=typeof req.query?.site==='string'?req.query.site:'bay-city';
 let site=hasZip?null:RELEASE.location(siteId);
 if(!hasZip&&!site)return res.status(400).json({status:'UNAVAILABLE',code:'INVALID_REFERENCE_CITY'});
 try{if(hasZip)site=await ZIP.resolveZip(rawZip);}
 catch(err){res.setHeader('Cache-Control','no-store');return res.status(err.statusCode===404?404:503).json({status:'UNAVAILABLE',code:err.statusCode===404?'ZIP_NOT_MAPPED':'CENSUS_REFERENCE_UNAVAILABLE'});}
 try{
  const result=await SCIENCE.fetchHistorical(site.lat,site.lon);
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).json({...result,location:{name:site.name,kind:site.kind||'named-city',zip:site.zip||null,
   coordinateMeaning:site.coordinateMeaning||'Representative city location, not your garden address',
   lat:Math.round(site.lat*10000)/10000,lon:Math.round(site.lon*10000)/10000},
   publishedUse:'HISTORIC_RESEARCH_ONLY',
   evidenceStatus:'HISTORICAL_WEATHER_RECONSTRUCTION',
   pestPresence:'UNVERIFIED',realTimeForecast:'UNAVAILABLE',treatmentAdvice:'NOT_AUTHORIZED'});
 }catch(err){
  res.setHeader('Cache-Control','public, s-maxage=120');
  return res.status(503).json({schema:'garden-pest-historical-lab-v1',status:'UNAVAILABLE',
   code:'HISTORICAL_SERIES_NOT_VERIFIED',note:'NASA Daymet historical records could not be verified as a complete five-year record. No model range or reference timing is shown.',
   scientificSource:SCIENCE.DAYMET_SOURCE,modelSource:SCIENCE.MODEL.sourceUrl});
 }
};
