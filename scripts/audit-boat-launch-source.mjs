#!/usr/bin/env node
import fs from 'node:fs';

const LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0';
const SUPPLEMENTAL=JSON.parse(fs.readFileSync('data/boat-launch-supplemental.json','utf8'));
const ACCEPTANCE=[
  ['Bay City, MI',43.5945,-83.8889],
  ['Tawas City, MI',44.2695,-83.5147],
  ['Alpena, MI',45.0617,-83.4328],
  ['Mackinaw City, MI',45.7775,-84.7271],
  ['Petoskey, MI',45.3733,-84.9553],
  ['Ludington, MI',43.9553,-86.4526],
  ['Holland, MI',42.7875,-86.1089],
  ['South Haven, MI',42.4031,-86.2736],
  ['Munising, MI',46.4111,-86.6479],
  ['Marquette, MI',46.5436,-87.3954],
  ['Monroe, MI',41.9164,-83.3977],
];

const rad=d=>d*Math.PI/180;
function distanceMiles(a,b,c,d){
  const R=3958.7613;
  const dLat=rad(c-a),dLon=rad(d-b);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function hasCoordinate(a){
  return a.latitude!==null&&a.latitude!==undefined&&String(a.latitude).trim()!==''&&a.longitude!==null&&a.longitude!==undefined&&String(a.longitude).trim()!==''&&Number.isFinite(Number(a.latitude))&&Number.isFinite(Number(a.longitude));
}
function reviewStatus(a){
  const flag=String(a.flag||'').trim();
  if(!flag)return 'source-qualified';
  if(flag==='InProgress')return 'dnr-review-in-progress';
  return 'withhold';
}
function nearby(records,lat,lon,radius=25){
  return records.map(a=>({...a,_mi:distanceMiles(lat,lon,Number(a.latitude),Number(a.longitude))})).filter(a=>a._mi<=radius).sort((a,b)=>a._mi-b._mi);
}

async function fetchJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiBoatLaunchAudit/3.0 (+https://chrisizworski.com/michigan-boat-launches/)'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`HTTP ${r.status} for ${url}`);
  const j=await r.json();
  if(j?.error)throw new Error(j.error.message||'ArcGIS query error');
  return j;
}

function queryUrl(params){return `${LAYER}/query?${new URLSearchParams({...params,f:'json'})}`;}

const fields=[
  'OBJECTID','globalid','facilityid','legacyid','name','waterbody','bas_type','launch_status','greatlakesaccess',
  'referenceonly','flag','flagcomments','gia','ownedby','dnradmin','maintby','latitude','longitude','rampcode_new','nlanes','ntrailerableparking',
  'recpassport','operating_hours','waterwaysprogramconfirmation','qaqc_1_date','qaqc_1_comments','last_edited_date'
].join(',');

const [metadata,total,recordsResponse]=await Promise.all([
  fetchJson(`${LAYER}?f=json`),
  fetchJson(queryUrl({where:'1=1',returnCountOnly:'true'})),
  fetchJson(queryUrl({where:"bas_type='Boating Access Site'",outFields:fields,returnGeometry:'false',resultRecordCount:'2000'})),
]);

const records=(recordsResponse.features||[]).map(f=>f.attributes||{});
const open=records.filter(a=>a.launch_status==='Open');
const openGreatLakes=open.filter(a=>String(a.greatlakesaccess||'').startsWith('Yes')&&String(a.referenceonly||'').toLowerCase()!=='yes'&&hasCoordinate(a)&&a.name);
const sourceQualified=openGreatLakes.filter(a=>reviewStatus(a)==='source-qualified');
const reviewInProgress=openGreatLakes.filter(a=>reviewStatus(a)==='dnr-review-in-progress');
const withheld=openGreatLakes.filter(a=>reviewStatus(a)==='withhold');
const usableDnr=[...sourceQualified,...reviewInProgress];
const municipalSupplemental=SUPPLEMENTAL.filter(a=>a.sourceType==='municipal-supplemental'&&a.verificationStatus==='municipal-source-qualified'&&a.id&&a.name&&a.operator&&a.sourceUrl&&a.coordinateSourceUrl&&hasCoordinate(a));
const sourceBacked=[...usableDnr,...municipalSupplemental];
const accessCounts=new Map();
for(const a of open)accessCounts.set(a.greatlakesaccess??'(null)',(accessCounts.get(a.greatlakesaccess??'(null)')||0)+1);

const nullFacility=usableDnr.filter(a=>!String(a.facilityid||'').trim());
const referenceOnly=open.filter(a=>String(a.referenceonly||'').toLowerCase()==='yes');
const reviewNeeded=open.filter(a=>String(a.flag||'').trim()==='Flag');
const allInProgress=open.filter(a=>String(a.flag||'').trim()==='InProgress');
const gia=usableDnr.filter(a=>String(a.gia||'').toLowerCase()==='yes');

console.log('Michigan boat launch source + coverage audit');
console.log(`DNR layer last edit: ${metadata?.editingInfo?.lastEditDate?new Date(metadata.editingInfo.lastEditDate).toISOString():'unknown'}`);
console.log(`Total DNR layer records: ${total.count}`);
console.log(`DNR Boating Access Site records: ${records.length}`);
console.log(`Open DNR boating-access records: ${open.length}`);
console.log(`Open DNR Great Lakes-access records with usable coordinates: ${openGreatLakes.length}`);
console.log(`Source-qualified DNR Great Lakes records: ${sourceQualified.length}`);
console.log(`DNR review-in-progress Great Lakes records: ${reviewInProgress.length}`);
console.log(`Total usable official DNR Great Lakes records: ${usableDnr.length}`);
console.log(`Source-qualified municipal supplements: ${municipalSupplemental.length}`);
console.log(`Total source-backed Great Lakes launch records: ${sourceBacked.length}`);
console.log(`Withheld DNR Great Lakes records (Review Needed/unknown review state): ${withheld.length}`);
console.log(`Usable DNR records with null/blank facilityid: ${nullFacility.length}`);
console.log(`Open DNR reference-only records: ${referenceOnly.length}`);
console.log(`All open DNR Review Needed records: ${reviewNeeded.length}`);
console.log(`All open DNR Review In Progress records: ${allInProgress.length}`);
console.log(`Usable DNR Grant-In-Aid records: ${gia.length}`);
console.log('\nGreat Lakes access values among open DNR boating sites:');
for(const [k,v] of [...accessCounts.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))console.log(`  ${k}: ${v}`);

if(nullFacility.length){
  console.log('\nExamples where facilityid is blank but stable authoritative IDs exist:');
  for(const a of nullFacility.slice(0,8))console.log(`  ${a.name} | review=${reviewStatus(a)} | OBJECTID=${a.OBJECTID} | globalid=${a.globalid} | ${a.latitude},${a.longitude}`);
}

if(municipalSupplemental.length){
  console.log('\nMunicipal supplemental records admitted by the source contract:');
  for(const a of municipalSupplemental)console.log(`  ${a.name} | operator=${a.operator} | ${a.latitude},${a.longitude} | source=${a.sourceUrl} | coordinate_source=${a.coordinateSourceUrl}`);
}

console.log('\nAcceptance-destination samples (25-mile initial radius):');
let zeroSourceBacked=0;
const coverage=[];
for(const [name,lat,lon] of ACCEPTANCE){
  const qualifiedNearby=nearby(sourceQualified,lat,lon);
  const reviewNearby=nearby(reviewInProgress,lat,lon);
  const municipalNearby=nearby(municipalSupplemental,lat,lon);
  const withheldNearby=nearby(withheld,lat,lon);
  const sourceBackedNearby=[
    ...qualifiedNearby.map(a=>({...a,_tier:'DNR OK'})),
    ...reviewNearby.map(a=>({...a,_tier:'DNR REVIEW'})),
    ...municipalNearby.map(a=>({...a,_tier:'MUNICIPAL'})),
  ].sort((a,b)=>a._mi-b._mi);
  if(!sourceBackedNearby.length)zeroSourceBacked++;
  coverage.push({
    destination:name,
    latitude:lat,
    longitude:lon,
    sourceQualified:qualifiedNearby.length,
    reviewInProgress:reviewNearby.length,
    municipal:municipalNearby.length,
    sourceBacked:sourceBackedNearby.length,
    withheld:withheldNearby.length,
    nearest:sourceBackedNearby.slice(0,8).map(a=>({tier:a._tier,miles:Number(a._mi.toFixed(2)),name:a.name,waterbody:a.waterbody||null,id:a.id||a.facilityid||a.globalid||a.OBJECTID})),
  });
  console.log(`\n${name}: ${qualifiedNearby.length} DNR source-qualified + ${reviewNearby.length} DNR review-in-progress + ${municipalNearby.length} municipal = ${sourceBackedNearby.length} source-backed within 25 mi; ${withheldNearby.length} DNR withheld`);
  for(const a of sourceBackedNearby.slice(0,8))console.log(`  ${a._tier.padEnd(10)} ${a._mi.toFixed(1)} mi | ${a.name} | ${a.waterbody||'waterbody not listed'} | id=${a.id||a.facilityid||a.globalid||a.OBJECTID}`);
  for(const a of withheldNearby.slice(0,5))console.log(`  WITHHELD   ${a._mi.toFixed(1)} mi | ${a.name} | flag=${a.flag||'(blank)'} | comment=${String(a.flagcomments||'(none)').replace(/\s+/g,' ').slice(0,140)} | id=${a.facilityid||a.globalid||a.OBJECTID}`);
}

const falseBayCity=[...records,...SUPPLEMENTAL].filter(a=>String(a.name||'').trim().toLowerCase()==='bay city state park launch');
const report={
  generatedAt:new Date().toISOString(),
  dnrLayerLastEdit:metadata?.editingInfo?.lastEditDate||metadata?.lastEditDate||null,
  counts:{
    totalLayer:total.count,
    boatingAccessSites:records.length,
    open:open.length,
    openGreatLakes:openGreatLakes.length,
    sourceQualified:sourceQualified.length,
    reviewInProgress:reviewInProgress.length,
    usableDnr:usableDnr.length,
    municipalSupplemental:municipalSupplemental.length,
    sourceBacked:sourceBacked.length,
    withheld:withheld.length,
    nullFacilityId: nullFacility.length,
  },
  coverage,
  falseBayCityStateParkRecords:falseBayCity.map(a=>({name:a.name,flag:a.flag||null,referenceonly:a.referenceonly||null,id:a.id||a.facilityid||a.globalid||a.OBJECTID||null})),
  failures:{
    falseBayCityStatePark:falseBayCity.length>0,
    implausibleCounts:total.count<500||records.length<500||open.length<300||openGreatLakes.length<50||sourceQualified.length<20||usableDnr.length<50,
    missingMunicipalSupplement:municipalSupplemental.length===0,
    zeroCoverageDestinations:coverage.filter(x=>x.sourceBacked===0).map(x=>x.destination),
  },
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/boat-launch-source-audit.json',JSON.stringify(report,null,2));
console.log('\nDiagnostic report: artifacts/boat-launch-source-audit.json');

if(report.failures.falseBayCityStatePark)throw new Error(`Known false Bay City State Park Launch appears in raw/source inventory (${report.falseBayCityStateParkRecords.length} record)`);
if(report.failures.implausibleCounts)throw new Error('DNR source audit returned implausibly low inventory counts');
if(report.failures.missingMunicipalSupplement)throw new Error('Expected at least one source-qualified municipal supplement for the documented DNR coverage gap');
if(report.failures.zeroCoverageDestinations.length)throw new Error(`Coverage audit found zero source-backed launches within 25 miles for: ${report.failures.zeroCoverageDestinations.join(', ')}`);
