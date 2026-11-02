'use strict';
// GET /api/japanese-beetle-forecast?crop=roses&zip=48706
// Official species-specific USA-NPN point data, never generic Jan-1 DD50.
const forecast=require('../lib/japanese-beetle-forecast.cjs');
const ZIP=require('../lib/leafcutter-zip.cjs');
const RELEASE=require('../lib/leafcutter-release.cjs');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const crop=typeof req.query?.crop==='string'?req.query.crop:'roses';
 if(!forecast.HOSTS.includes(crop)){
  res.setHeader('Cache-Control','public, s-maxage=300');
  return res.status(200).json({schema:'japanese-beetle-forecast-truth-v1',status:'NOT_APPLICABLE',
   crop,hostCrops:forecast.HOSTS,
   note:'The Japanese beetle pilot covers roses, grapes, beans and berries. Select one of those crops; unrelated crops retain their own scouting guidance.'});
 }
 const rawZip=req.query?.zip,hasZip=rawZip!==undefined&&rawZip!==null&&rawZip!=='';
 if(hasZip&&!ZIP.validMichiganZip(rawZip)){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({status:'UNAVAILABLE',code:'INVALID_ZIP',note:'Choose a Michigan ZIP area (48xxx or 49xxx).'});
 }
 const city=typeof req.query?.site==='string'?req.query.site:'bay-city';
 let site=hasZip?null:RELEASE.location(city);
 if(!site&&!hasZip)return res.status(400).json({status:'UNAVAILABLE',code:'UNKNOWN_CITY'});
 try{if(hasZip)site=await ZIP.resolveZip(rawZip);}
 catch(error){
  res.setHeader('Cache-Control','no-store');
  return res.status(error.statusCode===404?404:503).json({schema:'japanese-beetle-forecast-truth-v1',status:'UNAVAILABLE',
   code:error.statusCode===404?'ZIP_NOT_MAPPED':'CENSUS_ZIP_UNAVAILABLE',
   note:'ZIP geography could not be verified. No other location or previous model pixel was substituted.'});
 }
 try{
  const data=await forecast.fetchPilot(site,crop);
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=300');
  return res.status(200).json(data);
 }catch(error){
  // Forecast errors are scientific unknowns, NEVER no-pest or low-risk.
  res.setHeader('Cache-Control','public, s-maxage=120');
  return res.status(503).json({schema:'japanese-beetle-forecast-truth-v1',status:'UNAVAILABLE',
   code:'OFFICIAL_MODEL_NOT_VERIFIED',modelSource:forecast.SOURCE,
   note:'Current-year official Japanese beetle adult and egg model pixels or exact source dates were not verified for the chosen reference location. No timing date or low-risk status can be inferred.',
   scientificFallback:'Continue crop and stage scouting; the historical Daymet laboratory is research only, not a substitute live forecast.'});
 }
};
