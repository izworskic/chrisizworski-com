'use strict';
// One local adapter for all Michigan gardening tools. The separate phenology repo
// owns thermal science and authoritative USA-NPN source querying.
const E=require('../lib/leafcutter-release.cjs');
const ZIP=require('../lib/leafcutter-zip.cjs');
const ORIGIN='https://phenology.chrisizworski.com';
async function upstream(site){
 const u=new URL('/api/seasonal-heat',ORIGIN);
 u.searchParams.set('lat',site.lat.toFixed(4));
 u.searchParams.set('lon',site.lon.toFixed(4));
 const r=await fetch(u.href,{headers:{accept:'application/json',
  'user-agent':'ChrisIzworskiMichiganGardenSeasonal/1.0 (https://chrisizworski.com/michigan-gardening/)'},
  redirect:'error',signal:AbortSignal.timeout(14000)});
 if(!r.ok)throw Error('PHENOLOGY_NOT_AVAILABLE');
 const d=await r.json();
 if(!d||d.schema!=='seasonal-heat-v1'||d.provider!=='USA National Phenology Network'
   ||!(d.status==='AVAILABLE'&&Number.isFinite(d.comparison?.anomalyGdd50F)||d.status==='PARTIAL'&&d.comparison===null)
   ||!Number.isFinite(d.totalGdd50F)
   ||!d.asOfDate||!/^\d{4}-\d{2}-\d{2}$/.test(d.asOfDate)
   ||Math.abs(d.location?.latitude-site.lat)>0.0002||Math.abs(d.location?.longitude-site.lon)>0.0002
   ||d.modelNotObservation!==true)throw Error('PHENOLOGY_UNVERIFIED_SCHEMA');
 const age=(Date.now()-Date.parse(d.asOfDate+'T12:00:00-05:00'))/86400000;
 if(!Number.isFinite(age)||age>5||age<0)throw Error('PHENOLOGY_STALE');
 return d;
}
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const zip=req.query?.zip,hasZip=zip!==undefined&&zip!==null&&zip!=='';
 if(hasZip&&!ZIP.validMichiganZip(zip))return res.status(400).json({error:'Enter a five-digit Michigan ZIP beginning 48 or 49.',code:'INVALID_ZIP',status:'UNAVAILABLE'});
 let site=hasZip?null:E.location(req.query?.site||'bay-city');
 if(!hasZip&&!site)return res.status(400).json({error:'Unknown Michigan reference city.',code:'INVALID_CITY',status:'UNAVAILABLE'});
 try{
  if(hasZip)site=await ZIP.resolveZip(zip);
  const d=await upstream(site);
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=1800');
  return res.status(200).json({...d,site:{id:site.id,name:site.name,zip:site.zip||null,kind:site.kind||'named-city',
   coordinateMeaning:site.coordinateMeaning||'City reference coordinate, not your property'},
   consumerScope:'seasonal-context-only'});
 }catch(e){
  res.setHeader('Cache-Control','no-store');
  if(hasZip&&e.statusCode===404)return res.status(404).json({error:'No mapped Census ZIP area. Clear ZIP and choose a city.',code:'ZIP_NOT_MAPPED',status:'UNAVAILABLE'});
  if(hasZip&&e.statusCode===503)return res.status(503).json({error:'ZIP coordinate service unavailable.',code:'CENSUS_UNAVAILABLE',status:'UNAVAILABLE'});
  return res.status(503).json({error:'Official seasonal heat data currently unavailable.',code:'SEASONAL_UNAVAILABLE',status:'UNAVAILABLE',
   scope:'no-seasonal-claim'});
 }
};
module.exports._test={upstream};
