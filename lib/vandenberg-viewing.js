'use strict';

/**
 * Vandenberg spectator decision pilot: published venue facts + OSM surveyed
 * park/campus centers + mission-specific LL2 pad position + NOAA solar math.
 * Access is never characterized as cleared from static listings. Distances are
 * geodesics, NOT driving, walking, elevation, line-of-sight or trajectory.
 * Weather references are proximity-mapped pre-existing NWS forecasts and
 * MUST NOT be called a forecast at the individual site or a launch GO.
 */
const TOURISM='https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/';
const BEACH='https://www.vandenberg.spaceforce.mil/About-Us/Environmental/';
const COLLEGE='https://www.hancockcollege.edu/police/parking.php';
const OSM='https://www.openstreetmap.org/';
const TIMEZONE='America/Los_Angeles';
const OFFSETS=[0,1,3,6];
const RAD=Math.PI/180;
const SITES=Object.freeze([
  {id:'ocean-park',name:'Ocean Beach Park',lat:34.6895280,lon:-120.5992314,
    osm:OSM+'way/44580742',address:'6851 Ocean Park Road, Lompoc, CA',
    source:TOURISM,accessSource:BEACH,kind:'park-sunset',
    scene:'Close coastal atmosphere after liftoff, no direct pad view. Small parking area; road can close once full.',
    accessNote:'Park open dawn to dusk. Parking fills, access road can be closed during launches; this is not a live opening report.',
    affinities:{family:3,photo:3,close:5},amenities:'Parking and restrooms reported by Explore Lompoc',
    pinLabel:'Coast park',park:'Coastal day-use park'},
  {id:'surf-station',name:'Surf Beach / Surf Station',lat:34.6825853,lon:-120.6050676,
    osm:OSM+'node/1112397161',address:'Amtrak Surf Station, Lompoc, CA',
    source:TOURISM,accessSource:BEACH,kind:'surf-hours',
    scene:'Close to the launch complex when public beach access is available. Stay outside base boundaries and posted nesting closures.',
    accessNote:'Vandenberg lists Surf Beach 8 a.m.–6 p.m. daily, but flight operations and protected nesting areas may restrict access. Cross railroad tracks only at permitted crossings.',
    affinities:{family:1,photo:4,close:5},amenities:'Limited parking at station; no guarantee during launch security closures',
    pinLabel:'Beach access',park:'Military-adjacent public beach'},
  {id:'hancock',name:'Allan Hancock College — Lompoc',lat:34.6793643,lon:-120.4645477,
    osm:OSM+'way/549619442',address:'1 Hancock Drive, Lompoc, CA 93436',
    source:TOURISM,accessSource:COLLEGE,kind:'college',
    scene:'Partial view of the pad, where terrain allows, with room for a camera or binoculars.',
    accessNote:'Campus parking requires a permit during published enforcement periods; the college lists $2 daily parking permits. Campus availability for a particular launch has not been confirmed.',
    affinities:{family:3,photo:5,close:2},amenities:'Restrooms, accessible facilities and paid parking listed by Explore Lompoc',
    pinLabel:'College site',park:'Public college campus; parking regulated'},
  {id:'riverbend',name:'Riverbend Park',lat:34.6675675,lon:-120.4466363,
    osm:OSM+'way/546639471',address:'N A Street and McLaughlin Road, Lompoc, CA',
    source:'https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/98/242',
    accessSource:TOURISM,kind:'city-park',
    scene:'Open sports fields and flexible family gathering space. The pad itself is not visible.',
    accessNote:'Weekend sports can fill parking. Park hours and event access are not verified for this launch.',
    affinities:{family:5,photo:2,close:2},amenities:'Open fields, parking and group facilities from City of Lompoc',
    pinLabel:'Family park',park:'City park, field availability varies'},
  {id:'beattie',name:'Beattie Park',lat:34.6313870,lon:-120.4430514,
    osm:OSM+'way/44580932',address:'East Olive Avenue and S 5th Street, Lompoc, CA',
    source:'https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/91/109',
    accessSource:TOURISM,kind:'city-park',
    scene:'A broad park and elevated outlook over the valley; a convenient family-oriented option, not a confirmed pad sightline.',
    accessNote:'Some park areas are wooded or below the ridgeline. Public hours for this launch are not verified; follow posted rules.',
    affinities:{family:5,photo:3,close:1},amenities:'Playground, picnic facilities and lookout point listed by City of Lompoc',
    pinLabel:'Valley park',park:'City park'},
  {id:'ryon',name:'Ryon Memorial Park',lat:34.6377533,lon:-120.4678383,
    osm:OSM+'way/29088644',address:'800 West Ocean Avenue, Lompoc, CA 93436',
    source:'https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/99/109',
    accessSource:TOURISM,kind:'city-park',
    scene:'An easy downtown lawn and picnic option; rocket becomes visible after rising above terrain.',
    accessNote:'Park hours and launch-event access have not been verified; favor open lawns away from trees.',
    affinities:{family:5,photo:2,close:2},amenities:'Picnic areas, playground and fields listed by City of Lompoc',
    pinLabel:'Town park',park:'City park'}
]);
const CLOSED=Object.freeze([
 'Top of Harris Grade Road','Hawk’s Nest (Camellia / Azalea lanes)',
 'Marshallia Ranch Road','Highway 246 launch-viewing pullouts'
]);
function validGeo(lat,lon){
  return Number.isFinite(lat)&&Number.isFinite(lon)&&
    lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
}
function distanceBearing(a,b){
  if(!a||!b||!validGeo(a.lat,a.lon)||!validGeo(b.lat,b.lon))return null;
  const p1=a.lat*RAD,p2=b.lat*RAD,dl=(b.lon-a.lon)*RAD;
  const h=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  const mi=3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  const y=Math.sin(dl)*Math.cos(p2);
  const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return {miles:Math.round(mi*10)/10,
    bearing:Math.round((Math.atan2(y,x)/RAD+360)%360)%360};
}
function compass(bearing){
  if(!Number.isFinite(bearing))return null;
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8];
}
function solarElevation(iso,lat,lon){
  const t=Date.parse(iso||'');
  if(!Number.isFinite(t)||!validGeo(lat,lon))return null;
  const d=new Date(t),year=d.getUTCFullYear();
  const start=Date.UTC(year,0,1);
  const day=Math.floor((t-start)/86400000)+1;
  const hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
  const leap=(year%4===0&&(year%100!==0||year%400===0));
  const gamma=2*Math.PI/(leap?366:365)*(day-1+(hour-12)/24);
  const eqtime=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-
    0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
  const decl=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-
    0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-
    0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
  const tst=(hour*60+eqtime+4*lon+1440)%1440;
  const ha=(tst/4-180)*RAD;
  const p=lat*RAD;
  const elev=Math.asin(Math.sin(p)*Math.sin(decl)+Math.cos(p)*Math.cos(decl)*Math.cos(ha))/RAD;
  return Math.round(elev*10)/10;
}
function localMinutes(iso){
  const n=Date.parse(iso||'');
  if(!Number.isFinite(n))return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TIMEZONE,hour:'2-digit',
    minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(n));
  const h=Number(parts.find(x=>x.type==='hour')?.value);
  const m=Number(parts.find(x=>x.type==='minute')?.value);
  return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null;
}
function accessAt(site,iso){
  const minutes=localMinutes(iso);
  if(minutes===null)return {state:'time-unknown',directionsAllowed:false,
    label:'Launch time is not precise; access hours cannot be assessed'};
  if(site.kind==='surf-hours'&&(minutes<480||minutes>=1080))
    return {state:'after-hours',directionsAllowed:false,
      label:'Outside Vandenberg Surf Beach public hours (8 a.m.–6 p.m.)'};
  if(site.kind==='park-sunset'){
    const elev=solarElevation(iso,site.lat,site.lon);
    // The astronomical -0.833 degree sunset and local terrain are approximate.
    // For 2-degree twilight margin WITHHOLD any park entry advice.
    if(elev!==null&&elev<=-2)return {state:'after-hours',directionsAllowed:false,
      label:'After approximate sunset; Ocean Park closes at dusk'};
    if(elev===null||elev<2)return {state:'boundary',directionsAllowed:false,
      label:'Near sunset or solar evidence missing; verify park closure'};
  }
  return {state:'verify',directionsAllowed:true,
    label:'Candidate only · launch-day access unconfirmed'};
}
function selectedPad(launch){
  const lat=launch?.lat,lon=launch?.lon;
  if(!Number.isInteger(Number(launch?.padId))||!validGeo(lat,lon)||
    !(lat>34.48&&lat<34.9&&lon>-120.79&&lon< -120.38))return null;
  return {lat,lon,padId:launch.padId,name:launch.pad||'Vandenberg launch pad',
    source:'Launch Library 2 pad coordinates · observation, not public entrance'};
}
function referenceFor(site,region){
  const near=(region?.weatherPoints||[]).map(p=>({...p,geo:distanceBearing(site,p)}))
    .filter(x=>x.geo).sort((a,b)=>a.geo.miles-b.geo.miles)[0];
  return near&&near.geo.miles<=5?{id:near.id,name:near.name,
    miles:near.geo.miles}:null;
}
function forecastAt(reference,scenario){
  const p=scenario?.places?.find(x=>x.id===reference?.id);
  if(!p||p.cloudStatus!=='ok'||!Number.isInteger(p.cloudCoverPercent)||
     p.assessment?.level==='poor'||p.assessment?.level==='unknown')
    return {state:'unavailable',cloud:null,level:null};
  return {state:'reference-only',cloud:p.cloudCoverPercent,level:p.assessment.level,
    note:'NWS gridded sky cover sampled '+reference.miles+' mi from this venue. Not a fog-layer, pad-to-viewer sightline, or rocket trajectory forecast.'};
}
function buildVandenbergViewing(launch,weather,now=Date.now()){
  const pad=selectedPad(launch);
  const precise=Boolean(launch&&['minute','second'].includes(launch.netPrecision)&&
    Number.isFinite(Date.parse(launch.net||'')));
  const scheduleOverdue=launch?.sourceStale===true;
  const active=precise&&!scheduleOverdue&&!/hold|scrub/i.test(launch?.status||'')&&
    Date.parse(launch.net)>=now-900000;
  const samples=Array.isArray(weather?.slip?.scenarios)?weather.slip.scenarios:[];
  const points=[
    {id:'lompoc',name:'Lompoc NWS reference',lat:34.6392,lon:-120.4579},
    {id:'surf',name:'Surf Beach vicinity NWS reference',lat:34.6859,lon:-120.6058}
  ];
  const sites=SITES.map(site=>{
    const {affinities,...core}=site;
    return {...core,affinities,pointEvidence:{source:site.osm,
      type:'OpenStreetMap mapped feature centroid, not a certified entrance'},
      padGeometry:pad?distanceBearing(site,pad):null,
      reference:referenceFor(site,{weatherPoints:points})};
  });
  const scenarios=active?OFFSETS.map(offsetHours=>{
    const targetAt=new Date(Date.parse(launch.net)+offsetHours*3600000).toISOString();
    const forecast=samples.find(s=>s.offsetHours===offsetHours&&s.targetAt===targetAt);
    const candidates=sites.map(s=>({
      id:s.id,access:accessAt(s,targetAt),
      forecast:forecastAt(s.reference,forecast)
    }));
    return {offsetHours,targetAt,solarElevation:solarElevation(targetAt,34.67,-120.5),
      forecastStatus:forecast?.status||'unavailable',
      candidates};
  }):[];
  return {
    status:!launch?'no-launch':!pad?'pad-geometry-unverified':!precise?'time-unverified':
      scheduleOverdue?'schedule-overdue':!active?'target-not-current':'candidate-review',
    statusDetail:'No real-time site opening, road condition, queue, flight path, cloud-base or on-pad visibility is independently verified.',
    region:'california',timezone:TIMEZONE,
    pad,sites,scenarios,closedViewingLocations:CLOSED,
    sources:{tourism:TOURISM,beach:BEACH,collegeParking:COLLEGE,
      solar:'https://gml.noaa.gov/grad/solcalc/solareqns.PDF',
      gis:'https://www.openstreetmap.org/copyright'},
    checkedAt:new Date(now).toISOString(),
    method:'WGS84 great-circle distance and initial bearing from OSM place centers to LL2 launch-pad coordinate. Solar elevation from NOAA approximate equation; nearest of two existing NWS reference forecasts, not each venue. No current access confirmation or trajectory simulation.',
    weatherNote:'Total NWS sky cover does not establish fog layer height, unobstructed pad views, booster track, launch readiness or a chance of seeing the rocket.',
    confidence:'Venue identities and broad access guidance: official/visitor sources. Coordinates: OSM centroids. Status and visibility: NOT live verified.'
  };
}
module.exports={SITES,CLOSED,OFFSETS,TOURISM,BEACH,COLLEGE,TIMEZONE,
  distanceBearing,compass,solarElevation,localMinutes,accessAt,
  selectedPad,referenceFor,forecastAt,buildVandenbergViewing};
