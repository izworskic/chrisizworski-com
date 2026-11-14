'use strict';

const { isFutureLaunch, normalizeLaunch, VIEWPOINTS } = require('./space-coast-decision');

const REGION_LIST = [
  {
    id: 'california', name: 'Vandenberg', subtitle: 'California Central Coast',
    coast: 'Pacific', ids: [11], lat: 34.74, lon: -120.57,
    timezone: 'America/Los_Angeles', precision: 'Pad-specific launch times and local marine-layer forecast',
    description: 'Falcon 9 rockets climb south over the Pacific from the hills near Lompoc. The marine layer can hide the first moments, and a close beach isn’t much use if it’s closed. Look for an open view of the southern sky.',
    authority: 'https://www.vandenberg.spaceforce.mil/News/',
    access: 'https://www.vandenberg.spaceforce.mil/About-Us/Environmental/',
    specialist: '/vandenberg-rocket-launch-viewing/',
    alert: 'https://public.govdelivery.com/accounts/USDODSFVANDENBERGPA/subscriber/new',
    context: 'Vandenberg does not provide a guaranteed public pad viewing area. Surf Beach has published 8 a.m.–6 p.m. hours and may close for launches.',
    weatherPoints: [
      { id: 'lompoc', name: 'Lompoc', lat: 34.6392, lon: -120.4579 },
      { id: 'surf', name: 'Surf Beach vicinity', lat: 34.6859, lon: -120.6058 }
    ],
    sites: [
      {
        id: 'west-ocean', name: 'West Ocean Avenue', address: 'West Ocean Ave and Floradale Ave, Lompoc, CA',
        kind: 'public-check', bestFor: 'Open sky without entering the base',
        note: 'Explore Lompoc describes several roadside vantage points. Pull completely off the roadway, avoid blocking traffic and recheck launch security restrictions.',
        source: 'https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/'
      },
      {
        id: 'ocean-park', name: 'Ocean Park', address: '6851 Ocean Park Road, Lompoc, CA',
        kind: 'public-check', bestFor: 'Coastal sound and the rocket after it clears the horizon',
        note: 'Limited parking; the access road closes when the lot is full. Park hours and return-to-base launch closures require confirmation.',
        source: 'https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/'
      },
      {
        id: 'surf-beach', name: 'Surf Beach', address: 'Surf Beach, Lompoc, CA',
        kind: 'daytime-beach', bestFor: 'A close public shoreline when official access is permitted',
        note: 'Official base beach guidance lists 8 a.m.–6 p.m. daily. Beach and access restrictions can change for launches, wildlife and hazardous operations.',
        source: 'https://www.vandenberg.spaceforce.mil/About-Us/Environmental/'
      },
      {
        id: 'beattie-park', name: 'Beattie Park', address: 'Beattie Park, Lompoc, CA',
        kind: 'public-check', bestFor: 'A lower-stress family gathering spot',
        note: 'The Lompoc tourism guide lists the park as a viewing alternative. Rockets may only be seen after ascending above local terrain; park hours are not verified.',
        source: 'https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/'
      }
    ]
  },
  {
    id: 'florida', name: 'Florida Space Coast', subtitle: 'Cape Canaveral & Kennedy',
    coast: 'Atlantic', ids: [12, 27], lat: 28.58, lon: -80.61,
    timezone: 'America/New_York', description: 'From the Titusville waterfront to the beaches near Port Canaveral, Florida offers plenty of places to watch a rocket rise over the Atlantic. Your best spot depends on the pad; check Playalinda closures and Kennedy’s event tickets before leaving.',
    authority: 'https://www.kennedyspacecenter.com/launches-and-events/',
    access: 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
    context: 'For Kennedy launches, consider the Titusville waterfront. For Cape Canaveral launches, consider Port Canaveral. Playalinda can close for launch security; KSC viewing requires an exact-mission announcement.',
    specialist: '/national-tools/space-coast-launch/',
    // Same two spectator grids the Florida engine forecasts (api/space-coast-launch.js),
    // so the national sky card and delay scenarios agree with the Florida page.
    weatherPoints: [
      { id: 'titusville', name: 'Space View Park (Titusville)', lat: 28.6139417, lon: -80.8037278 },
      { id: 'port-canaveral', name: 'Jetty Park (Port Canaveral)', lat: 28.407304, lon: -80.591899 }
    ],
    // Public sites are shared with the Florida engine. No separate inventory.
    sites: [
      ['space-view','public-check','Titusville public waterfront'],
      ['rotary','public-check','Titusville public waterfront alternative'],
      ['jetty','port-hours','Port Canaveral park with launch-dependent hours'],
      ['playalinda-south','conditional-nps','Conditional NPS beach; launch safety closures possible'],
      ['ksc-visitor','ticketed','KSC visitor venue; mission-specific ticket or event required']
    ].map(([id,kind,bestFor])=>{
      const v=VIEWPOINTS.find(p=>p.id===id);
      if(!v)throw Error('Missing authoritative Florida viewing site: '+id);
      return {id:v.id,name:v.name,address:v.address,kind,bestFor,
        note:v.summary,source:v.source,
        noDirections:kind==='conditional-nps'||kind==='ticketed'};
    })
  },
  {
    id: 'texas', name: 'Starbase', subtitle: 'South Texas Gulf Coast',
    coast: 'Gulf', ids: [143], lat: 25.997, lon: -97.157,
    timezone: 'America/Chicago', description: 'Starship lifts off near Boca Chica, and many spectators watch from across the water on South Padre Island. It’s a striking view, but Highway 4 and the beach can close for launches and tests.',
    authority: 'https://www.starbase.texas.gov/beach-road-access',
    access: 'https://www.starbase.texas.gov/beach-road-access',
    specialist: '/starbase-rocket-launch-viewing/',
    context: 'Use the City of Starbase’s current published beach and road notices. A beach-open message does not authorize entry through a flight safety closure.',
    weatherPoints: [
      { id: 'south-padre', name: 'South Padre Island', lat: 26.0740, lon: -97.1660 },
      { id: 'port-isabel', name: 'Port Isabel', lat: 26.0734, lon: -97.2086 }
    ],
    sites: [
      {
        id: 'isla-blanca', name: 'Isla Blanca Park', address: 'Isla Blanca Park, South Padre Island, TX',
        kind: 'public-check', bestFor: 'Across-water Starship launch viewing',
        note: 'South Padre Island tourism identifies this as a popular public viewing place. Parking fees, capacity and access can change; the launch site is across the water.',
        source: 'https://visitspi.com/attractions/spacex/'
      },
      {
        id: 'port-isabel', name: 'Port Isabel area', address: 'Port Isabel, TX',
        kind: 'public-check', bestFor: 'An alternative to the park’s crowded approach',
        note: 'Some waterfront viewpoints are private or paid. Verify an authorized public location rather than stopping on a bridge or road shoulder.',
        source: 'https://visitspi.com/attractions/spacex/', noDirections: true
      },
      {
        id: 'boca-chica', name: 'Boca Chica Beach & Highway 4', address: 'Boca Chica Beach, Starbase, TX',
        kind: 'range-restricted', bestFor: 'Not a reliable place to watch a launch',
        note: 'The official access notice controls. Launch and testing exclusion zones can close the beach and Highway 4; do not travel into the range hoping to watch liftoff.',
        source: 'https://www.starbase.texas.gov/beach-road-access', noDirections: true
      }
    ]
  },
  {
    id: 'virginia', name: 'Wallops Island', subtitle: 'Virginia Eastern Shore',
    coast: 'Atlantic', ids: [21], lat: 37.84, lon: -75.48,
    timezone: 'America/New_York', description: 'Watch a rocket streak above Virginia’s marshes and the Chincoteague waterfront. Sounding rockets can be gone in seconds. NASA opens its Visitor Center viewing area for selected launches, so check the event notice before you go.',
    authority: 'https://www.nasa.gov/wallops-launch-schedule/',
    access: 'https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/',
    specialist: '/wallops-rocket-launch-viewing/',
    context: 'Wallops viewing places: NASA Wallops Visitor Center (when NASA opens its viewing lawn for this launch), Robert N. Reed Downtown Waterfront Park, and Curtis Merritt Harbor. The two Chincoteague waterfronts are public alternatives, not launch-day parking guarantees. Choose a place and check Google Maps and official restrictions below.',
    weatherPoints: [
      { id: 'wallops', name: 'Wallops Visitor Center', lat: 37.9395, lon: -75.4664 },
      { id: 'chincoteague', name: 'Chincoteague waterfront', lat: 37.9348, lon: -75.3743 }
    ],
    sites: [
      {
        id: 'wallops-visitor', name: 'NASA Wallops Visitor Center', address: '175 Chincoteague Road, Wallops Island, VA',
        kind: 'mission-confirm', bestFor: 'Official range audio and one of the clearest public pad views',
        note: 'Launch-viewing opening is event-specific. NASA requires security and bag checks, no pets (except service animals), and first-come parking; never assume regular museum hours apply.',
        source: 'https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/'
      },
      {
        id: 'chincoteague-park', name: 'Robert N. Reed Sr. Downtown Waterfront Park', address: 'Robert Reed Waterfront Park, Chincoteague, VA',
        kind: 'public-check', bestFor: 'A community waterfront alternative',
        note: 'NASA names this downtown Chincoteague viewpoint. Local event restrictions, parking and sightlines require confirmation.',
        source: 'https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/'
      },
      {
        id: 'curtis-merritt', name: 'Curtis Merritt Harbor', address: 'Curtis Merritt Harbor, Chincoteague, VA',
        kind: 'public-check', bestFor: 'An alternate shoreline if the visitor center reaches capacity',
        note: 'NASA lists this area, but launch security and local traffic instructions can supersede normal public access.',
        source: 'https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/'
      }
    ]
  },
  {
    id: 'alaska', name: 'Kodiak', subtitle: 'Pacific Spaceport Complex',
    coast: 'Pacific', ids: [25], lat: 57.43, lon: -152.34,
    timezone: 'America/Anchorage', description: 'Kodiak’s launch range sits on a wild Pacific headland, far from a busy tourist spaceport. This is an active restricted facility; nearby roads and beaches can close during operations, and public launch viewing is not confirmed.',
    authority: 'https://akaerospace.com/',
    access: 'https://akaerospace.com/beyond-launch',
    specialist: '/kodiak-rocket-launch-viewing/',
    context: 'Alaska Aerospace says launch facilities are closed to the public and surrounding land may close during hazardous operations. No launch-day public viewing site has been independently confirmed.',
    weatherPoints: [],
    sites: [
      {
        id: 'narrow-cape', name: 'Narrow Cape & Fossil Beach', kind: 'range-restricted',
        bestFor: 'Research access restrictions, not a launch-day destination',
        note: 'The surrounding land can close for range safety, including the Fossil Beach road approach. A previous event’s access permissions do not establish current entry.',
        source: 'https://akaerospace.com/beyond-launch', noDirections: true
      }
    ]
  },
  {
    id: 'hawaii', name: 'Barking Sands', subtitle: 'Kauaʻi, Hawaiʻi',
    coast: 'Pacific', ids: [1], lat: 22.02, lon: -159.78,
    timezone: 'Pacific/Honolulu', description: 'Barking Sands sits on Kauaʻi’s western shore, where the Navy runs a working test range. The beaches may look inviting, but access around an operation is tightly controlled and there is no confirmed public launch-viewing area.',
    authority: 'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/',
    access: 'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/',
    specialist: '/barking-sands-rocket-launch-viewing/',
    context: 'The Navy distinguishes designated public shoreline from restricted federal property and can close beach access without notice for range hazards. No public launch viewing area is verified.',
    weatherPoints: [],
    sites: [
      {
        id: 'pmrf-shore', name: 'PMRF designated shoreline', kind: 'range-restricted',
        bestFor: 'Confirm range and beach access with the Navy',
        note: 'General public beach access is not permission to observe an active range launch. Do not cross restricted-area signs or use a guessed launch-viewing route.',
        source: 'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/',
        noDirections: true
      }
    ]
  }
];

const REGIONS = Object.freeze(REGION_LIST.map(r => Object.freeze(r)));
const LOCATION_TO_REGION = new Map(REGIONS.flatMap(r => r.ids.map(id => [id, r.id])));
const ALLOWED_REGION_IDS = new Set(REGIONS.map(r => r.id));
const ACTIVE_STATUS = /hold|scrub/i;

function regionForLaunch(raw) {
  return LOCATION_TO_REGION.get(Number(raw?.pad?.location?.id)) || null;
}
function normalizeUsLaunch(raw, now = Date.now()) {
  const region = regionForLaunch(raw);
  if (!region || !isFutureLaunch(raw, now)) return null;
  const launch = normalizeLaunch(raw);
  // Never publish unlicensed LL2 image URLs or model IDs that could imply tickets.
  return { ...launch, region, source: 'Launch Library 2',
    timeEvidence: ['minute', 'second'].includes(launch.netPrecision) ? 'minute-level target, not guaranteed' :
      launch.scheduleConfidence?.detail || 'time unconfirmed' };
}
function isTrustedCode(value) { return typeof value === 'string' && ALLOWED_REGION_IDS.has(value); }
function localClock(iso, timezone) {
  const millis = Date.parse(iso || '');
  if (!Number.isFinite(millis)) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(millis));
  return {
    hour: Number(parts.find(p => p.type === 'hour')?.value),
    minute: Number(parts.find(p => p.type === 'minute')?.value)
  };
}
function sourceLink(url) {
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) return url;
  try { const u = new URL(url); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}
function parseStarbaseAccess(html, checkedAt = new Date().toISOString()) {
  const source = String(html || '');
  if (source.length < 1000 || source.length > 250000) {
    return { state: 'unknown', roadState: 'unknown', description: null, checkedAt,
      url: 'https://www.starbase.texas.gov/beach-road-access' };
  }
  const beach = source.match(/id=["']beach-closure["'][\s\S]{0,2600}?<div[^>]*class=["'][^"']*cms-big-text[^"']*["'][^>]*>([^<]{1,200})</i);
  const status = beach?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const state = /\bboca chica beach is closed\b/i.test(status) ? 'closed' :
    /\bboca chica beach is open\b/i.test(status) ? 'open-general' : 'unknown';
  const road = source.match(/id=["']road-closure["'][\s\S]{0,2600}?<div[^>]*class=["'][^"']*cms-big-text[^"']*["'][^>]*>([^<]{1,180})</i);
  const roadText = road?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const roadState = /^road delay|^road closure/i.test(roadText) ? 'advisory' : 'unknown';
  const detail = source.match(/id=["']road-closure["'][\s\S]{0,3000}?<div[^>]*class=["'][^"']*cms-small-text-api[^"']*["'][^>]*>([\s\S]{0,550}?)<\/div>/i);
  const description = detail ? detail[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350) : null;
  return { state, roadState, description: description || null,
    checkedAt, url: 'https://www.starbase.texas.gov/beach-road-access' };
}
function viewDecision(region, site, launch, extra = {}) {
  const source = sourceLink(site.source);
  const base = { ...site, source, state: 'verify', label: 'Launch-specific entry unverified',
    reason: site.note, checkedAt: null, directionsAllowed: Boolean(site.address && !site.noDirections),
    // Finding the publicly documented visitor-center building on a map is
    // different from claiming admission for this specific launch. Never map
    // a restricted range gate, pad, closed beach or ticket-only venue here.
    mapsLocationAllowed: Boolean(site.address && !site.noDirections &&
      site.kind !== 'range-restricted' && site.kind !== 'specialist' &&
      site.kind !== 'ticketed' && site.kind !== 'conditional-nps' &&
      (site.kind !== 'mission-confirm' ||
       (region.id === 'virginia' && site.id === 'wallops-visitor'))) };
  if (site.kind === 'specialist') return { ...base, state: 'specialist', label: 'Detailed regional engine available',
    reason: 'Use the Florida specialist for current NPS alerts, Kennedy tickets and local sky forecasts.',
    directionsAllowed: false };
  if (site.kind === 'range-restricted') return { ...base, state: 'restricted',
    label: 'Do not treat as launch viewing access', directionsAllowed: false, mapsLocationAllowed: false };
  const exact = ['minute', 'second'].includes(launch?.netPrecision);
  const clock = exact ? localClock(launch.net, region.timezone) : null;
  if (site.kind === 'daytime-beach' && clock &&
    (clock.hour < 8 || clock.hour >= 18)) return {
    ...base, state: 'hours', label: 'Outside published beach hours',
    reason: 'Official Vandenberg guidance lists Surf Beach hours of 8 a.m.–6 p.m. A special launch exception has not been verified.',
    directionsAllowed: false, mapsLocationAllowed: false
  };
  if (site.kind === 'mission-confirm') return { ...base, state: 'mission',
    label: 'NASA must announce launch-specific opening',
    reason: 'The visitor center is not automatically open for each rocket or late-night launch. Check NASA’s exact launch event before driving.',
    directionsAllowed: false };
  if (site.kind === 'public-check') return { ...base, state: 'candidate',
    label: 'Public viewing candidate; recheck access',
    reason: site.note };
  return base;
}
function regionalAccess(region, launch, extra = {}) {
  const views = region.sites.map(site => viewDecision(region, site, launch, extra));
  return {
    status: 'not-live-certified',
    source: region.access, checkedAt: extra.starbase?.checkedAt || null,
    liveOfficialNotice: region.id === 'texas' ? extra.starbase || null : null,
    sites: views,
    guidance: region.context,
    note: 'Publicly listed viewing locations are candidates, not access guarantees. Weather and launch status do not override road closures or security restrictions.'
  };
}
function groupedSchedule(launches) {
  return REGIONS.map(r => ({
    id: r.id, name: r.name, subtitle: r.subtitle, coast: r.coast,
    lat: r.lat, lon: r.lon, timezone: r.timezone, description: r.description,
    authority: r.authority, access: r.access, specialist: r.specialist || null,
    launches: launches.filter(l => l.region === r.id)
  }));
}

module.exports = {
  REGIONS, LOCATION_TO_REGION, regionForLaunch, normalizeUsLaunch,
  isTrustedCode, localClock, sourceLink, parseStarbaseAccess,
  viewDecision, regionalAccess, groupedSchedule
};