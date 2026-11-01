'use strict';
const E=require('../lib/leafcutter-release.cjs');
const Z=require('../lib/leafcutter-zip.cjs');
const NWS='https://api.weather.gov';
const HEADERS={accept:'application/geo+json, application/json','user-agent':'ChrisIzworskiLeafcutterWeather/1.0 (https://chrisizworski.com/leafcutter-bees/)'};
function validHourlyUrl(raw){
 try{const u=new URL(String(raw||''));return u.protocol==='https:'&&u.hostname==='api.weather.gov'
 && /^\/gridpoints\/[A-Za-z]{3}\/\d+,\d+\/forecast\/hourly\/?$/.test(u.pathname)&&!u.search&&!u.hash?u.href:null;}catch{return null;}
}
async function getNws(url){
 const r=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(7500),redirect:'error'});
 if(!r.ok)throw Error('NWS_UNAVAILABLE');
 return r.json();
}
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'GET only'});}
 if(req.query?.mode==='locations'){
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=86400');
  return res.status(200).json({locations:E.LOCATIONS.map(x=>({id:x.id,name:x.name,region:x.region})),scope:'Michigan city forecast reference points; not property observations'});
 }
 const rawZip=req.query?.zip;
 const hasZip=rawZip!==undefined&&rawZip!==null&&rawZip!=='';
 if(hasZip&&!Z.validMichiganZip(rawZip))return res.status(400).json({
  error:'Enter a five-digit Michigan ZIP starting with 48 or 49.',
  code:'INVALID_MICHIGAN_ZIP',scope:'no-weather-claim'
 });
 let site=hasZip?null:E.location(req.query?.site||'bay-city');
 if(!hasZip&&!site)return res.status(400).json({error:'Choose a supported Michigan location.',code:'UNKNOWN_CITY'});
 try{
  if(hasZip)site=await Z.resolveZip(rawZip);
  const point=await getNws(NWS+'/points/'+site.lat.toFixed(4)+','+site.lon.toFixed(4));
  const url=validHourlyUrl(point?.properties?.forecastHourly);
  if(!url)throw Error('INVALID_NWS_FORECAST_SOURCE');
  const forecast=await getNws(url);
  const p=forecast?.properties||{};
  const issuedAt=p.generatedAt||p.updateTime||p.updated||null;
  const timeZone=String(p.timeZone||point?.properties?.timeZone||site.tz||'America/Detroit');
  if(!['America/Detroit','America/Chicago','America/New_York','US/Eastern','US/Central'].includes(timeZone))throw Error('INVALID_NWS_TIMEZONE');
  const summary=E.reducePeriods(p.periods,issuedAt,new Date(),timeZone);
  if(!summary.daily.length)throw Error('NO_USABLE_FORECAST');
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=300');
  return res.status(200).json({scope:'forecast-planning-only',provider:'National Weather Service',
    sourceUrl:url,issuedAt:summary.issuedAt,checkedAt:new Date().toISOString(),
    site:{id:site.id,name:site.name,region:site.region,latitude:site.lat,longitude:site.lon,
      kind:site.kind||'named-city',zip:site.zip||null,
      coordinateSource:site.coordinateSource||(site.kind?'':'Named city reference point from site location catalogue'),
      coordinateMeaning:site.coordinateMeaning||'Named city forecast reference coordinate, not a property measurement',
      geography:site.geography||null,geographyUrl:site.geographyUrl||null},
    ...summary,forecastOnly:true,bloomStatus:'UNVERIFIED',nestStatus:'UNVERIFIED',
    caveats:['Forecast highs are modeled daytime conditions, not observed bee flight or currently open flowers.',
    'Two warm forecast days are an operational weather signal, not a validated species-specific release cutoff.',
    'Commercially incubated cocoons require species- and supplier-specific timing and cannot be returned to dormancy.',
    'A ZIP-area interior point or named city reference may differ materially from your lakeshore garden.',
    'Census ZCTAs are statistical approximations of USPS ZIPs, not exact mail-delivery areas or property coordinates.']});
 }catch(e){
  res.setHeader('Cache-Control','no-store');
  if(hasZip&&e.statusCode===404)return res.status(404).json({
    error:'The Census Bureau has no mapped ZCTA for that ZIP code. Clear the ZIP and select a reference city instead.',
    code:'ZIP_NOT_MAPPED',scope:'no-weather-claim',zip:rawZip
  });
  if(hasZip&&e.statusCode===503)return res.status(503).json({
    error:'Census ZIP-area location service temporarily unavailable. Clear the ZIP to use a city forecast.',
    code:'CENSUS_UNAVAILABLE',scope:'no-weather-claim'
  });
  return res.status(503).json({error:'Official hourly forecast temporarily unavailable',scope:'no-weather-claim',
    site:site?{id:site.id,name:site.name}:null,
    advice:'Confirm weather locally. Do not treat this outage as a release signal.'});
 }
};
module.exports._test={validHourlyUrl,getNws};
