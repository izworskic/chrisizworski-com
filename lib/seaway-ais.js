'use strict';
const {normalize, MAX_AGE_MS}=require('./soo-ais');
const {regions}=require('../data/seaway/places.json');
const REGION_MAP=new Map(regions.map(r=>[r.id,r]));
const MAX_VESSELS=50;
const PROVIDER='https://openwaters.io/api/ais/';
function regionIds(value='all') {
  return value==='all'?regions.map(r=>r.id):REGION_MAP.has(value)?[value]:null;
}
function sourceUrl(id) {
  const r=REGION_MAP.get(id);
  if(!r)throw new Error('Unknown Seaway region');
  return 'https://ais.openwaters.io/v1/vessels?bbox='+r.bbox.join(',')+'&kind=vessel&max_age=30m';
}
function assess(raw,id,now=Date.now()) {
  const region=REGION_MAP.get(id);
  if(!region)throw new Error('Unknown Seaway region');
  // Filter explicit non-vessels before normalizing; a duplicate bad kind must not
  // remove a valid ship report sharing its id. Optional kind remains compatible.
  if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw new Error('Invalid AIS data');
  const features=raw.features.filter(f=>!f?.properties?.kind||f.properties.kind==='vessel');
  const data=normalize({...raw,features},now,region.bbox);
  const dimensions=new Map();
  for(const f of features){const p=f.properties||{},id=String(p.mmsi??f.id??''),old=dimensions.get(id);if(!old||Date.parse(p.seen)>Date.parse(old.seen))dimensions.set(id,p);}
  const vessels=data.vessels.slice(0,MAX_VESSELS).map(v=>{
    const p=dimensions.get(v.mmsi)||{};
    const beamMeters=typeof p.beam==='number'&&p.beam>0&&p.beam<=100?p.beam:null;
    return {...v,beamMeters,regionIds:[id]};
  });
  // Provider may silently cap a response. Reaching 50 is conservatively partial.
  const truncated=raw.truncated===true||raw.features.length>=MAX_VESSELS||data.vessels.length>MAX_VESSELS;
  return {id,name:region.name,state:truncated?'partial':vessels.length?'recent':'no-reports',checkedAt:data.checkedAt,vessels,attribution:data.attribution,truncated,sourceUrl:sourceUrl(id)};
}
function combine(results,now=Date.now()) {
  const unique=new Map();
  for(const result of results)for(const v of result.vessels||[]){
    const old=unique.get(v.mmsi);
    const age=now-Date.parse(v.seen);
    if(!Number.isFinite(age)||age>MAX_AGE_MS||age< -60000)continue;
    const regionIds=[...new Set([...(old?.regionIds||[]),...v.regionIds])];
    unique.set(v.mmsi,{...(!old||Date.parse(v.seen)>Date.parse(old.seen)?v:old),regionIds});
  }
  const available=results.filter(r=>r.state!=='unavailable');
  const vessels=[...unique.values()].sort((a,b)=>Date.parse(b.seen)-Date.parse(a.seen));
  const partial=available.length<results.length||results.some(r=>r.truncated);
  return {ok:available.length>0,state:!available.length?'unavailable':partial?'partial':vessels.length?'recent':'no-reports',checkedAt:new Date(now).toISOString(),maxAgeMinutes:30,coverage:'received-reports-only',isSchedule:false,lockStatus:'unknown',lockQueue:'unknown',vessels,regions:results.map(({vessels,attribution,...r})=>({...r,count:vessels?.length||0})),attribution:available.flatMap(r=>r.attribution||[]).filter((v,i,a)=>a.findIndex(x=>x.source===v.source)===i),provider:PROVIDER};
}
module.exports={regions,regionIds,sourceUrl,assess,combine,MAX_VESSELS};
