'use strict';

/**
 * Florida mission-to-viewing decision deck.
 *
 * The existing LL2 mission, geospatial public-inventory, KSC ticket watch,
 * NPS alerts, and NWS forecasts remain the ONLY decision sources.
 * The deck changes the order in which evidence is presented. It never turns
 * a named public location into verified launch-day parking or authorization,
 * and never gives driving directions to a launch pad.
 */
const { locationIdentity, padRule, VIEWING_SOURCE, NPS_SOURCE } =
  require('./rocket-launch-florida-facilities');

const COUNTY='https://www.brevardfl.gov/ParksAndRecreation';
const GROUPS=Object.freeze({
  kennedy:{
    eyebrow:'Northern range · LC-39',
    heading:'Start on the Titusville waterfront',
    story:'Kennedy launch pads sit across the Indian River from Titusville. Choose a published public riverfront location, not an unverified entrance on the restricted side of the lagoon.',
    primary:'space-view',fallback:'rotary'
  },
  cape:{
    eyebrow:'Southern range · Cape Canaveral SFS',
    heading:'Start by the Port Canaveral shoreline',
    story:'Cape Canaveral Space Force Station launches use different pads from Kennedy. A Port Canaveral park is the geographic starting point, while the Titusville waterfront is a flexible inland alternative.',
    primary:'jetty',fallback:'rotary'
  }
});
const PUBLIC_IDS=new Set(['space-view','rotary','parrish','jetty']);
const CLOSED=new Set(['closed','ineligible']);
const KSC_SOURCE='https://www.kennedyspacecenter.com/launches-and-events/';
const PLAYALINDA_ID='playalinda-lot-8';

function mappedSite(point,role) {
  if(!point||!PUBLIC_IDS.has(point.id)||point.category!=='public-viewpoint')return null;
  const level=String(point.level||'unknown');
  const weather=point.weather||{};
  const geo=point.geometry;
  return {
    id:point.id,role,name:point.name,
    area:point.id==='jetty'?'Port Canaveral':'Titusville',
    category:'published-public-site',
    accessLevel:level,
    accessLabel:point.label||'Launch-day access not verified',
    accessReason:point.reason||'Check the land manager for event restrictions.',
    excluded:CLOSED.has(level),
    source:point.accessSource||null,
    geographicSource:point.geographicSource||null,
    coordinateRole:point.coordinateRole,
    mapId:point.id,
    features:Array.isArray(point.visitorFeatures)?point.visitorFeatures.slice(0,4):[],
    parking:point.parking||'Parking not verified for this launch.',
    geometry:geo&&point.coordinateRole==='site-reference'&&
      Number.isFinite(geo.miles)&&Number.isFinite(geo.bearingDegrees)?
      {miles:Math.round(geo.miles*10)/10,bearingDegrees:geo.bearingDegrees,
        bearingCardinal:geo.bearingCardinal||null}:null,
    weather:weather.status==='ok'&&weather.cloudStatus==='ok'&&
      Number.isInteger(weather.cloudCoverPercent)&&
      weather.cloudCoverPercent>=0&&weather.cloudCoverPercent<=100?
      {cloudCoverPercent:weather.cloudCoverPercent,
        forecastUpdatedAt:weather.forecastUpdatedAt||null,
        sourceUrl:weather.sourceUrl||null,
        qualifier:'NWS grid near the public park, not the rocket path or launch approval.'}:
      null
  };
}
function pickDistinct(points,preferredIds,selectedIds) {
  for(const id of preferredIds){
    if(selectedIds.has(id))continue;
    const match=points.find(p=>p.id===id);
    if(match&&match.category==='public-viewpoint'&&!CLOSED.has(match.level))return match;
  }
  return null;
}
function buildFloridaViewingDeck({
  launch=null,geographicViewing=null,viewpoints=[],kscViewing=null,
  accessSource=null,scheduleFreshness='unknown',arrivalGuidance=null
}={}){
  const facility=launch?locationIdentity(launch):null;
  const group=GROUPS[facility]||null;
  const all=Array.isArray(geographicViewing?.points)?geographicViewing.points:[];
  const selected=new Set();
  const picks=group?
    [pickDistinct(all,[group.primary,group.fallback,'parrish','space-view','jetty'],selected)] :
    [];
  if(picks[0])selected.add(picks[0].id);
  if(group)picks.push(pickDistinct(all,
    [group.fallback,facility==='cape'?'space-view':'parrish','rotary','jetty'],selected));
  if(picks[1])selected.add(picks[1].id);
  const cards=picks.filter(Boolean).map((p,i)=>mappedSite(p,i===0?'starting-point':'public-backup'))
    .filter(Boolean);
  const q=padRule(launch);
  const kscPoint=all.find(p=>p.id==='ksc-visitor'&&p.category==='ticketed-entry');
  const ksc={
    kind:'ticketed-venue',id:'ksc-visitor',name:'Kennedy Space Center Visitor Complex',
    source:VIEWING_SOURCE,calendarSource:KSC_SOURCE,
    mapId:kscPoint?'ksc-visitor':null,
    admission:'Daily admission is not a mission-specific viewing ticket. Additional tickets and bus-only special viewing depend on the operator’s event announcement.',
    evidenceState:kscViewing?.state||'unverified',
    officialEventMatched:kscViewing?.state==='matched',
    ruleCode:q.code,ruleHeadline:q.headline,ruleNote:q.note,
    padExcludedAtGantry:q.code==='gantry-excluded',
    locationRole:'Official visitor-complex arrival point only; no personal driving to Banana Creek or The Gantry.'
  };
  const npsVerified=accessSource?.verified===true;
  const beach=all.find(p=>p.id===PLAYALINDA_ID)||null;
  const beachLevel=npsVerified?beach?.level||'unknown':'unknown';
  const beachExcluded=CLOSED.has(beachLevel);
  const playalinda={
    kind:'conditional-beach',id:PLAYALINDA_ID,name:'Playalinda Beach',
    mapId:beach?PLAYALINDA_ID:null,
    npsCheckedAt:accessSource?.checkedAt||null,
    npsVerified,accessLevel:beachLevel,
    accessLabel:beachExcluded?'NPS closure/restriction reported':
      npsVerified?'No guaranteed launch-day opening':'Official NPS access check unavailable',
    accessReason:beachExcluded?
      'A checked NPS source restricts this parking area. Do not use it as the chosen viewing destination.':
      'Even with no matched lot closure, the park can fill and NASA can close areas for the mission without advance notice.',
    policy:'NPS generally stops inbound Playalinda Beach Road traffic around 30 minutes before launch. A projected cutoff is not a gate status. Summer visitor hours normally end at 8 PM and winter hours at 6 PM; verify current park schedules and mission security.',
    ruleSource:NPS_SOURCE,
    source:beach?.accessSource||NPS_SOURCE,
    excluded:beachExcluded,
    roadDecision:arrivalGuidance?.level||'unknown'
  };
  const hasMission=!!(launch&&typeof launch.id==='string');
  const unknown=!group||!cards.length;
  const reason=!hasMission?'No scheduled Florida mission selected. Choose a real mission to generate a site-specific plan.':
    !group?'The shared mission record does not verify whether the pad is at Kennedy or Cape Canaveral. No coast is ranked.':
    !cards.length?'Published public locations are unavailable or currently restricted; do not invent an alternative.':
    null;
  const meta=group?{
    facility,eyebrow:group.eyebrow,headline:group.heading,story:group.story
  }:{facility:null,eyebrow:'Pad identity not verified',
    headline:hasMission?'Wait for a verified Florida launch range':'Choose a mission before choosing a shore',
    story:'Kennedy and Cape Canaveral do not share the same launch pads or public viewing choices. Check the selected mission before driving.'};
  return {
    version:1,missionId:hasMission?launch.id:null,
    missionName:hasMission?(launch.name||'Selected Florida launch'):null,
    scheduleFreshness,locationStatus:unknown?'unverified':'source-identified',
    ...meta,cards,reason,playalinda,ksc,
    observation:{
      npsAlertCheckedAt:accessSource?.checkedAt||null,
      npsVerified,
      launchTimePrecision:launch?.netPrecision||'unknown',
      trajectoryVerified:false,
      parkingAvailabilityVerified:false,
      admissionVerified:false
    },
    decisionNote:'These are source-attributed geographic starting points, never a verified parking stall, ticket, open gate, clear view or launch commitment. The mapped distance to a pad is a straight line, not a route or trajectory.',
    nextAction:'Confirm the selected mission with its operator and each viewing site with its land manager before traveling.'
  };
}
module.exports={buildFloridaViewingDeck,GROUPS,mappedSite};
