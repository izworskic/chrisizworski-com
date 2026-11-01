'use strict';
// Source: US Census TIGERweb 2020 Census ZCTA feature layer (not USPS ZIP delivery boundaries).
const BASE='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1';
function validMichiganZip(value){
 return typeof value==='string'&&/^(?:48|49)[0-9]{3}$/.test(value);
}
function urlForZip(zip){
 if(!validMichiganZip(zip))return null;
 const u=new URL(BASE+'/query');
 u.searchParams.set('where',"ZCTA5='"+zip+"'");
 u.searchParams.set('outFields','ZCTA5,INTPTLAT,INTPTLON');
 u.searchParams.set('returnGeometry','false');
 u.searchParams.set('f','json');
 return u.href;
}
function parseZipResponse(zip,data){
 if(!validMichiganZip(zip)||!data||data.error||!Array.isArray(data.features))return null;
 const matches=data.features.filter(row=>row&&row.attributes&&String(row.attributes.ZCTA5)===zip);
 if(matches.length!==1)return null;
 const a=matches[0].attributes;
 const lat=Number(a.INTPTLAT),lon=Number(a.INTPTLON);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41.5||lat>48.6||lon< -90.6||lon> -82)return null;
 // Interior point, not USPS geocoding, an address, or a promise of a property's weather.
 return {id:'zip:'+zip,name:'ZIP '+zip+' area',kind:'zcta-interior-point',zip,region:'Michigan',
   lat,lon,tz:'America/Detroit',coordinateSource:'U.S. Census Bureau TIGERweb',
   geography:'2020 Census ZIP Code Tabulation Area (ZCTA)',
   coordinateMeaning:'Representative interior point for a statistical ZIP-like area, not a street address or your garden',
   geographyUrl:BASE};
}
async function resolveZip(zip,fetcher=fetch){
 const url=urlForZip(zip);if(!url)throw Object.assign(new Error('INVALID_MICHIGAN_ZIP'),{statusCode:400});
 let r;
 try{
  r=await fetcher(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiLeafcutter/1.1 (https://chrisizworski.com/leafcutter-bees/)'},redirect:'error',signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('CENSUS_HTTP_'+r.status);
 }catch(error){throw Object.assign(new Error('CENSUS_LOOKUP_UNAVAILABLE'),{statusCode:503,cause:error});}
 let payload;
 try{payload=await r.json();}catch(error){throw Object.assign(new Error('CENSUS_BAD_RESPONSE'),{statusCode:503,cause:error});}
 if(payload&&payload.error)throw Object.assign(new Error('CENSUS_BAD_RESPONSE'),{statusCode:503});
 const site=parseZipResponse(zip,payload);
 if(!site)throw Object.assign(new Error('ZIP_NOT_MAPPED_TO_ZCTA'),{statusCode:404});
 return site;
}
module.exports={BASE,validMichiganZip,urlForZip,parseZipResponse,resolveZip};
