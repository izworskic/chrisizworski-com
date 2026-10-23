'use strict';
// John Day River AIS OBSERVATIONS, not confirmed lock transits, queue positions, ETA,
// public river coverage or availability for recreational passage.
const {normalize}=require('./soo-ais');
// Bounding box [south, west, north, east] (Open Waters, NOT standard lon-first GeoJSON).
// Bounded intentionally to the Columbia River near John Day and The Dalles;
// it may contain nearby non-Columbia waters, so observations are not lock arrivals.
const BBOX=Object.freeze([45.45,-121.30,45.95,-120.00]);
const MAX_VESSELS=50;
const AIS_URL='https://ais.openwaters.io/v1/vessels?bbox='+BBOX.join(',')+'&max_age=30m&kind=vessel';
const PROVIDER='https://openwaters.io/api/ais/';
function assess(raw,now=Date.now()){
 const normalized=normalize(raw,now,BBOX);
 // Match Soo, Welland and Great Lakes: accept reports without optional kind.
 // Explicit non-vessel objects remain excluded; freshness is shared with Soo.
 const nonVessels=new Set((raw.features||[]).filter(f=>f?.properties?.kind && f.properties.kind!=='vessel')
 .map(f=>String(f.properties.mmsi??f.id??'')));
 const filtered=normalized.vessels.filter(v=>!nonVessels.has(v.mmsi));
 const vessels=filtered.slice(0,MAX_VESSELS);
 return {
   ok:true,observationState:vessels.length?'recent-reports':'no-recent-reports',
   coverageState:'unverified',lockStatus:'unknown',lockQueue:'unknown',
   checkedAt:normalized.checkedAt,maxAgeMinutes:30,
   area:{south:BBOX[0],west:BBOX[1],north:BBOX[2],east:BBOX[3]},
   vessels,vesselCount:vessels.length,
   truncated:filtered.length>MAX_VESSELS||raw.truncated===true,
   attribution:normalized.attribution,
   provider:PROVIDER,originalDataUrl:AIS_URL,
   caveat:'AIS reports are historical observations with age; silence may mean no receiver coverage. A location or course cannot prove a vessel is entering the lock. No live lock status, queue, or arrival estimate is inferred.',
   observationDisclaimer:'No detected vessel is not proof of an empty waterway.'
 };
}
module.exports={BBOX,AIS_URL,PROVIDER,MAX_VESSELS,assess};
