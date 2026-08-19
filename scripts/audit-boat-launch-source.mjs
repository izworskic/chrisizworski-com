#!/usr/bin/env node

const LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0';
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

async function fetchJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiBoatLaunchAudit/3.0 (+https://chrisizworski.com/michigan-boat-launches/)'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`HTTP ${r.status} for ${url}`);
  const j=await r.json();
  if(j?.error)throw new Error(j.error.message||'ArcGIS query error');
  return j;
}

function queryUrl(params){
  return `${LAYER}/query?${new URLSearchParams({...params,f:'json'})}`;
}

const fields=[
  'OBJECTID','globalid','facilityid','legacyid','name','waterbody','bas_type','launch_status','greatlakesaccess',
  'referenceonly','flag','gia','ownedby','dnradmin','latitude','longitude','rampcode_new','nlanes','ntrailerableparking',
  'recpassport','operating_hours','waterwaysprogramconfirmation','last_edited_date'
].join(',');

const [metadata,total,recordsResponse]=await Promise.all([
  fetchJson(`${LAYER}?f=json`),
  fetchJson(queryUrl({where:'1=1',returnCountOnly:'true'})),
  fetchJson(queryUrl({where:"bas_type='Boating Access Site'",outFields:fields,returnGeometry:'false',resultRecordCount:'2000'})),
]);

const records=(recordsResponse.features||[]).map(f=>f.attributes||{});
const open=records.filter(a=>a.launch_status==='Open');
const accessCounts=new Map();
for(const a of open)accessCounts.set(a.greatlakesaccess??'(null)',(accessCounts.get(a.greatlakesaccess??'(null)')||0)+1);

const eligible=open.filter(a=>
  String(a.greatlakesaccess||'').startsWith('Yes') &&
  String(a.referenceonly||'').toLowerCase()!=='yes' &&
  !String(a.flag||'').trim() &&
  Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude)) &&
  a.name
);
const nullFacility=eligible.filter(a=>!String(a.facilityid||'').trim());
const referenceOnly=open.filter(a=>String(a.referenceonly||'').toLowerCase()==='yes');
const flagged=open.filter(a=>String(a.flag||'').trim()==='Flag');
const inProgress=open.filter(a=>String(a.flag||'').trim()==='InProgress');
const gia=eligible.filter(a=>String(a.gia||'').toLowerCase()==='yes');
const nonDnr=eligible.filter(a=>!String(a.ownedby||'').startsWith('DNR')||!String(a.dnradmin||'').toLowerCase().includes('dnr'));

console.log('Michigan DNR boat launch source audit');
console.log(`Layer last edit: ${metadata?.editingInfo?.lastEditDate?new Date(metadata.editingInfo.lastEditDate).toISOString():'unknown'}`);
console.log(`Total layer records: ${total.count}`);
console.log(`Boating Access Site records: ${records.length}`);
console.log(`Open boating-access records: ${open.length}`);
console.log(`Source-qualified open Great Lakes-access records: ${eligible.length}`);
console.log(`Eligible records with null/blank facilityid: ${nullFacility.length}`);
console.log(`Open reference-only records: ${referenceOnly.length}`);
console.log(`Open flag=Flag records: ${flagged.length}`);
console.log(`Open flag=InProgress records: ${inProgress.length}`);
console.log(`Eligible Grant-In-Aid records: ${gia.length}`);
console.log(`Eligible records with non-DNR ownership/admin signal: ${nonDnr.length}`);
console.log('\nGreat Lakes access values among open boating sites:');
for(const [k,v] of [...accessCounts.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))console.log(`  ${k}: ${v}`);

if(nullFacility.length){
  console.log('\nExamples where facilityid is blank but stable authoritative IDs exist:');
  for(const a of nullFacility.slice(0,8))console.log(`  ${a.name} | OBJECTID=${a.OBJECTID} | globalid=${a.globalid} | ${a.latitude},${a.longitude}`);
}

console.log('\nAcceptance-destination samples (source-qualified launches within 25 mi):');
let zero=0;
for(const [name,lat,lon] of ACCEPTANCE){
  const nearby=eligible.map(a=>({...a,_mi:distanceMiles(lat,lon,Number(a.latitude),Number(a.longitude))})).filter(a=>a._mi<=25).sort((a,b)=>a._mi-b._mi);
  if(!nearby.length)zero++;
  console.log(`\n${name}: ${nearby.length} within 25 mi`);
  for(const a of nearby.slice(0,5))console.log(`  ${a._mi.toFixed(1)} mi | ${a.name} | ${a.waterbody||'waterbody not listed'} | id=${a.facilityid||a.globalid||a.OBJECTID}`);
}

if(total.count<500||records.length<500||open.length<300||eligible.length<20)throw new Error('DNR source audit returned implausibly low inventory counts');
if(zero>4)throw new Error(`DNR source audit found ${zero} acceptance destinations with zero qualifying launches within 25 mi; inspect source model before shipping`);
