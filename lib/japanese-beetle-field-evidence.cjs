'use strict';
// Independent observed-presence evidence, NOT systematic emergence monitoring.
// iNaturalist research-grade sightings can show beetles have been present by a
// date; a missing sighting is not a non-detection and cannot validate accuracy.
const INAT='https://api.inaturalist.org/v2/observations';
const TAXON=67760,PLACE=29,RADIUS_KM=25,MAX_ROWS=100;
const FIELDS='id,observed_on,geojson,quality_grade,taxon.id,taxon.name,user.id,uri,geoprivacy,positional_accuracy,photos.id';
const SCHEMA='japanese-beetle-field-evidence-v1';
function validYear(y,nowYear=Number(new Date().getUTCFullYear())){
 return Number.isInteger(y)&&y>=2025&&y<=nowYear&&y<=2100;
}
function validDate(date){return typeof date==='string'&&/^20\d\d-\d\d-\d\d$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
function sourceURL(lat,lon,year,asOf){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41.4||lat>48.7||lon< -90.7||lon> -81.9||!validYear(year,Number(asOf.slice(0,4)))||!validDate(asOf))throw Error('INVALID_EVIDENCE_SCOPE');
 const upper=year===Number(asOf.slice(0,4))?asOf:year+'-12-31';
 const u=new URL(INAT);
 Object.entries({taxon_id:TAXON,place_id:PLACE,lat:lat.toFixed(4),lng:lon.toFixed(4),radius:RADIUS_KM,
  quality_grade:'research',photos:'true',captive:'false',d1:year+'-01-01',d2:upper,
  order:'asc',order_by:'observed_on',per_page:MAX_ROWS,page:1,fields:FIELDS}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 return u.href;
}
function distanceKm(lat1,lon1,lat2,lon2){
 const r=Math.PI/180,dlat=(lat2-lat1)*r,dlon=(lon2-lon1)*r;
 const a=Math.sin(dlat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dlon/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(a)));
}
function parseObservations(body,{lat,lon,year,asOf}){
 if(!body||!Number.isInteger(body.total_results)||body.total_results<0||!Array.isArray(body.results)||body.results.length>MAX_ROWS||!Number.isInteger(body.page)||body.page!==1||body.per_page!==MAX_ROWS)throw Error('INAT_RESPONSE_INVALID');
 const eligible=[];
 for(const o of body.results){
  if(!o||!Number.isSafeInteger(o.id)||o.id<1||o.quality_grade!=='research'||o.taxon?.id!==TAXON||o.taxon?.name!=='Popillia japonica'||!validDate(o.observed_on)||!o.observed_on.startsWith(String(year))||o.observed_on>asOf||!Array.isArray(o.photos)||o.photos.length<1)continue;
  // Obscured, private, coarse or unknown-position records are not compared
  // with a point raster model. No photo content is reused or cached.
  if(o.geoprivacy&&o.geoprivacy!=='open'||!Number.isFinite(o.positional_accuracy)||o.positional_accuracy<0||o.positional_accuracy>5000)continue;
  const c=o.geojson?.coordinates;
  if(!Array.isArray(c)||c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1])||distanceKm(lat,lon,c[1],c[0])>RADIUS_KM)continue;
  if(o.uri!=='https://www.inaturalist.org/observations/'+o.id)continue;
  eligible.push({id:o.id,date:o.observed_on,url:o.uri,distanceKm:Math.round(distanceKm(lat,lon,c[1],c[0])*10)/10,accuracyMeters:o.positional_accuracy,observer:o.user?.id||null});
 }
 eligible.sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
 const seen=new Set(),records=[];
 for(const o of eligible){if(seen.has(o.id))continue;seen.add(o.id);records.push(o)}
 return {status:records.length?'DOCUMENTED_PRESENCE':'NO_QUALIFYING_RECORDS_IN_SAMPLE',sourceResults:body.total_results,
  inspectedResults:body.results.length,limitedSearch:body.total_results>body.results.length,
  qualifyingRecords:records.length,firstObservationDate:records[0]?.date||null,
  // Preserve only direct evidence links and uncertainty, never user identity or personal coordinates.
  examples:records.slice(0,5).map(o=>({date:o.date,url:o.url,distanceKm:o.distanceKm,positionAccuracyMeters:o.accuracyMeters})),
  uniqueObserverCount:new Set(records.map(o=>o.observer).filter(Boolean)).size,
  interpretation:records.length?'Dated research-grade photo records establish at least some adult beetle presence in the surrounding search area by these dates. They do not identify first emergence or abundance.':'No qualifying public record was found in the inspected results. This is NOT a claim that beetles were absent.',
  limitations:body.total_results>body.results.length?'The ordered first '+body.results.length+' source results were inspected; the source had more results. This is a bounded sample, not an exhaustive population or first-emergence survey.':'Source reporting is opportunistic, not an effort-controlled absence/presence study.'};
}
function comparison(observedDate,modelDate){
 if(!validDate(observedDate)||!validDate(modelDate)||observedDate.slice(0,4)!==modelDate.slice(0,4))return {status:'NOT_COMPARABLE',dayOffset:null};
 const offset=Math.round((Date.parse(observedDate+'T12:00:00Z')-Date.parse(modelDate+'T12:00:00Z'))/86400000);
 return {status:offset<0?'SIGHTING_BEFORE_MODEL':offset===0?'SAME_CALENDAR_DAY':'SIGHTING_AFTER_MODEL',dayOffset:offset,
  qualifier:'This is a difference between a modeled cell date and the earliest qualifying voluntary sighting in a 25 km search, NOT forecast error, true first emergence or a measured accuracy statistic.'};
}
async function fetchEvidence(site,year,{fetcher=fetch,now=new Date()}={}){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const dp=Object.fromEntries(date.map(x=>[x.type,x.value])),asOf=dp.year+'-'+dp.month+'-'+dp.day;
 const url=sourceURL(site?.lat,site?.lon,year,asOf);
 const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'GardenPestWatch/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(7500)});
 if(!response.ok)throw Error('INAT_SOURCE_UNAVAILABLE');
 const parsed=parseObservations(await response.json(),{lat:site.lat,lon:site.lon,year,asOf});
 return {schema:SCHEMA,year,checkedAt:now.toISOString(),status:parsed.status,
  location:{name:site.name||'Michigan ZIP area',coordinateMeaning:'Reference coordinate with 25 km search radius; not your property or exact emergence site'},
  searchRadiusKm:RADIUS_KM,source:{name:'iNaturalist research-grade photo observations',url:'https://www.inaturalist.org/',apiUrl:url,species:'Popillia japonica',taxonId:TAXON,
   attribution:'Observation dates and direct record links are from iNaturalist contributors; individual photos are not reused.'},
  observationalEvidence:parsed,modelComparison:'UNAVAILABLE_UNLESS_MATCHED_TO_SAME_YEAR_OFFICIAL_LAYER',
  proofRule:'Positive opportunistic observations can support presence by a reported date; cannot establish absence, population size, true first emergence, egg hatch, model accuracy or an outbreak.'};
}
module.exports={INAT,TAXON,PLACE,RADIUS_KM,MAX_ROWS,FIELDS,SCHEMA,validYear,validDate,sourceURL,distanceKm,parseObservations,comparison,fetchEvidence};
