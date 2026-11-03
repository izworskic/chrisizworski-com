'use strict';
/**
 * Starbase public-viewing places and launch-access truth.
 * These are historical/public geographic references, NOT guaranteed
 * launch-day access, exact spectator positions or driving destinations
 * at the SpaceX range. The selected launch pad comes only from the LL2
 * mission, and can be unknown. Never geocode a restricted launch pad for
 * navigation, never equate general beach access with launch permission.
 * Sources checked: 2026-11-03.
 */
const ACCESS_URL='https://www.starbase.texas.gov/beach-road-access';
const TOURISM_URL='https://visitsouthpadreisland.com/spacex/';
const COUNTY_URL='https://www.cameroncountytx.gov/parks-home/';
const SITE_LIST=[
  {
    id:'isla-blanca',name:'Isla Blanca County Park',kind:'island-park',
    lat:26.071745,lon:-97.160249,
    coordinateRole:'USGS published park feature center — not parking or a guaranteed viewing position',
    geographicSource:'https://topoquest.com/place/texas/park/isla-blanca-park/1374243',
    address:'33174 State Park Rd 100 N, South Padre Island, TX 78597',
    operator:'Cameron County',accessSource:COUNTY_URL,
    viewingSource:TOURISM_URL,
    bestFor:'The closest documented public island park setting',
    scene:'At the southern tip of South Padre Island, the shoreline faces over Brazos Santiago Pass toward the Starbase range. This is the popular public gathering place, not an exclusive viewing platform.',
    accessNote:'Cameron County manages the park. Daily entrance fees, launch-event gate times and capacity can change. County park-office hours are not a verified launch-day entry schedule.',
    tradeoff:'Expect a congested Queen Isabella Causeway and park queues. The published park reference is not a signed parking entrance.',
    profiles:['first-time','family','coastal'],requiresEventCheck:true
  },
  {
    id:'zapata',name:'Jaime J. Zapata Memorial Boat Ramp',kind:'mainland-ramp',
    lat:26.001798,lon:-97.298535,
    coordinateRole:'US Department of Energy public environmental photo location at the boat ramp — not parking entrance',
    geographicSource:'https://www.energy.gov/sites/default/files/2019/07/f64/final-eis%20-0518-annova-lng-brownville-project-vol-2-2019-04.pdf',
    address:'44270 State Hwy 48, Brownsville, TX 78521',
    operator:'Cameron County',accessSource:COUNTY_URL,
    viewingSource:'https://www.cameroncountytx.gov/parks-home/',
    bestFor:'A county-managed mainland reference without crossing to South Padre',
    scene:'On the mainland side of the Laguna Madre region, this county boat-ramp facility offers an alternative to island access. The listed feature location is not a surveyed rocket sightline.',
    accessNote:'Cameron County lists this facility. Current opening hours, launch-specific parking rules and unobstructed pad visibility have not been independently confirmed.',
    tradeoff:'A farther reference can be an easier mainland plan, but this does not establish road travel time, night entry or a usable launch sightline.',
    profiles:['no-causeway','flexible'],requiresEventCheck:true
  },
  {
    id:'lighthouse',name:'Port Isabel Lighthouse historic site',kind:'historic-site',
    lat:26.077984,lon:-97.207133,
    coordinateRole:'Texas Historical Commission published historic-site reference, not a launch-watching platform',
    geographicSource:'https://www.thc.texas.gov/public/upload/publications/Port%20Isabel%20Lighthouse_Rack%20Card.pdf',
    address:'421 East Queen Isabella Blvd, Port Isabel, TX 78578',
    operator:'City of Port Isabel / Texas Historical Commission',
    accessSource:'https://atlas.thc.texas.gov/Details/4200001068',
    viewingSource:'https://portisabellighthouse.com/lighthouse/',
    bestFor:'Combine a Port Isabel visit with a mainland launch-watch plan',
    scene:'The nineteenth-century lighthouse recalls when this channel was navigated by a lamp rather than a launch computer. The historic site is a land reference, not a confirmed rocket-viewing terrace.',
    accessNote:'Climbing the lighthouse is ticketed and governed by published daytime or seasonal tour hours. Never assume access to the top, or public grounds, for a night launch.',
    tradeoff:'Choose this for a cultural day stop. It has no mission-specific viewing authorization or proven unobstructed line of sight.',
    profiles:['history','no-causeway'],requiresEventCheck:true
  }
];
const SITES=Object.freeze(SITE_LIST.map(x=>Object.freeze({...x,profiles:Object.freeze([...x.profiles])})));
const PROFILES=Object.freeze({
  'first-time':{name:'First launch',description:'Start with the county park that South Padre Island tourism specifically identifies for Starship spectators. Budget for queueing and verify the gate.'},
  'no-causeway':{name:'Avoid the island bridge',description:'Consider mainland county/public references, but their opening and direct sightlines are not verified for the selected launch.'},
  'history':{name:'Make a day of it',description:'Explore Port Isabel heritage as a daytime outing, not an assurance that the lighthouse is open during a launch.'},
});
const sourceDate='2026-11-03';
function safePad(launch){
  const lat=Number(launch?.lat),lon=Number(launch?.lon);
  if(launch?.region!=='texas'||launch?.lat==null||launch?.lon==null ||
     !Number.isFinite(lat)||!Number.isFinite(lon)||lat<25.85||lat>26.15||lon< -97.4||lon> -97.05)return null;
  return {lat,lon,name:String(launch.pad||'Starbase launch pad').slice(0,90),
    role:'Restricted launch pad as listed by Launch Library 2 — no public entry'};
}
function noticeVerdict(source,now=Date.now()){
  const checkedAt=Date.parse(source?.checkedAt||'');
  if(!Number.isFinite(checkedAt)||checkedAt>now+60000||now-checkedAt>90*60000)
    return {state:'unknown',label:'Official access check unavailable or stale',
      detail:'An old or failed notice is not evidence of a current beach or road opening.',checkedAt:source?.checkedAt||null};
  if(source.state==='closed')
    return {state:'closed',label:'City notice: Boca Chica Beach closed',
      detail:'Current city beach closure is reported. Do not try to reach Boca Chica or the launch range for spectator viewing.',checkedAt:source.checkedAt};
  if(source.state==='open-general')
    return {state:'general-open',label:'City notice: beach generally open',
      detail:'This reports general beach access at the check time, NOT an authorized launch viewing position, road clearance during operations or future opening.',checkedAt:source.checkedAt};
  return {state:'unknown',label:'Current beach status not confirmed',
    detail:'The city feed could not be interpreted safely. Check the official notice before visiting the area.',checkedAt:source.checkedAt};
}
function haversineMiles(a,b){
  if(!a||!b)return null;
  const rad=x=>x*Math.PI/180, R=3958.7613;
  const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);
  const v=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
  return R*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));
}
function bearingDegrees(a,b){
  if(!a||!b)return null;
  const rad=x=>x*Math.PI/180,y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat));
  const x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon));
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function viewOptions(profile='first-time',launch=null){
  const selected=PROFILES[profile]?profile:'first-time';
  const pad=safePad(launch);
  return SITES.map((site,i)=>({
    ...site,
    padDistanceMiles:pad?haversineMiles(site,pad):null,
    padBearingDegrees:pad?bearingDegrees(site,pad):null,
    status:'published-place-not-live-opening',
    rank:(site.profiles.includes(selected)?0:10)+i,
    caveat:'No site on this list has verified launch-day parking, ticket or physical sightline.'
  })).sort((a,b)=>a.rank-b.rank);
}
module.exports={SITES,PROFILES,ACCESS_URL,TOURISM_URL,COUNTY_URL,
  sourceDate,safePad,noticeVerdict,haversineMiles,bearingDegrees,viewOptions};
