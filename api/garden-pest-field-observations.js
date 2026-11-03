'use strict';
// Query-independent iNaturalist research-grade photo evidence. No crop-model
// coupling, user location persistence, garden diagnosis, absence inference or
// dynamic treatment decision.
const FIELD=require('../lib/garden-pest-field-observations.cjs');
const ZIP=require('../lib/leafcutter-zip.cjs');
const RELEASE=require('../lib/leafcutter-release.cjs');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({status:'UNAVAILABLE',code:'GET_ONLY'});}
 const species=req.query?.species===undefined?'squash-vine-borer':req.query.species;
 if(typeof species!=='string'||!Object.prototype.hasOwnProperty.call(FIELD.SPECIES,species)){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'INVALID_SPECIES'});
 }
 const currentYear=Number(FIELD.michiganDate().slice(0,4));
 const year=req.query?.year===undefined?currentYear:Number(req.query.year);
 if(typeof req.query?.year==='object'||!FIELD.validYear(year,currentYear)){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'INVALID_YEAR',note:'Only completed and current calendar years, from 2025 onward, are available.'});
 }
 const raw=req.query?.zip,hasZip=raw!==undefined&&raw!==null&&raw!=='';
 if(hasZip&&!ZIP.validMichiganZip(raw)){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'INVALID_MICHIGAN_ZIP'});
 }
 const city=typeof req.query?.site==='string'?req.query.site:'bay-city';
 let site=hasZip?null:RELEASE.location(city);
 if(!site&&!hasZip)return res.status(400).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'UNKNOWN_REFERENCE_CITY'});
 try{if(hasZip)site=await ZIP.resolveZip(raw);}
 catch(error){
  res.setHeader('Cache-Control','no-store');
  return res.status(error.statusCode===404?404:503).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'ZIP_REFERENCE_NOT_VERIFIED'});
 }
 try{
  const result=await FIELD.fetchRecords(site,year,{species});
  // Edits to community IDs / privacy can occur even for historic photographs.
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=300');
  return res.status(200).json(result);
 }catch(_error){
  res.setHeader('Cache-Control','public, s-maxage=120');
  return res.status(503).json({schema:FIELD.SCHEMA,status:'UNAVAILABLE',code:'FIELD_SOURCE_NOT_VERIFIED',
   note:'No species-photo records could be verified for this reference. An unavailable source is not zero sightings or zero pests.',
   sourceUrl:FIELD.SPECIES[species].source});
 }
};
