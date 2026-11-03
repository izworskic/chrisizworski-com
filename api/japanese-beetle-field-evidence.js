'use strict';
// Dated, georeferenced adult records near a Michigan reference coordinate.
// Entirely separate from USA-NPN model output and historical Daymet data.
const EVIDENCE=require('../lib/japanese-beetle-field-evidence.cjs');
const ZIP=require('../lib/leafcutter-zip.cjs');
const RELEASE=require('../lib/leafcutter-release.cjs');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const currentYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric'}).format(new Date()));
 const year=req.query?.year===undefined?currentYear:Number(req.query?.year);
 if(typeof req.query?.year==='object'||!EVIDENCE.validYear(year,currentYear)){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({schema:EVIDENCE.SCHEMA,status:'UNAVAILABLE',code:'INVALID_EVIDENCE_YEAR',
   note:'Available seasons begin in 2025; a future year or invalid year is not a verified sighting record.'});
 }
 const rawZip=req.query?.zip,hasZip=rawZip!==undefined&&rawZip!==null&&rawZip!=='';
 if(hasZip&&!ZIP.validMichiganZip(rawZip))return res.status(400).json({status:'UNAVAILABLE',code:'INVALID_MICHIGAN_ZIP'});
 const city=typeof req.query?.site==='string'?req.query.site:'bay-city';
 let site=hasZip?null:RELEASE.location(city);
 if(!site&&!hasZip)return res.status(400).json({status:'UNAVAILABLE',code:'UNKNOWN_MICHIGAN_REFERENCE'});
 try{if(hasZip)site=await ZIP.resolveZip(rawZip);}
 catch(error){res.setHeader('Cache-Control','no-store');return res.status(error.statusCode===404?404:503).json({status:'UNAVAILABLE',code:'ZIP_GEOGRAPHY_NOT_VERIFIED'});}
 try{
  const data=await EVIDENCE.fetchEvidence(site,year);
  // Immutable past seasons are still subject to later uploads, reidentifications
  // and positional-privacy changes. Cache bounded data; do not persist records.
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=300');
  return res.status(200).json(data);
 }catch(_error){
  res.setHeader('Cache-Control','public, s-maxage=120');
  return res.status(503).json({schema:EVIDENCE.SCHEMA,status:'UNAVAILABLE',code:'OBSERVATION_SOURCE_NOT_VERIFIED',
   note:'iNaturalist observation coverage could not be verified. A failed source check cannot be shown as zero sightings or zero pests.',
   sourceUrl:'https://www.inaturalist.org/observations?taxon_id=67760&place_id=29'});
 }
};
