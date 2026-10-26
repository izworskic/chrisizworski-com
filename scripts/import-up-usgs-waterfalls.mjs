#!/usr/bin/env node
// USGS Falls/Rapids V2, DOI 10.5066/P9QQTKA0: offline research-only import.
// Usage: node scripts/import-up-usgs-waterfalls.mjs /path/to/conterminousUS_falls_nhd.geojson
// Never create indexable pages, trailheads or assumed access from hydrography.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const UPPER=new Set('ALGER BARAGA CHIPPEWA DELTA DICKINSON GOGEBIC HOUGHTON IRON KEWEENAW LUCE MACKINAC MARQUETTE MENOMINEE ONTONAGON SCHOOLCRAFT'.split(' '));
const get=(p,keys)=>{const entries=Object.fromEntries(Object.entries(p||{}).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));return keys.map(k=>entries[k.toLowerCase().replace(/[^a-z0-9]/g,'')]).find(v=>v!==null&&v!==undefined&&String(v).trim()!=='')??null;};
export function normalizeUSGS(raw){
  if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw Error('USGS GeoJSON FeatureCollection required');
  const features=[],seen=new Set(),stats={sourceRecords:raw.features.length,candidates:0,countyVerified:0,boundingBoxOnly:0};
  for(const [i,f] of raw.features.entries()){
    if(f?.geometry?.type!=='Point')continue;
    const [lng,lat]=(f.geometry.coordinates||[]).map(Number);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<45.65||lat>48.55||lng< -90.6||lng> -84.0)continue;
    const p=f.properties||{},name=String(get(p,['fall_name','fallname','name','feature_name','gnis_name'])||'Unnamed fall'),type=String(get(p,['fall_type','falltype','type','feature_type'])||'');
    if(/rapids|dam/i.test(name+' '+type))continue;
    const county=String(get(p,['county','countyname','county_name'])||'').toUpperCase().replace(/ COUNTY$/,'');if(county&&!UPPER.has(county))continue;
    // The published 2020 USGS GeoJSON uses keys such as "feature id",
    // "nhdplusv2 address": {"comid", "reachcode", "measure"}, and
    // "nhdhr address": {"reachcode", "measure"}; they are not flat columns.
    const id=String(get(p,['feature id','fall_id','fallid','objectid','fid','gnis_id'])||i+1),key=id+':'+lat.toFixed(5)+':'+lng.toFixed(5);if(seen.has(key))continue;seen.add(key);
    const plus=get(p,['nhdplusv2 address','nhdplusv2address'])||{},hr=get(p,['nhdhr address','nhdhraddress'])||{};
    const useful=v=>v===null||v===undefined||/^NO (?:COMID|REACHCODE|MEASURE)$/i.test(String(v))?null:v;
    const comid=useful(get(p,['comid','nhdpluscomid'])??get(plus,['comid']));
    const reachcode=useful(get(plus,['reachcode']));
    const hrReachcode=useful(get(hr,['reachcode']));
    const characteristic=Array.isArray(p.characteristics)?p.characteristics[0]||{}:{};
    if(UPPER.has(county))stats.countyVerified++;else stats.boundingBoxOnly++;
    features.push({id:'usgs-v2-'+id,name,lat:+lat.toFixed(6),lng:+lng.toFixed(6),county:UPPER.has(county)?county:null,geoEvidence:UPPER.has(county)?'county-attribute':'bounding-box-only',hydro:{usgsFallId:id,fallType:type||null,nhdComid:comid,nhdPlusReachCode:reachcode,nhdHrReachCode:hrReachcode,nhdHrMeasure:useful(get(hr,['measure'])),tallestDropFeet:useful(get(characteristic,['tallest drop feet']))},landManager:'unknown',publicAccess:'unknown',parking:'unknown',trail:'unknown',publication:'research-only',source:'https://doi.org/10.5066/P9QQTKA0'});
  }
  stats.candidates=features.length;
  return {schemaVersion:1,doi:'https://doi.org/10.5066/P9QQTKA0',release:2020,warning:'Bounding box may include non-UP falls. USGS hydrography does not establish access, ownership, parking or a public trail.',stats,features};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(!process.argv[2]){console.error('Pass local USGS GeoJSON path; use DOI to obtain raw release.');process.exit(2);}
  try{const raw=JSON.parse(await readFile(process.argv[2],'utf8'));const out=normalizeUSGS(raw);await writeFile('data/up-waterfall-usgs-candidates.json',JSON.stringify(out,null,2)+'\n');console.log(out.stats.candidates+' research-only USGS candidates staged. No pages generated.');}
  catch(e){console.error(e.message);process.exitCode=1;}
}
