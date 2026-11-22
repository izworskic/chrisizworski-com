'use strict';
const {before,test}=require('node:test');
const assert=require('node:assert/strict');
const curated=require('../data/cuyahoga/odot-bridge-inventory-points.json');
let auditOfficialGeometry;
before(async()=>({auditOfficialGeometry}=await import('../scripts/cuyahoga-official-bridge-audit.mjs')));
const official = () => ({type:'FeatureCollection',features:curated.bridges.map(b=>({type:'Feature',geometry:{type:'Point',coordinates:[b.lon,b.lat]},properties:{SFN:b.officialStructureFileNumber,STR_LOC_CARRIED:b.odotCarried,INVENT_FEAT:b.odotCrossed,GEN_OPR_STATUS:b.rawGeneralOperatingStatusCode}}))});
const channel = () => ({type:'FeatureCollection',features:[{type:'Feature',properties:{channelareaidpk:'CELRB_LB_05_CUY',mediaidfk:'fixture-source'},geometry:{type:'Polygon',coordinates:[[[-81.75,41.44],[-81.65,41.44],[-81.65,41.54],[-81.75,41.54],[-81.75,41.44]]]}}]});
test('seven ODOT structure records and federal channel context stay labeled research only',()=>{
 const result=auditOfficialGeometry(official(),channel(),curated);
 assert.equal(result.selectedBridgeCount,7);
 assert.equal(result.bridgeEtasEnabled,false);
 assert.equal(result.bridgeCrossingsValidated,false);
 assert.deepEqual(result.checks.filter(b=>b.cfrRiverMile!==null).map(b=>b.cfrRiverMile),[1.28,1.93]);
 assert.ok(result.checks.every(b=>b.officialPointMatchMeters===0));
 assert.ok(result.checks.every(b=>b.bridgeOpenStatusValidated===false&&b.visitorAccessValidated===false));
});
test('missing or changed ODOT position and modified identity fail closed',()=>{
 const d=official();d.features[0].geometry.coordinates[0]+=.002;
 assert.throws(()=>auditOfficialGeometry(d,channel(),curated),/drifted/);
 const e=official();e.features[0].properties.SFN='not-a-real-sfn';
 assert.throws(()=>auditOfficialGeometry(e,channel(),curated),/absent/);
});
test('missing USACE Cuyahoga channel or duplicate channel identity must not pass',()=>{
 assert.throws(()=>auditOfficialGeometry(official(),{type:'FeatureCollection',features:[]},curated),/absent/);
 const x=channel();x.features.push(x.features[0]);
 assert.throws(()=>auditOfficialGeometry(official(),x,curated),/ambiguous/);
});
test('unverified visitor entrance, operational status and false span role are disallowed',()=>{
 const x=structuredClone(curated);x.bridges[0].verifiedVisitorEntrance=true;
 assert.throws(()=>auditOfficialGeometry(official(),channel(),x),/Unverified/);
 const y=structuredClone(curated);y.bridges[0].bridgeOperationalStatus='OPEN';
 assert.throws(()=>auditOfficialGeometry(official(),channel(),y),/Unverified/);
 const z=structuredClone(curated);z.bridges[0].coordinateRole='SURVEYED_SPAN';
 assert.throws(()=>auditOfficialGeometry(official(),channel(),z),/Unverified/);
});
