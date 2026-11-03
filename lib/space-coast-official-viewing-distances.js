'use strict';

/**
 * KSC's own published reference distances, not calculated driving distances,
 * forecast visibility, live safety clearance or admission availability.
 *
 * Source: https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/
 * Source checked: 2026-11-03. Source may change; review against KSC regularly.
 *
 * Distances apply to the source's NAMED launch pads only. Unknown pad names
 * MUST NOT borrow a distance from a nearby or similarly named facility.
 */
const SOURCE='https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/';
const SITES=Object.freeze([
  {
    id:'visitor-complex',name:'Main Visitor Complex',sourceLabel:'Atlantis North Lawn',
    description:'KSC says the rocket becomes visible after it rises above the tree line. Ordinary visitor admission is not a mission-specific viewing commitment.',
    distances:Object.freeze({'SLC-41':7.1,'SLC-40':6.7,'LC-39A':7.5})
  },
  {
    id:'banana-creek',name:'Banana Creek / Apollo-Saturn V Center',
    sourceLabel:'Apollo/Saturn V Center',
    description:'Bleachers and a lawn overlooking Banana Creek; use the KSC-assigned bus and confirm whether the center is open for this exact launch.',
    distances:Object.freeze({'SLC-41':5.4,'SLC-40':6.2,'LC-39A':3.9})
  },
  {
    id:'gantry',name:'The Gantry at LC-39',sourceLabel:'LC-39 Gantry',
    description:'A separate KSC-managed venue for some Cape launches. Never drive directly through NASA gates or assume a launch admission package exists.',
    distances:Object.freeze({'SLC-41':2.3,'SLC-40':3.4}),
    excluded:Object.freeze(['LC-39A','LC-39B'])
  }
]);

function recognizedPad(input) {
  const text=String(typeof input==='string'?input:
    typeof input?.pad==='string'?input.pad:input?.pad?.name||'').trim();
  if(!text)return null;
  // Canonicalize only the known official pad labels, not the vehicle or provider.
  // LC-39A/B/C must not get conflated; different pad => unknown distance.
  const ksc=/(?:\bLC\s*-?\s*39\s*([AB])\b|\bLAUNCH\s+COMPLEX\s+39\s*([AB])\b|\bPAD\s+39\s*([AB])\b)/i.exec(text);
  if(ksc)return 'LC-39'+(ksc[1]||ksc[2]||ksc[3]).toUpperCase();
  const cape=/(?:\bSLC\s*-?\s*(40|41)\b|\bSPACE\s+LAUNCH\s+COMPLEX\s+(40|41)\b)/i.exec(text);
  if(cape)return 'SLC-'+(cape[1]||cape[2]);
  return null;
}

function officialViewingDistances(launch) {
  const pad=recognizedPad(launch);
  const published=pad && ['LC-39A','SLC-40','SLC-41'].includes(pad);
  const venues=SITES.map(site=>{
    const excluded=site.excluded?.includes(pad)===true;
    const miles=pad && Object.hasOwn(site.distances,pad)?site.distances[pad]:null;
    return {
      id:site.id,name:site.name,sourceLabel:site.sourceLabel,
      distanceMiles:excluded?null:miles,
      state:excluded?'pad-excluded':miles!==null?'published-distance':'not-published',
      distanceType:'KSC published approximate distance, not walking or driving',
      accessState:excluded?'not-eligible-for-this-pad':'mission-announcement-required',
      description:excluded?
        'Kennedy Space Center explicitly excludes Gantry viewing for LC-39A and LC-39B due to safety restrictions.' :
        site.description,
      sourceUrl:SOURCE
    };
  });
  return {
    sourceUrl:SOURCE,sourceType:'KSC official published venue distances',
    padCode:pad,padName:typeof launch?.pad==='string'?launch.pad:
      typeof launch?.pad?.name==='string'?launch.pad.name:null,
    status:published?'pad-distance-published':pad==='LC-39B'?'restricted-pad-no-distance':'pad-distance-unverified',
    venues,
    closestPublished:venues.filter(v=>v.distanceMiles!==null)
      .sort((a,b)=>a.distanceMiles-b.distanceMiles)[0]?.id||null,
    notice:'A KSC-published mileage reference measures proximity, not an unobstructed view, an opening, ticket inventory, legal access, a road route, or flight trajectory. Follow the mission-specific KSC notice.',
    checkedDate:'2026-11-03'
  };
}
module.exports={SOURCE,SITES,recognizedPad,officialViewingDistances};
