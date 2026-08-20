#!/usr/bin/env node
import fs from 'node:fs/promises';

const sites=['04123500','04124000','04124200','04125550','04125460'];
const names=['Manistee River','Pine River','Bear Creek','Little Manistee River'];
const artifact={checkedAt:new Date().toISOString(),status:'fail',checks:{}};

async function getJson(url,label){
  const response=await fetch(url,{headers:{accept:'application/json, application/geo+json','user-agent':'ChrisIzworskiManisteeLiveAudit/1.0'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${label} returned ${response.status}`);
  return response.json();
}

try{
  const usgs=new URL('https://waterservices.usgs.gov/nwis/iv/');
  usgs.searchParams.set('format','json');
  usgs.searchParams.set('sites',sites.join(','));
  usgs.searchParams.set('parameterCd','00010,00060,00065');
  usgs.searchParams.set('siteStatus','all');
  const gaugePayload=await getJson(usgs,'USGS Water Services');
  const returnedSites=new Set((gaugePayload?.value?.timeSeries||[]).flatMap(s=>(s.sourceInfo?.siteCode||[]).map(c=>c.value)).filter(Boolean));
  const missingSites=sites.filter(id=>!returnedSites.has(id));
  artifact.checks.gauges={expected:sites,returned:[...returnedSites].sort(),missing:missingSites};
  if(missingSites.length)throw new Error(`USGS missing configured active sites: ${missingSites.join(', ')}`);

  const nhd=new URL('https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query');
  nhd.searchParams.set('where',names.map(n=>`GNIS_NAME='${n}'`).join(' OR '));
  nhd.searchParams.set('geometry','-86.35,44.02,-84.68,44.95');
  nhd.searchParams.set('geometryType','esriGeometryEnvelope');
  nhd.searchParams.set('inSR','4326');
  nhd.searchParams.set('spatialRel','esriSpatialRelIntersects');
  nhd.searchParams.set('outFields','GNIS_NAME,REACHCODE,FCode');
  nhd.searchParams.set('returnGeometry','true');
  nhd.searchParams.set('outSR','4326');
  nhd.searchParams.set('f','geojson');
  const hydroPayload=await getJson(nhd,'USGS NHD');
  const returnedNames=new Set((hydroPayload?.features||[]).map(f=>f?.properties?.GNIS_NAME).filter(Boolean));
  const missingNames=names.filter(name=>!returnedNames.has(name));
  const invalidGeometry=(hydroPayload?.features||[]).filter(f=>!f.geometry||!['LineString','MultiLineString'].includes(f.geometry.type)).length;
  artifact.checks.hydrography={expected:names,returned:[...returnedNames].sort(),featureCount:hydroPayload?.features?.length||0,missing:missingNames,invalidGeometry};
  if(missingNames.length)throw new Error(`NHD missing configured waterways: ${missingNames.join(', ')}`);
  if(invalidGeometry)throw new Error(`NHD returned ${invalidGeometry} non-line feature(s)`);
  if((hydroPayload?.features?.length||0)<20)throw new Error('NHD flowline count unexpectedly small');

  artifact.status='pass';
  console.log(`Manistee live audit PASS — ${returnedSites.size} USGS sites, ${hydroPayload.features.length} NHD flowline features, ${returnedNames.size} named waterways.`);
}catch(error){
  artifact.error=String(error?.message||error);
  console.error(`Manistee live audit FAIL — ${artifact.error}`);
  process.exitCode=1;
}finally{
  await fs.mkdir('artifacts',{recursive:true});
  await fs.writeFile('artifacts/manistee-live-audit.json',JSON.stringify(artifact,null,2)+'\n');
}
