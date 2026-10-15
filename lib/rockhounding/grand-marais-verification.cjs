'use strict';

// Documentary verification gate: source assertions are separate from publishable trip decisions.
// This module deliberately does not attempt to contact the municipality.
const snapshot=require('../../data/rockhounding/grand-marais-operator-gate-2026-10-15.json');

const trustedOwnerUrl=(url)=>typeof url==='string'&&/^https:\/\/(?:www\.)?burttownship(?:acmi\.gov|\.com)\//.test(url);
const hasCoordinates=(p)=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=46.65&&p.lat<=46.70&&p.lon>=-86.02&&p.lon<=-85.96;
const hasLine=(feature)=>feature&&feature.type==='LineString'&&Array.isArray(feature.coordinates)&&feature.coordinates.length>=2&&feature.coordinates.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
const sourceMap=new Map(snapshot.sources.map(s=>[s.id,s]));

function assessSite(site){
  if(!site||!['grand-marais-agate','grand-marais-harbor'].includes(site.siteId)) throw new Error('Unrecognized Grand Marais site');
  if(!Array.isArray(site.sourceIds)||!site.sourceIds.every(id=>sourceMap.has(id)))throw new Error('Unknown source identifier');
  const publicBeach=site.publicFacility==='OWNER_CONFIRMED'&&site.sourceIds.some(id=>id==='TOWNSHIP_AGATE'||id==='TOWNSHIP_BAYSHORE');
  const gate=site.ownerVerifiedParkingGate;
  const exactParking=hasCoordinates(gate)&&trustedOwnerUrl(gate.sourceUrl)&&gate.verifiedByOperator===true;
  const legalPath=hasLine(site.legalParkingToShoreLine)&&site.legalParkingToShoreLine.verifiedByOperator===true&&trustedOwnerUrl(site.legalParkingToShoreLine.sourceUrl);
  const rules=site.rockCollectionRule;
  const ruleVerified=typeof rules==='object'&&rules!==null&&rules.status==='PERMITTED'&&trustedOwnerUrl(rules.sourceUrl)&&typeof rules.areaDescription==='string'&&rules.areaDescription.length>15;
  const accessibility=site.wheelchairAccessToSand==='OWNER_CONFIRMED_STEP_FREE'&&trustedOwnerUrl(site.accessibilityEvidenceUrl);
  const geom=site.shorelineModelGeometry;
  const waveReady=geom?.status==='VALIDATED_SHORE_NORMAL'&&Number.isFinite(geom?.outwardBearingDeg)&&geom.outwardBearingDeg>=0&&geom.outwardBearingDeg<360&&geom?.sourceUrl?.startsWith('https://')&&site?.modelWetCell?.validated===true;
  // Location-discovery tier: an officially advertised public rockhounding site is
  // usable for planning without an owner's email or invented parking coordinates.
  const publicResearchLead=publicBeach&&site.researchDestinationType==='ROCKHOUNDING_LOCATION'&&
    site.rockhoundingContext==='TOWNSHIP_RECREATION_PLAN_IDENTIFIES_PUBLIC_ROCKHOUNDING_DESTINATION'&&
    site.sourceIds.includes('TOWNSHIP_2026_RECREATION_PLAN')&&
    sourceMap.get('TOWNSHIP_2026_RECREATION_PLAN')?.owner==='Burt Township';
  const arrival=site.arrivalGuidance;
  const supportedArrivalText=publicBeach&&arrival?.type==='OPERATOR_DESCRIBED_NOT_ROUTE'&&
    typeof arrival.description==='string'&&arrival.description.length>15&&
    sourceMap.get(arrival.sourceId)?.owner==='Burt Township'&&
    arrival.exactParkingGps===null;
  const toCollect=publicBeach&&exactParking&&legalPath&&ruleVerified;
  return {
    siteId:site.siteId,
    publicBeachDocumented:publicBeach,
    canListPublicBeachForVisitPlanning:publicBeach,
    canListRockhoundingDestinationLead:!!publicResearchLead,
    canGiveGeneralArrivalAdvice:!!supportedArrivalText,
    generalArrivalAdvice:supportedArrivalText?arrival.description:null,
    researchExposureModelMayProceed:publicBeach, // research ONLY; no live search window or safety claim
    collectionRuleDisplay:ruleVerified?'EXPLICITLY_PERMITTED':'CHECK_POSTED_LOCAL_RULES',
    locationTrustLabel:'PUBLIC_FACILITY_DOCUMENTED',
    exactLegalParkingAndEntryVerified:!!exactParking,
    pedestrianAccessVerified:!!legalPath,
    collectingPermissionVerified:!!ruleVerified,
    wheelchairToSandVerified:!!accessibility,
    researchWaveSamplingReady:!!waveReady,
    canPublishCollectingRecommendation:!!toCollect,
    canPublishWaveBasedRecommendation:!!toCollect&&!!waveReady,
    unresolved:[
      ...(!exactParking?['PARKING_GATE_UNCONFIRMED']:[]),
      ...(!legalPath?['LEGAL_PATH_UNCONFIRMED']:[]),
      ...(!ruleVerified?['COLLECTION_RULE_UNCONFIRMED']:[]),
      ...(!accessibility?['ACCESSIBILITY_UNCONFIRMED']:[]),
      ...(!waveReady?['WAVE_SHORE_GEOMETRY_UNVERIFIED']:[])
    ],
  };
}
function assessAll(){
 const ids=new Set(snapshot.sites.map(s=>s.siteId));
 if(ids.size!==2||!ids.has('grand-marais-agate')||!ids.has('grand-marais-harbor'))throw new Error('Expected both contrasting beach sites');
 return snapshot.sites.map(assessSite);
}
module.exports={assessSite,assessAll,snapshot};
