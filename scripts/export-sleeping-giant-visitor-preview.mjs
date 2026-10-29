#!/usr/bin/env node
/**
 * Publish only into a GitHub Actions review artifact, never into public/.
 * Static first: server-created HTML has all six grounded route cards; JS enhances
 * ranking and research-only geography, using the authoritative Node decision engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {plan,validateCatalog,catalog}=require('../lib/sleeping-giant/route-engine.cjs');
const {buildResearchOverlay,audit}=require('../lib/sleeping-giant/geometry-reconciliation.cjs');
const {validateLedger,auditAccess}=require('../lib/sleeping-giant/visitor-access-engine.cjs');
const root=path.resolve(import.meta.dirname,'..');
const pathBase=path.join(root,'previews','sleeping-giant-explorer');
const destination=path.resolve(process.argv[2]||'artifacts/sleeping-giant-explorer');
const read=filename=>fs.readFileSync(path.join(pathBase,filename),'utf8');
validateCatalog();
validateLedger();
const geo=audit(),access=auditAccess();
if(geo.navigatorEligible!==false||geo.verifiedRoadToTrailLinks!==0||geo.signedJunctionsCertified!==0
  ||access.coordinateCertified!==0||access.routeGeometryCertified!==0
  ||catalog.routes.length!==6)throw Error('Preview evidence gate: cannot promote source research to directions');
const hours=[2,4,8,10,12];
const modes=['hike','bike-hike'];
const interests=['short-walk','summit','geology','beach','lake','challenge','lookout'];
const plans={};
for(const h of hours)for(const mode of modes)for(const interest of interests){
  const data=plan({hours:h,mode,interest});
  if(data.planningOnly!==true||data.liveTrailStatus!==false)throw Error('Engine output must be planning-only');
  plans[h+'|'+mode+'|'+interest]=data.results.map(item=>({
    id:item.id,rank:item.rank,classification:item.classification,interestMatched:item.interestMatched,
    durationStatus:item.duration.status
  }));
}
const overlays=['sea-lion','top-of-the-giant','head-of-the-giant','nanabosho-lookout']
  .map(routeId=>buildResearchOverlay(routeId,{withCoordinates:true}));
if(overlays.some(o=>o.visitorRouteReady!==false||o.turnByTurnEligible!==false||o.parkingConnectorMapped!==false))
  throw Error('Preview safety gate: route geometry advertised as navigable');
const model={
  schemaVersion:1,
  reviewedAt:catalog.reviewedAt,
  verifiedOfficialSource:catalog.sources.activities,
  sourceMode:'OFFLINE_OFFICIAL_PUBLISHED_FACTS',
  weatherLive:false,trailLive:false,parkingNowLive:false,
  allDirectionsDisabled:true,
  parking:{center:geo.parking.mappedParkingResearchPoint.center,
    source:geo.parking.mappedParkingResearchPoint.osmSourceUrl,
    officialParkCoordinate:false,carNavigationEligible:false},
  routes:catalog.routes.map(r=>({
    id:r.id,name:r.name,roundTripKm:r.roundTripKm,difficulty:r.difficulty,
    bikePermission:r.bikePermission,bikeApproachRoundTripKm:r.bikeApproachRoundTripKm,
    bikeHikeRemainingRoundTripKm:r.bikeHikeRemainingRoundTripKm,
    officialDurationMinutes:r.officialDurationMinutes,startingAccessId:r.startingAccessId,
    currentTrailStatus:'unverified'
  })),
  overlays,plans
};
const json=JSON.stringify(model).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028');
const html=read('index.template.html'),css=read('explorer.css'),js=read('explorer.js');
const tokens=['/* INLINE_STYLES */','/* INLINE_SCRIPT */','/* INLINE_DATA */'];
if(tokens.some(token=>html.split(token).length!==2))throw Error('Preview must contain each single slot exactly once');
const built=html.replace(tokens[0],css).replace(tokens[1],js).replace(tokens[2],json);
if(built.includes('/* INLINE_')||!built.includes('<noscript>')||!built.includes('noindex,nofollow,noarchive'))
  throw Error('Missing static fallback, review indexing gate, or template substitution');
// Test actual outgoing anchors and affirmative status language, not text
// fragments inside source citations, script comments, or negated caveats.
if(/<a\b[^>]*href=["']https:\/\/www\.google\.com\/maps\/dir\//i.test(built)
  || /\b(?:trail|road)\s+is\s+open\s+now\b/i.test(built))
  throw Error('Disallowed directions/current opening claim');
fs.mkdirSync(destination,{recursive:true});
fs.writeFileSync(path.join(destination,'index.html'),built);
fs.writeFileSync(path.join(destination,'preview-evidence-summary.json'),JSON.stringify({
  status:'REVIEW_ONLY',routes:model.routes.length,researchGeometryRoutes:overlays.length,
  decisionComparisons:Object.keys(plans).length,
  viewOnly:true,publicRoutePublished:false,weatherLive:false,
  navigationLinksEnabled:false,offlineSourceReviewDate:catalog.reviewedAt,
  parkingLocationSource:'OpenStreetMap derived, not park-owned',
  previewFile:'index.html',photoCredit:'Justin Meissen, CC BY-SA 2.0, via Wikimedia Commons'
},null,2)+'\n');
console.log('Sleeping Giant visitor preview generated: '+model.routes.length+' routes, '+overlays.length+
  ' research map outlines, '+Object.keys(plans).length+' engine-backed combinations. No public deployment.');
