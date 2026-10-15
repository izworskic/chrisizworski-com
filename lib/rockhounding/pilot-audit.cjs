'use strict';
// Operational boundary: research evidence cannot silently become legal trip routing.
const reviews=require('../../data/rockhounding/pilot-access-reviews.json');
const sites=require('../../data/rockhounding/pilot-sites.json');
const footprints=require('../../data/rockhounding/grand-marais-research-footprints.geojson');
function pilotAudit(){
 const roster=new Set(sites.sites.map(s=>s.id)),seen=new Set();
 return reviews.pilotReviews.map(r=>{
   if(!roster.has(r.id)||seen.has(r.id))throw Error('Unknown or duplicate site ID: '+r.id);
   seen.add(r.id);
   const d=sites.sites.find(x=>x.id===r.id);
   if(!d||d.priority!=='pilot')throw Error('Pilot reviewed outside prioritized roster: '+r.id);
   const operatorBacked=typeof r.facilityUrl==='string'&&r.facilityUrl.startsWith('https://');
   const publicFacilityVerified=operatorBacked&&r.entryStatus!=='UNVERIFIED'&&r.entryStatus!==null;
   const exactGateVerified=r.entryStatus==='EXACT_LEGAL_ENTRY_VERIFIED'&&r.entryCoordinate?.coordinateType==='EXACT_NAVIGABLE_GATE'&&r.entryCoordinate?.verifiedByOperator===true;
   const walkRouteVerified=d.publicEntry?.walkRouteStatus==='VERIFIED'&&d.publicEntry?.status==='EXACT_ENTRY_VERIFIED';
   const collectingVerified=d.collectionPermission?.status==='EXPLICIT_SITE_PERMISSION'&&typeof d.collectionPermission?.sourceUrl==='string';
   const geomVerified=d.shoreSegment?.reviewedWaterline===true&&Number.isFinite(d.shoreSegment?.outwardBearingDeg);
   const closure=r.id==='fishermans-island' || r.id==='lakeport-day-use';
   return {id:r.id,publicFacilityVerified,exactGateVerified,walkRouteVerified,collectingVerified,geomVerified,
      collectionReady:exactGateVerified&&walkRouteVerified&&collectingVerified&&geomVerified&&!closure,
      reasons:[...(!exactGateVerified?['EXACT_ENTRY_UNVERIFIED']:[]),...(!walkRouteVerified?['WALK_ROUTE_UNVERIFIED']:[]),...(!collectingVerified?['COLLECTING_RULE_UNVERIFIED']:[]),...(!geomVerified?['SHORE_NORMAL_UNVERIFIED']:[]),...(closure?['ACCESS_RESTRICTION_REQUIRES_FRESH_CHECK']:[])]};
 });
}
function inspectResearchFootprints(){
 if(footprints.type!=='FeatureCollection'||footprints.features.length!==2)throw Error('Expected two comparative research footprints');
 const ids=new Set();
 return footprints.features.map(f=>{
  const id=f.properties?.siteId;if(ids.has(id))throw Error('Duplicate footprint');ids.add(id);
  const ring=f.geometry?.coordinates?.[0];
  if(f.geometry?.type!=='Polygon'||!Array.isArray(ring)||ring.length<4)throw Error('Invalid polygon: '+id);
  for(const p of ring){if(p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||p[0]<-86.1||p[0]>-85.9||p[1]<46.65||p[1]>46.7)throw Error('Out-of-area geometry '+id)}
  if(JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))throw Error('Unclosed ring '+id);
  if(f.properties?.featureStatus!=='OSM_RESEARCH_GEOMETRY_ONLY'||f.properties?.shorelineWaterwardNormalDeg!==null)throw Error('Footprint promoted without independent verification');
  return {id,pointCount:ring.length,collectionReady:false,geometryStatus:'RESEARCH_ONLY'};
 });
}
module.exports={pilotAudit,inspectResearchFootprints};

