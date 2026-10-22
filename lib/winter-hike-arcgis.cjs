'use strict';
/**
 * Official MI DNR geometry adapter. This is not a public API route, and the
 * query must use a curated DNR UUID. All layer requests are complete or the
 * result is UNKNOWN; missing closure results are not proof a trail is open.
 */
const G=require('./winter-hike-spatial.cjs');
const ROOT='https://gisagodnr.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/MapServer';
const LAYERS={closure:0,hiking:2,snowshoe:6};
const FIELDS='OBJECTID,RecreationSearchTrailID,TrailNamePrimary,TrailUseCategory,OpenClosedStatusNonmotor,PublicComments';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function url(kind,id,offset=0) {
 if(!Object.hasOwn(LAYERS,kind)||!UUID.test(id)||!Number.isInteger(offset)||offset<0||offset>500)
  throw Error('Invalid official DNR geometry lookup');
 return ROOT+'/'+LAYERS[kind]+'/query?'+new URLSearchParams({
  where:"RecreationSearchTrailID = '"+id+"'",
  outFields:FIELDS,returnGeometry:'true',outSR:'4326',geometryPrecision:'5',
  resultOffset:String(offset),resultRecordCount:'100',f:'json'
 }).toString();
}
function decode(body) {
 if(!body||body.error||!Array.isArray(body.features))throw Error('DNR service unavailable');
 return body.features.filter(x=>x && typeof x.attributes==='object');
}
async function oneLayer(kind,id,read) {
 const all=[];
 for(let off=0;off<=200;off+=100){
  const raw=await read(url(kind,id,off));
  const features=decode(raw);
  all.push(...features);
  if(all.length>300)throw Error('Unbounded DNR dataset');
  if(raw.exceededTransferLimit!==true)return all;
 }
 throw Error('Incomplete DNR pagination');
}
async function lookup(destination,options={}) {
 const read=options.fetchJson||httpJson;
 if(!destination||!UUID.test(destination.id))throw Error('Expected curated DNR trail UUID');
 const layers=await Promise.allSettled(Object.keys(LAYERS).map(k=>oneLayer(k,destination.id,read)));
 const missing=Object.keys(LAYERS).filter((k,i)=>layers[i].status!=='fulfilled');
 if(missing.length)return {status:'unavailable',missingLayers:missing,
  reason:'At least one official layer failed; cannot clear trail geometry or closures',
  spatial:null,source:ROOT};
 const [closureSegments,hikingSegments,snowshoeSegments]=layers.map(x=>x.value);
 const spatial=G.audit(destination,{closureSegments,hikingSegments,routeObjectIds:options.routeObjectIds});
 // Explicitly report conflicts from auxiliary snowshoe layer, which can share
 // an ID with a differently named hiking trail.
 const extra=snowshoeSegments.filter(f=>String(f.attributes?.RecreationSearchTrailID||'')===destination.id &&
    G.identityMatch(destination,f)===false);
 spatial.identityConflicts=[...new Set([...spatial.identityConflicts,...extra.map(f=>f.attributes?.OBJECTID)])];
 return {status:'fetched',source:ROOT,spatial,counts:{hiking:hikingSegments.length,
  closure:closureSegments.length,snowshoe:snowshoeSegments.length},
  semantics:'Segment-level GIS snapshot, not operator-verified trail or winter parking'};
}
async function httpJson(link) {
 if(!link.startsWith(ROOT+'/'))throw Error('Invalid geometry source hostname');
 const r=await fetch(link,{headers:{Accept:'application/json',
   'User-Agent':'WinterHikeResearch/0.1 (+https://chrisizworski.com/)'},signal:AbortSignal.timeout(8500)});
 if(!r.ok)throw Error('DNR source HTTP '+r.status);
 return r.json();
}
module.exports={url,decode,lookup,LAYERS};
