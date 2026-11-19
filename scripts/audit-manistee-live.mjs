#!/usr/bin/env node
import fs from 'node:fs/promises';
import hydro from '../api/manistee-river-hydrography.js';

const sites=['04123500','04124000','04124200','04125550','04125460'];
const names=['Manistee River','Pine River','Bear Creek','Little Manistee River'];
const artifact={checkedAt:new Date().toISOString(),status:'fail',phase:'starting',checks:{}};

async function getJson(url,label){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{headers:{accept:'application/json, application/geo+json','user-agent':'ChrisIzworskiManisteeLiveAudit/1.0'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }catch(error){
      lastError=error;
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,350));
    }
  }
  throw new Error(`${label} unavailable after two attempts: ${String(lastError?.message||lastError)}`);
}

try{
  const usgs=new URL('https://waterservices.usgs.gov/nwis/iv/');
  usgs.searchParams.set('format','json');
  usgs.searchParams.set('sites',sites.join(','));
  usgs.searchParams.set('parameterCd','00010,00060,00065');
  usgs.searchParams.set('siteStatus','all');
  artifact.phase='USGS Water Services gauges';
  const gaugePayload=await getJson(usgs,'USGS Water Services');
  const returnedSites=new Set((gaugePayload?.value?.timeSeries||[]).flatMap(s=>(s.sourceInfo?.siteCode||[]).map(c=>c.value)).filter(Boolean));
  const missingSites=sites.filter(id=>!returnedSites.has(id));
  artifact.checks.gauges={expected:sites,returned:[...returnedSites].sort(),missing:missingSites};
  if(missingSites.length)throw new Error(`USGS missing configured active sites: ${missingSites.join(', ')}`);

  // Exercise all four actual route-API per-waterway retrievals, rather than
  // starting with an expensive basin-wide query the route visitor does not use.
  // Accept slower live USGS responses in CI; the public function still fails
  // closed on its shorter request budget. Never substitute cached geometry.
  artifact.phase='USGS NHD hydrography';
  const hydroGroups=await Promise.all(names.map(name=>
    hydro.fetchHydrography({name,timeoutMs:11000})
  ));
  for(let i=0;i<hydroGroups.length;i++){
    const group=hydroGroups[i];
    if(group.sourceCompleteness!=='complete-retrieved-set'||
       group.requestedWaterways.length!==1||
       group.requestedWaterways[0]!==names[i]||
       !group.features.length||
       group.features.some(f=>f.properties?.name!==names[i]))
      throw new Error('USGS NHD source-incomplete or wrong river: '+names[i]);
  }
  const hydroPayload={features:hydroGroups.flatMap(group=>group.features),sourceCompleteness:'complete-retrieved-set'};
  const returnedNames=new Set((hydroPayload.features||[]).map(f=>f.properties?.name).filter(Boolean));
  const missingNames=names.filter(name=>!returnedNames.has(name));
  const invalidGeometry=(hydroPayload?.features||[]).filter(f=>!f.geometry||!['LineString','MultiLineString'].includes(f.geometry.type)).length;
  artifact.checks.hydrography={expected:names,returned:[...returnedNames].sort(),featureCount:hydroPayload?.features?.length||0,missing:missingNames,invalidGeometry};
  if(missingNames.length)throw new Error(`NHD missing configured waterways: ${missingNames.join(', ')}`);
  if(invalidGeometry)throw new Error(`NHD returned ${invalidGeometry} non-line feature(s)`);
  if((hydroPayload?.features?.length||0)<20)throw new Error('NHD flowline count unexpectedly small');

  artifact.phase='complete';
  artifact.status='pass';
  console.log(`Manistee live audit PASS — ${returnedSites.size} USGS sites, ${hydroPayload.features.length} NHD flowline features, ${returnedNames.size} named waterways.`);
}catch(error){
  artifact.failedPhase=artifact.phase;
  artifact.error=String(error?.message||error);
  console.error(`Manistee live audit FAIL at ${artifact.failedPhase}: ${artifact.error}`);
  process.exitCode=1;
}finally{
  await fs.mkdir('artifacts',{recursive:true});
  await fs.writeFile('artifacts/manistee-live-audit.json',JSON.stringify(artifact,null,2)+'\n');
}
