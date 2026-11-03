'use strict';
// Opportunistic photo-record evidence. NOT a pest-emergence forecast, systematic
// monitoring network, adult-flight proof, garden-level diagnosis or negative survey.
// Separate from USA-NPN Japanese beetle model and NWS weather scouting cues.
const INAT='https://api.inaturalist.org/v2/observations';
const SCHEMA='garden-pest-field-observations-v1';
const SPECIES=Object.freeze({
 'squash-vine-borer':Object.freeze({id:'squash-vine-borer',taxonId:1410301,scientificName:'Eichlinia cucurbitae',name:'Squash vine borer',
   crops:['squash'],source:'https://www.inaturalist.org/taxa/1410301'})
});
const RADIUS_KM=25,MAX_ROWS=100,PLACE_ID=29;
const FIELDS='id,observed_on,geojson,quality_grade,taxon.id,taxon.name,uri,geoprivacy,positional_accuracy,photos.id';
function michiganDate(now=new Date()){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const v=Object.fromEntries(p.map(x=>[x.type,x.value]));
 return v.year+'-'+v.month+'-'+v.day;
}
function validDate(d){return typeof d==='string'&&/^20\d\d-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;}
function validYear(year,nowYear){return Number.isInteger(year)&&year>=2025&&year<=nowYear&&year<=2100;}
function validSite(site){return Number.isFinite(site?.lat)&&Number.isFinite(site?.lon)&&site.lat>=41.4&&site.lat<=48.7&&site.lon>=-90.7&&site.lon<=-81.9;}
function buildQuery(site,year,asOf,species='squash-vine-borer'){
 const target=SPECIES[species];
 if(!target||!validSite(site)||!validDate(asOf)||!validYear(year,Number(asOf.slice(0,4))))throw Error('INVALID_RECORD_SCOPE');
 const upper=year===Number(asOf.slice(0,4))?asOf:year+'-12-31';
 const url=new URL(INAT);
 for(const [k,v] of Object.entries({taxon_id:target.taxonId,place_id:PLACE_ID,lat:site.lat.toFixed(4),lng:site.lon.toFixed(4),radius:RADIUS_KM,
   quality_grade:'research',photos:'true',captive:'false',d1:year+'-01-01',d2:upper,order:'asc',
   order_by:'observed_on',per_page:MAX_ROWS,page:1,fields:FIELDS}))url.searchParams.set(k,String(v));
 return url.href;
}
function distanceKm(a,b,c,d){
 const r=Math.PI/180,dy=(c-a)*r,dx=(d-b)*r;
 const h=Math.sin(dy/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dx/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
}
function parse(body,{site,year,asOf,species='squash-vine-borer'}){
 const target=SPECIES[species];
 if(!target||!validSite(site)||!validYear(year,Number(asOf?.slice(0,4)))||!validDate(asOf))throw Error('INVALID_RECORD_SCOPE');
 if(!body||!Number.isInteger(body.total_results)||body.total_results<0||!Array.isArray(body.results)||
   body.results.length>MAX_ROWS||!Number.isInteger(body.page)||body.page!==1||body.per_page!==MAX_ROWS||
   body.total_results<body.results.length)throw Error('MALFORMED_INAT_RESPONSE');
 const records=[],seen=new Set();
 for(const o of body.results){
   if(!o||!Number.isSafeInteger(o.id)||o.id<1||seen.has(o.id))continue;
   if(o.quality_grade!=='research'||o.taxon?.id!==target.taxonId||o.taxon?.name!==target.scientificName||
      !validDate(o.observed_on)||!o.observed_on.startsWith(String(year))||o.observed_on>asOf||
      !Array.isArray(o.photos)||o.photos.length===0)continue;
   // Never interpret obscured/private/unknown or inaccurate coordinates as
   // point-verified. Do not return record coordinates, usernames or photos.
   if(o.geoprivacy&&o.geoprivacy!=='open')continue;
   if(!Number.isFinite(o.positional_accuracy)||o.positional_accuracy<0||o.positional_accuracy>5000)continue;
   const xy=o.geojson?.coordinates;
   if(!Array.isArray(xy)||xy.length!==2||!Number.isFinite(xy[0])||!Number.isFinite(xy[1]))continue;
   const dist=distanceKm(site.lat,site.lon,xy[1],xy[0]);
   if(dist>RADIUS_KM||o.uri!=='https://www.inaturalist.org/observations/'+o.id)continue;
   seen.add(o.id);
   records.push({id:o.id,date:o.observed_on,url:o.uri});
 }
 records.sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);
 return {
   status:records.length?'DOCUMENTED_SPECIES_PHOTO':'NO_QUALIFYING_RECORDS_IN_SAMPLE',
   sourceResults:body.total_results,inspectedResults:body.results.length,limitedSearch:body.total_results>body.results.length,
   qualifyingRecords:records.length,firstSampledDate:records[0]?.date||null,
   examples:records.slice(0,4).map(r=>({date:r.date,url:r.url})),
   explanation:records.length?'At least one research-grade species photo was recorded within the surrounding 25 km search area by the displayed date. It is not a verified adult flight, first arrival, garden infestation, population count or treatment trigger.':
      'No eligible public species photo was found among the inspected records. No-record does not mean the insect is absent.',
   sampleNote:body.total_results>body.results.length?
     'Only the earliest '+MAX_ROWS+' provider results were inspected. This bounded, filtered sample is not exhaustive.':
     'Photo uploads are voluntary and uneven across locations and dates; the search is not a standardized survey.'
 };
}
async function fetchRecords(site,year,{species='squash-vine-borer',fetcher=fetch,now=new Date()}={}){
 const asOf=michiganDate(now),target=SPECIES[species],url=buildQuery(site,year,asOf,species);
 const result=await fetcher(url,{headers:{accept:'application/json','user-agent':'GardenPestWatch/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(7500)});
 if(!result?.ok)throw Error('INAT_SOURCE_UNAVAILABLE');
 const parsed=parse(await result.json(),{site,year,asOf,species});
 return {schema:SCHEMA,species,year,checkedAt:now.toISOString(),status:parsed.status,
  sourceKind:'OPPORTUNISTIC_SPECIES_PHOTOGRAPH',lifeStage:'NOT_INDEPENDENTLY_VERIFIED',
  location:{name:site.name||'Michigan reference area',searchRadiusKm:RADIUS_KM,scope:'Reference city or ZCTA interior point, not your garden'},
  seasonContext:year<Number(asOf.slice(0,4))||Number(asOf.slice(5,7))>=11||Number(asOf.slice(5,7))<=2?
    'PAST_OR_DORMANT_SEASON_RECORDS':'CURRENT_YEAR_RECORDS_NOT_A_FORECAST',
  source:{name:'iNaturalist community research-grade species photographs',taxonId:target.taxonId,scientificName:target.scientificName,
    taxonUrl:target.source,observationSearchUrl:'https://www.inaturalist.org/observations?place_id=29&taxon_id='+target.taxonId,
    notice:'Only source record links and dates are displayed. Photographs and exact observation coordinates are not copied.'},
  records:parsed,
  proofRule:'Community research grade supports a species-level ID, not independent adult-stage proof or a calibrated detection network. No photos is not no pest; do not derive local outbreak, egg-laying, timing model accuracy or pesticide timing.'};
}
module.exports={INAT,SCHEMA,SPECIES,RADIUS_KM,MAX_ROWS,PLACE_ID,FIELDS,michiganDate,validDate,validYear,validSite,buildQuery,distanceKm,parse,fetchRecords};
