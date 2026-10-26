#!/usr/bin/env node
// Official USGS Falls/Rapids V2 -> Michigan GIS waterfall research crosswalk.
// The source is geographic data, NOT a public access, parking or trail source.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {normalizeUSGS} from './import-up-usgs-waterfalls.mjs';
const DOI='https://doi.org/10.5066/P9QQTKA0',MICHIGAN='https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7';
const normalize=n=>String(n||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\bwaterfalls?\b/g,'falls').replace(/\bfalls?\b/g,'').replace(/\s+/g,' ').trim();
const meters=(a,b)=>{const t=Math.PI/180,dlat=(b.lat-a.lat)*t,dlng=(b.lng-a.lng)*t,h=Math.sin(dlat/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dlng/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));};
export function buildUPHydroCrosswalk(raw,state){
  if(!Array.isArray(state?.features))throw Error('Michigan geographic feature array required');
  const parsed=normalizeUSGS(raw),names=new Map();
  for(const x of state.features){if(!Number.isInteger(x.gisObjectId)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))continue;const k=normalize(x.name);if(!k)continue;const bucket=names.get(k)||[];bucket.push(x);names.set(k,bucket);}
  const proposed=[],countyOnly=[],unresolved=[],byState=new Map();
  for(const f of parsed.features){
    const sites=(names.get(normalize(f.name))||[]).map(x=>({x,d:meters(f,x)})).filter(x=>x.d<=800);
    if(sites.length===1){
      const s=sites[0],m={stateGisObjectId:s.x.gisObjectId,stateName:s.x.name,usgsName:f.name,usgsFeatureId:f.hydro.usgsFallId,usgsLat:f.lat,usgsLng:f.lng,distanceMeters:Math.round(s.d),hydro:f.hydro,reviewState:'hydrogeography-only-no-access'};
      proposed.push(m);const b=byState.get(s.x.gisObjectId)||[];b.push(m);byState.set(s.x.gisObjectId,b);
    }else if(sites.length>1)unresolved.push({usgsFeatureId:f.hydro.usgsFallId,name:f.name,reason:'multiple-nearby-state-falls'});
    else if(f.geoEvidence==='county-attribute')countyOnly.push({id:f.id,name:f.name,lat:f.lat,lng:f.lng,county:f.county,hydro:f.hydro,reviewState:'unmatched-research-only'});
  }
  const matches=proposed.filter(x=>byState.get(x.stateGisObjectId).length===1).sort((a,b)=>a.stateGisObjectId-b.stateGisObjectId);
  for(const [id,group] of byState)if(group.length>1)unresolved.push({stateGisObjectId:id,sourceRecords:group.map(x=>x.usgsFeatureId),reason:'multiple-usgs-records-for-state-site'});
  return {schemaVersion:1,source:DOI,stateSource:MICHIGAN,publication:'research-only',warning:'USGS stream linkage and state GIS waterfall position establish neither land ownership nor safe/legal visitor access, parking, trail, current status or waterfall flow.',matchingRule:'Only unique normalized-name matches within 800 m of a state GIS waterfall are linked. Duplicates held separately. County-only features are not public map destinations.',stats:{nationalSourceRecords:parsed.stats.sourceRecords,regionalBoundingCandidates:parsed.stats.candidates,countyTaggedUP:parsed.stats.countyVerified,linkedToMichiganGIS:matches.length,countyOnlyCandidates:countyOnly.length,heldAmbiguous:unresolved.length},matches,countyOnly,unresolved};
}
async function run(){
 const src=process.argv[2];if(!src)throw Error('Pass downloaded official USGS V2 GeoJSON file');
 const [raw,mi]=await Promise.all([readFile(src,'utf8'),readFile('data/up-waterfall-geo-candidates.json','utf8')]);
 const source=JSON.parse(raw);if(source.type!=='FeatureCollection'||source.features.length<11000)throw Error('Incomplete USGS source; refusing to publish partial geographic extract');
 const result=buildUPHydroCrosswalk(source,JSON.parse(mi));
 if(result.matches.length<3)throw Error('Fewer than 3 reliable spatial matches; hold import for review');
 await writeFile('data/up-waterfall-usgs-v2-crosswalk.json',JSON.stringify(result,null,2)+'\n');
 const lite={schemaVersion:1,source:DOI,warning:result.warning,stats:result.stats,matches:result.matches.map(x=>({stateGisObjectId:x.stateGisObjectId,stateName:x.stateName,usgsFeatureId:x.usgsFeatureId,distanceMeters:x.distanceMeters,nhdComid:x.hydro.nhdComid,nhdPlusReachCode:x.hydro.nhdPlusReachCode,nhdHrReachCode:x.hydro.nhdHrReachCode}))};
 await writeFile('public/assets/up-waterfall-hydro-crosswalk.json',JSON.stringify(lite)+'\n');
 console.log(JSON.stringify(result.stats));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run().catch(e=>{console.error(e);process.exitCode=1;});
