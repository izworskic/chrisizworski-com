#!/usr/bin/env node
'use strict';
/**
 * Run manually: node scripts/benchmark-winter-hike-preview.mjs --check
 * No network, builds, costly API queries, or scheduled background checks.
 * Hard losses protect trust boundaries before public launch.
 */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {catalog,routeToResearchDestination,auditCatalog}=require('../lib/winter-hike-routes.cjs');
const E=require('../lib/winter-hike-decision.cjs');
const Trip=require('../lib/winter-hike-trip.cjs');
const Access=require('../lib/winter-hike-access.cjs');
const now=Date.parse('2026-12-12T15:00:00Z');
const forecast={updatedAt:'2026-12-12T14:00:00Z',targetCovered:true,
 windMph:8,windChillF:12,tempMaxF:27,alerts:[]};
const snow={kind:'modeled',depthInches:9,validAt:'2026-12-12T12:00:00Z'};
const violations=[];
function fail(caseId,condition,message,loss=100){
 if(condition)violations.push({caseId,message,loss});
}
const audit=auditCatalog();
fail('catalog',!audit.ok,'Static source catalog invalid');
for(const r of catalog.routes){
 const dest=routeToResearchDestination(r.id);
 const access=Trip.resolveAccess(dest);
 const out=E.interpret(dest,{access,forecast,snow},now);
 fail('unverified-access/'+r.id,out.state==='candidate','Positive verdict without current winter manager trail, road and lot checks');
 fail('navigation/'+r.id,r.navigationReady!==false||r.verifiedDriveTarget!==null,
   'Unverified DNR point became driving destination');
 fail('geometry/'+r.id,r.routeGeometryObjectIds!==null,'Source point treated as complete route geometry');
}
const dest=routeToResearchDestination('hartwick-old-growth');
const closed=E.interpret(dest,{access:Trip.resolveAccess(dest),forecast,snow,
 closure:{active:true,geometryVerified:true,matchesDestination:true,routeAffected:true}},now);
fail('closed-route',closed.state!=='excluded','Mapped selected-route closure not excluded',100);
const storm=E.interpret(dest,{access:Trip.resolveAccess(dest),
 forecast:{...forecast,alerts:['Winter Storm Warning']},snow},now);
fail('storm',storm.state!=='weather-hold','Severe NWS warning not held',100);
const unknown=E.interpret(dest,{access:Trip.resolveAccess(dest),forecast,
 snow:{...snow,depthInches:null}},now);
fail('missing-noaa',unknown.state==='candidate','Missing snow converted to false go',100);
const spoof=Access.accessFromChecks(dest.id,[{
 kind:'trail',trailId:dest.id,status:'open',winterSpecific:true,
 checkedAt:'2026-12-12T14:00:00Z',sourceUrl:'https://michigan.gov.attacker.example/open'
}],now);
fail('forged-manager',spoof.managerConfirmed,'Untrusted manager source cleared access',100);
const result={catalogRoutes:catalog.routes.length,directDnrId:catalog.routes.filter(r=>r.sourceDnrTrailId).length,
 missingDigitalRouteIdentity:catalog.routes.filter(r=>!r.sourceDnrTrailId).length,
 testedScenarios:catalog.routes.length*3+4,
 falseApprovalLoss:violations.reduce((sum,v)=>sum+v.loss,0),
 releaseApproved:false,
 reason:'Real current manager winter plowing and each complete mapped route remain unverified',
 violations};
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--check') && violations.length)process.exitCode=1;
