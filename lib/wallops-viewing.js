'use strict';
/**
 * Wallops public-facing location atlas. Source audit: 2026-11-03.
 * Coordinates refer to published arrival/location features, NOT exact
 * spectator positions, approved parking, guaranteed visibility, routes, or
 * public access to the restricted Wallops launch range.
 */
const NASA_LAUNCH='https://www.nasa.gov/wallops-launch-schedule/';
const NASA_RANGE='https://www.nasa.gov/blogs/wallops-range/';
const NASA_VIEW='https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/';
const NASA_VISIT='https://www.nasa.gov/wallops/visitor-center/plan-your-visit/';
const USACE_REED='https://www.nao.usace.army.mil/Media/Public-Notices/Article/4443337/408-nao-2026-0018-town-of-chincoteague-downtown-floating-dock/';
const NOAA_HARBOR='https://tidesandcurrents.noaa.gov/benchmarks/8630315.html';
const REFUGE='https://www.fws.gov/refuge/chincoteague';
const PLACES=Object.freeze([
 Object.freeze({
  id:'nasa-visitor',name:'NASA Wallops Visitor Center launch-viewing lawn',
  area:'Wallops mainland · Route 175',kind:'official-event-venue',lat:37.9393167,lon:-75.4566333,
  coordinateRole:'NASA published visitor-center GPS, NOT a surveyed launch-viewing lawn',
  geographicSource:'https://www.nasa.gov/wallops/stem/wallops-ec/',
  accessSource:NASA_VIEW,address:'175 Chincoteague Road, Wallops Island, VA 23337',
  navigation:'37.9393167,-75.4566333',navigationRole:'official-public-visitor-center-arrival-only',
  bestFor:'Range audio, science interpretation and a direct marsh view when NASA opens the viewing lawn',
  scene:'A quiet coastal marsh becomes a front-row laboratory. Range audio comes through loudspeakers, and staff explain the experiment before liftoff.',
  warnings:['Launch viewing opening must be announced for THIS mission','Free admission, no reservations or guaranteed parking','Security and bag checks; no pets except service animals','No RV or oversize vehicle parking for launch events','Never stop or park along Route 175'],
  profiles:['first','science','family'],status:'event-unverified'
 }),
 Object.freeze({
  id:'reed',name:'Robert N. Reed Sr. Downtown Waterfront Park',
  area:'Chincoteague · Main Street',kind:'town-waterfront',lat:37.934715,lon:-75.377321,
  coordinateRole:'US Army Corps of Engineers 2026 published town dock project point, NOT park entrance or parking',
  geographicSource:USACE_REED,accessSource:NASA_VIEW,
  address:'Main Street, downtown Chincoteague, VA 23336',
  navigation:'Robert Reed Waterfront Park, Chincoteague VA',navigationRole:'named-public-park-navigation-not-specific-parking',
  bestFor:'Stay on Chincoteague, keep a flexible public-waterfront backup',
  scene:'The fishing town faces the channel as a rocket rises from the mainland range beyond the water. NASA identifies this downtown park among the alternate viewing areas.',
  warnings:['Local parking and launch-day restrictions not confirmed','Exact position and sky sightline not surveyed','Town dock construction may change waterfront access'],
  profiles:['backup','family','first'],status:'public-candidate'
 }),
 Object.freeze({
  id:'harbor',name:'Curtis Merritt Harbor of Refuge',
  area:'South Chincoteague · working waterfront',kind:'town-harbor',lat:37.902311,lon:-75.405202,
  coordinateRole:'Virginia Department of Health 2019 harbor facility survey point, NOT a marked launch viewing platform',
  geographicSource:'https://www.vdh.virginia.gov/content/uploads/sites/20/2016/05/survey101.pdf',
  accessSource:NASA_VIEW,address:'2246 Curtis Merritt Harbor Drive, Chincoteague, VA 23336',
  navigation:'2246 Curtis Merritt Harbor Drive, Chincoteague VA 23336',
  navigationRole:'town-operated-harbor-address-not-event-parking',
  bestFor:'A quieter working-waterfront alternative to investigate before the event',
  scene:'Fishing boats and tidal creeks frame the southern end of Chincoteague. NASA names this harbor among the alternative public viewing areas; access and sightlines remain event-specific.',
  warnings:['Do not block fishing or marina operations','Harbor parking hours and nighttime access not verified','Boat ramp permits are not launch-viewing parking permissions'],
  profiles:['backup','photo'],status:'public-candidate'
 })
]);
const PROFILES=Object.freeze({
 first:{label:'First-time watcher',order:['nasa-visitor','reed','harbor'],explanation:'Start with the official NASA experience if its mission announcement explicitly opens the lawn; otherwise investigate the town waterfront.'},
 backup:{label:'Avoid the launch-center queue',order:['reed','harbor','nasa-visitor'],explanation:'Choose a town waterfront reference but confirm its parking and current event restrictions. NASA lawn capacity is not guaranteed.'},
 science:{label:'Science and range audio',order:['nasa-visitor','reed','harbor'],explanation:'NASA’s Visitor Center can broadcast Range Control audio and explain the mission, but only during a separately announced launch-viewing event.'},
 photo:{label:'Waterfront photography',order:['harbor','reed','nasa-visitor'],explanation:'Investigate a town waterfront foreground. A bearing to the pad does not predict the rocket’s ascent or unobstructed night visibility.'}
});
const RAD=Math.PI/180,RMI=3958.7613;
function geometry(a,b){
 const lat1=a.lat*RAD,lat2=b.lat*RAD,dl=(b.lat-a.lat)*RAD,doLon=(b.lon-a.lon)*RAD;
 const q=Math.sin(dl/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(doLon/2)**2;
 const miles=2*RMI*Math.asin(Math.min(1,Math.sqrt(q)));
 const y=Math.sin(doLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(doLon);
 const bearing=(Math.atan2(y,x)/RAD+360)%360;
 return {miles:Math.round(miles*10)/10,bearingDegrees:Math.round(bearing),bearingCardinal:['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8]};
}
function safePad(launch) {
 if(!launch||launch.region!=='virginia'||launch.lat==null||launch.lon==null)return null;
 const lat=Number(launch.lat),lon=Number(launch.lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<37.7||lat>38.1||lon< -75.8||lon> -75.0)return null;
 return {name:String(launch.pad||'Wallops restricted launch facility').slice(0,95),
  lat,lon,coordinateRole:'source-reported-restricted-LL2-pad-not-public-navigation',
  source:'https://ll.thespacedevs.com/'};
}
function typeOf(launch) {
 if(!launch)return {code:'none',name:'No mission selected',summary:'No launch appears in the bounded national schedule. This does not disprove a short-notice or non-NASA range operation.'};
 const rocket=String(launch.rocket||'');
 if(/terrier|malemute|black\s*brant|nike|improved\s*orion|arcas|sounding/i.test(rocket))
  return {code:'sounding',name:'Scientific sounding rocket',summary:'Often an extremely brief ascent, sometimes only seconds in view. Scientific conditions can require repeated attempts or a long launch window.'};
 if(/haste/i.test(rocket))
  return {code:'suborbital',name:'Suborbital HASTE mission',summary:'A suborbital mission, not automatically a NASA sounding-rocket science event; access, livestream and visibility must be checked with the mission operator.'};
 if(/electron|antares|firefly|neutron/i.test(rocket))
  return {code:'orbital',name:'Orbital launch candidate',summary:'An orbital rocket generally produces a longer viewing opportunity than a sounding rocket, but weather and actual trajectory determine what spectators see.'};
 return {code:'unclassified',name:'Rocket mission, class not verified',summary:'The shared schedule does not establish its flight profile or spectator visibility. Use the original operator and NASA range announcements.'};
}
function buildWallopsViewing(launch,weather=[],now=Date.now()){
 const pad=safePad(launch);
 const sites=PLACES.map(p=>({...p,
  geometry:pad?geometry(p,pad):null,
  accessState:'not-live-verified',parkingVerified:false,
  viewingPermission:p.id==='nasa-visitor'?'not-announced-for-selected-mission':'town-event-check-required'}));
 return {version:1,asOf:new Date(now).toISOString(),sourceReviewed:'2026-11-03',
  missionId:launch?.region==='virginia'?launch.id:null,missionType:typeOf(launch),
  sites,pad,profiles:PROFILES,official:{
   nasaLaunchSchedule:NASA_LAUNCH,rangeBlog:NASA_RANGE,visitorViewing:NASA_VIEW,
   visitorHours:NASA_VISIT,refugeConditions:REFUGE,
   visitorViewingStatus:'mission-event-unverified',
   nonNasaRangeActivity:'not-exhaustively-represented-in-ll2',
   nextPublicMission:'not-verified-by-this-geographic-module'
  },
  spectatorSkyNote:'Weather around a town or visitor center is NOT NASA launch weather, guaranteed trajectory visibility, an operator GO decision or launch attendance permission.',
  accessCautions:['NASA Visitor Center may be closed for a commercial launch even when the rocket flies','No parking or standing along Route 175 outside the posted visitor-center grounds','Chincoteague National Wildlife Refuge and Virginia Assateague district may close for launches','A mission absent from orbital calendars may still have an official range blog notice'],
  geojson:{type:'FeatureCollection',features:[
   ...sites.map(s=>({type:'Feature',geometry:{type:'Point',coordinates:[s.lon,s.lat]},properties:{id:s.id,name:s.name,role:s.coordinateRole,status:s.accessState,source:s.geographicSource}})),
   ...(pad?[{type:'Feature',geometry:{type:'Point',coordinates:[pad.lon,pad.lat]},properties:{id:'restricted-pad',role:pad.coordinateRole,source:pad.source}}]:[])
  ]}};
}
module.exports={NASA_LAUNCH,NASA_RANGE,NASA_VIEW,NASA_VISIT,REFUGE,PLACES,PROFILES,geometry,safePad,typeOf,buildWallopsViewing};
