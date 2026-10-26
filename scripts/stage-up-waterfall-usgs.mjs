#!/usr/bin/env node
// Import USGS V2 hydrography as research, then conservatively cross-reference Michigan GIS.
// Never derive visitor access, land management, parking or trails from these records.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeUSGS} from './import-up-usgs-waterfalls.mjs';
const filename=process.argv[2];
if(!filename){console.error('Usage: node scripts/stage-up-waterfall-usgs.mjs <official-USGS-geojson>');process.exit(2);}
const data=fs.readFileSync(filename);
if(data.byteLength<2000000)throw Error('Reject truncated USGS release: too few bytes');
const parsed=JSON.parse(data.toString('utf8'));
if(!Array.isArray(parsed.features)||parsed.features.length<11000)throw Error('Reject incomplete USGS release: expected 11,000+ features');
const normalized=normalizeUSGS(parsed);
if(normalized.features.length<20)throw Error('Unexpectedly few USGS waterfall candidates in U.P. bounding research area');
const state=JSON.parse(fs.readFileSync('data/up-waterfall-geo-candidates.json','utf8'));
const hydro=normalized.features;
const rad=Math.PI/180;
const dist=(a,b)=>{const dLat=(a.lat-b.lat)*rad,dLng=(a.lng-b.lng)*rad;const z=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));};
const clean=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/waterfall/g,'falls');
const crosswalk=[],review=[];
for(const g of state.features){
  let matches=hydro.map(u=>({u,meters:dist(u,g)})).filter(m=>m.meters<=400).sort((a,b)=>a.meters-b.meters);
  const named=matches.filter(m=>{const a=clean(m.u.name),b=clean(g.name);return a===b||a.includes(b)||b.includes(a);});
  if(named.length===1){
    const m=named[0];crosswalk.push({stateGisObjectId:g.gisObjectId,stateName:g.name,usgsId:m.u.id,usgsName:m.u.name,separationMeters:+m.meters.toFixed(1),nhdPlusComid:m.u.hydro.nhdComid,nhdPlusReachCode:m.u.hydro.nhdPlusReachCode,nhdHrReachCode:m.u.hydro.nhdHrReachCode,method:'matching-name-and-400m-distance',review:'geographic-research-link-only'});
  }else if(named.length>1){review.push({stateGisObjectId:g.gisObjectId,reason:'ambiguous nearby same-name USGS features',candidateCount:named.length});}
}
const stamp={source:'USGS Waterfalls and Rapids / NHD V2',doi:'https://doi.org/10.5066/P9QQTKA0',sourceYear:2020,sha256:crypto.createHash('sha256').update(data).digest('hex'),sourceFeatureCount:parsed.features.length,importedCandidateCount:hydro.length,stateCrosslinks:crosswalk.length,manualReview:review.length,spatialCaveat:'USGS bounding-box-only points may be outside Upper Peninsula; do not automatically map or publish unmatched points.',accessPolicy:'No hydrography feature provides permission, trail, land manager, parking or current opening.'};
const candidates={...normalized,provenance:stamp};
fs.writeFileSync('data/up-waterfall-usgs-candidates.json',JSON.stringify(candidates,null,2)+'\n');
fs.writeFileSync('data/up-waterfall-usgs-crosswalk.json',JSON.stringify({schemaVersion:1,provenance:stamp,matches:crosswalk,needsManualReview:review},null,2)+'\n');
console.log(JSON.stringify(stamp,null,2));
