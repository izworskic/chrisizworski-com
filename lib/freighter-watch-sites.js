'use strict';
// Human-reviewed, published public shore choices. Coordinates are NOAA/NWS shore
// forecast references, not parking, surveyed trails, or claims of ship visibility.
// Access hours are published general schedules, NOT checked closure notices.
const sites=Object.freeze({
  soo:{id:'soo',name:'Soo Locks observation platform',region:'Sault Ste. Marie, MI',
    address:'Soo Locks Park, 312 W Portage Ave, Sault Ste. Marie, MI',
    lat:46.503,lon:-84.353,zone:'America/Detroit',
    directionQuery:'Soo Locks Park Sault Ste Marie Michigan',
    accessUrl:'https://www.lrd.usace.army.mil/Missions/Recreation/Display/Article/3833525/soo-locks-visitor-center/',
    evidenceUrl:'/soo-locks/',notes:'Outdoor Soo Locks Park is year-round. The indoor Visitor Center operates May–October; outdoor park hours vary by season. Verify same-day USACE notices and parking.',
    hoursByMonth:[[9,18],[9,18],[9,18],[9,18],[9,21],[9,22],[9,22],[9,22],[9,21],[9,21],[9,18],[9,18]],
    hoursSource:'USACE Soo Locks Visitor Center official park schedule',reviewed:'2026-11-08',nearNm:2.5},
  duluth:{id:'duluth',name:'Duluth Ship Canal / Canal Park',region:'Duluth, MN',
    address:'600 Canal Park Dr, Duluth, MN',lat:46.779847,lon:-92.092464,zone:'America/Chicago',
    directionQuery:'Lake Superior Maritime Visitor Center Duluth Minnesota',
    accessUrl:'https://duluthmn.gov/parks/parks-trails/parks-listing/canal-park/',
    evidenceUrl:'/duluth-canal-park/',notes:'Use the public outdoor canal shore; the USACE Maritime Visitor Center has separate indoor hours. Check outdoor closures, waves and pier conditions.',
    hoursByMonth:null,hoursSource:'City of Duluth Canal Park listing; no current outdoor opening-hours determination',reviewed:'2026-11-08',nearNm:2.5},
  port:{id:'port',name:'Thomas Edison Parkway / Blue Water Bridge',region:'Port Huron, MI',
    address:'Thomas Edison Parkway, Port Huron, MI',lat:42.998,lon:-82.423,zone:'America/Detroit',
    directionQuery:'Thomas Edison Parkway Blue Water Bridge Port Huron MI',
    accessUrl:'https://www.porthuronrec.com/parks?comp-k9looxbs_page=2',
    evidenceUrl:'/great-lakes-freighter-tracking/',
    notes:'City-listed waterfront parkway with shoreline viewing. Exact observation point, parking and current closures must be checked locally. AIS near the river does not confirm a passage here.',
    hoursByMonth:null,hoursSource:'Port Huron Parks & Recreation park listing',reviewed:'2026-11-08',nearNm:3},
  mackinac:{id:'mackinac',name:'Alexander Henry Park',region:'Mackinaw City, MI',
    address:'Northern end of Henry Street, Mackinaw City, MI',lat:45.783,lon:-84.735,zone:'America/Detroit',
    directionQuery:'Alexander Henry Park Mackinaw City Michigan',
    accessUrl:'https://www.mackinawcity.org/services/parks-recreation',
    evidenceUrl:'/great-lakes-freighter-tracking/',
    notes:'Village-listed public park overlooking the bridge and Straits. Many shipping lanes are far from shore, so a nearby broad-area AIS report does not confirm a sighting.',
    hoursByMonth:null,hoursSource:'Village of Mackinaw City public parks',reviewed:'2026-11-08',nearNm:3},
  detroit:{id:'detroit',name:'Cullen Plaza / Detroit Riverwalk',region:'Detroit, MI',
    address:'Cullen Plaza, Detroit Riverwalk, Detroit, MI',lat:42.329,lon:-83.025,zone:'America/Detroit',
    directionQuery:'Cullen Plaza Detroit Riverwalk Detroit Michigan',
    accessUrl:'https://www.detroitriverfront.org/plan-your-visit/visitor-info/visitor-info',
    evidenceUrl:'/detroit-river-freighters/',
    notes:'Conservancy-managed Riverwalk public access. Published Riverwalk hours are 6 AM–10 PM; verify any event or construction closure. Ships may be out of sight around bends.',
    hoursByMonth:Array.from({length:12},()=>[6,22]),hoursSource:'Detroit Riverfront Conservancy published Riverwalk hours',reviewed:'2026-11-08',nearNm:3},
  saginaw:{id:'saginaw',name:'Wenonah Park riverfront',region:'Bay City, MI',
    address:'101 Center Ave, Bay City, MI 48708',lat:43.594,lon:-83.890,zone:'America/Detroit',
    directionQuery:'Wenonah Park 101 Center Ave Bay City Michigan',
    accessUrl:'https://www.baycitymi.gov/Facilities/Facility/Details/Wenonah-Park-28',
    evidenceUrl:'/great-lakes-freighter-tracking/',
    notes:'City riverfront park posted 7 AM–9 PM. Saginaw Bay AIS reports do not establish that a vessel will enter the Saginaw River or pass downtown.',
    hoursByMonth:Array.from({length:12},()=>[7,21]),hoursSource:'City of Bay City Wenonah Park official facility page',reviewed:'2026-11-08',nearNm:3}
});
function getSite(id){return Object.hasOwn(sites,id)?sites[id]:null;}
function publicSite(id) {
 const s=getSite(id);if(!s)return null;
 const {hoursByMonth,nearNm,...publicFields}=s;
 return {...publicFields,hoursByMonth:hoursByMonth||null,nearNm,
   directionsUrl:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.directionQuery),
   forecastUrl:'https://forecast.weather.gov/MapClick.php?lat='+s.lat+'&lon='+s.lon,
   accessProof:'Published general park/shore information, not real-time closure verification'};
}
module.exports={sites,getSite,publicSite};
