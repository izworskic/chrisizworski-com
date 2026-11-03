'use strict';

/**
 * Florida spaceport identity for one shared mission schedule.
 * Launch Library 2 location IDs are authoritative when present:
 * 27 = Kennedy Space Center; 12 = Cape Canaveral Space Force Station.
 * Pad-name inference is used only if location identity is missing.
 * This module describes geographic identity and stable published viewing
 * restrictions. It NEVER asserts a live pad opening, ticket or launch approval.
 */
const VIEWING_SOURCE='https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/';
const VIEWING_CALENDAR='https://www.kennedyspacecenter.com/launches-and-events/';
const NPS_SOURCE='https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm';
const FACILITIES=Object.freeze([
  Object.freeze({
    id:'kennedy',name:'Kennedy Space Center',shortName:'Kennedy',
    locationId:27,
    description:'The LC-39 launch area sits north of the Cape Canaveral Space Force Station pads. It includes LC-39A and LC-39B. The launch pad is restricted NASA property, not a visitor destination.',
    viewing:'Playalinda and Titusville are public viewing candidates, subject to current NPS and local rules. KSC visitor-center packages and bus access are announced for individual missions.',
    official:VIEWING_SOURCE
  }),
  Object.freeze({
    id:'cape',name:'Cape Canaveral Space Force Station',shortName:'Cape Canaveral',
    locationId:12,
    description:'The Cape contains Space Launch Complexes such as SLC-40 and SLC-41. Launch pads are restricted range facilities; public visitors do not drive to the pad.',
    viewing:'Port Canaveral, Cocoa Beach and the Titusville waterfront offer published public candidates. Kennedy visitor-center viewing and the Gantry are mission- and pad-dependent.',
    official:VIEWING_SOURCE
  })
]);

const FACILITY_BY_ID=new Map(FACILITIES.map(x=>[x.id,x]));
const RE_KSC=/(?:\bLC\s*-?\s*39\s*[A-C]\b|\bLAUNCH\s+COMPLEX\s+39\s*[A-C]\b)/i;
const RE_CAPE=/(?:\bSLC\s*-?\s*(?:40|41|36)\b|\bSPACE\s+LAUNCH\s+COMPLEX\s+(?:40|41|36)\b)/i;
const RE_GANTRY_EXCLUDED=/(?:\bLC\s*-?\s*39\s*[AB]\b|\bLAUNCH\s+COMPLEX\s+39\s*[AB]\b)/i;

function locationIdentity(launch){
  const raw=launch?.locationId??launch?.pad?.location?.id;
  const locationId=(typeof raw==='number'||typeof raw==='string')&&
    String(raw).trim()!==''?Number(raw):null;
  if(locationId===27)return 'kennedy';
  if(locationId===12)return 'cape';
  // A different explicit ID must never be overridden by a familiar pad name.
  if(Number.isInteger(locationId))return null;
  const label=String(launch?.location||launch?.pad?.location?.name||'');
  if(/Kennedy Space Center/i.test(label))return 'kennedy';
  if(/Cape Canaveral (?:Space Force Station|SFS)/i.test(label))return 'cape';
  const pad=String(typeof launch?.pad==='string'?launch.pad:launch?.pad?.name||'');
  if(RE_KSC.test(pad))return 'kennedy';
  if(RE_CAPE.test(pad))return 'cape';
  return null;
}

function launchPadName(launch){
  const pad=typeof launch?.pad==='string'?launch.pad:launch?.pad?.name;
  return typeof pad==='string'&&pad.trim()?pad.trim().slice(0,120):null;
}

function padRule(launch){
  const pad=launchPadName(launch);
  if(!pad)return {
    code:'pad-unverified',
    headline:'Pad not announced',
    note:'The range identity or a scheduled date does not establish a specific launch pad. The correct viewing options cannot yet be determined.',
    source:VIEWING_SOURCE
  };
  if(RE_GANTRY_EXCLUDED.test(pad))return {
    code:'gantry-excluded',
    headline:'The Gantry is not a viewing option for this pad',
    note:'Kennedy Space Center explicitly excludes LC-39A and LC-39B launches from its Gantry viewing area for safety. Do not buy admission assuming Gantry viewing is available.',
    source:VIEWING_SOURCE
  };
  return {
    code:'mission-confirm',
    headline:'Ticketed viewing depends on this mission',
    note:'A different launch pad does not automatically make the Gantry or Banana Creek available. Check Kennedy Space Center’s announcement for the specific launch and ticket type.',
    source:VIEWING_SOURCE
  };
}

function floridaLaunchNetwork(launches=[],selected=null){
  const roster=Array.isArray(launches)?launches:[];
  const groups=FACILITIES.map(facility=>{
    const matches=roster.filter(x=>locationIdentity(x)===facility.id);
    return {
      ...facility,
      countInFeed:matches.length,
      nextLaunchId:matches[0]?.id||null,
      note:matches.length?'Scheduled missions in the bounded shared feed.':'No upcoming mission for this facility in the bounded feed; not proof of no operations.'
    };
  });
  const facilityId=locationIdentity(selected);
  const facility=FACILITY_BY_ID.get(facilityId)||null;
  const rule=padRule(selected);
  return {
    selected: selected?{
      id:facilityId||'unverified',
      name:facility?.name||'Florida launch facility not verified',
      shortName:facility?.shortName||'Facility unverified',
      pad:launchPadName(selected),
      description:facility?.description||'The mission record does not establish which Florida range or pad is responsible. Confirm with the operator before choosing a viewing spot.',
      viewing:facility?.viewing||'Do not infer viewing access from a calendar entry.',
      padRule:rule
    }:null,
    facilities:groups,
    unassignedCount:roster.filter(x=>!locationIdentity(x)).length,
    references:{viewing:VIEWING_SOURCE,calendar:VIEWING_CALENDAR,nps:NPS_SOURCE},
    boundary:'Facility identity is derived from LL2 metadata, not a live range safety, ticket, beach-entry or weather determination.'
  };
}

module.exports={FACILITIES,locationIdentity,launchPadName,padRule,floridaLaunchNetwork,
  VIEWING_SOURCE,VIEWING_CALENDAR,NPS_SOURCE};
