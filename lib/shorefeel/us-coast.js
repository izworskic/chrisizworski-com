'use strict';
// Regional ShoreFeel source gate. The National Weather Service provides a
// nearby forecast grid, not a measured thermometer or an observed lake breeze.
const {apparentTemperature}=require('./beach-feel.js');
const {interpretShoreline}=require('./shoreline-real-feel.js');
const data=require('../../data/shorefeel-us-coast.json');
const epaMichigan=require('../../data/shorefeel-epa-mi-2025.json');
const epaOther=require('../../data/shorefeel-epa-other-2025.json');
const LAKES=new Set(['Superior','Michigan','Huron','Erie','Ontario','Great Lakes']);
const EPA_MAP='https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/map-page';
const STATE_SAFETY={
  MI:{name:'Michigan BeachGuard',url:'https://mienviro.michigan.gov/nsite/beach/map/results'},
  MN:{name:'Minnesota Lake Superior Beach Monitoring Program',url:'https://mnbeaches.org/'},
  WI:{name:'Wisconsin Beach Health',url:'https://apps.dnr.wi.gov/beachhealth/'},
  IL:{name:'Illinois BeachGuard',url:'https://idph.illinois.gov/envhealth/ilbeaches/public/'},
  IN:{name:'Indiana IDEM BeachAlert',url:'https://portal.idem.in.gov/beachalert/'},
  OH:{name:'Ohio BeachGuard',url:'https://odh.ohio.gov/know-our-programs/bathing-beach-monitoring/BeachGuard'},
  PA:{name:'Erie County Beach Water Testing',url:'https://eriecountypa.gov/departments/health/services-and-programs/health-and-wellness/beach-water-testing-results/'},
  NY:{name:'New York Coastal Beach Water Quality',url:'https://beachadvisory.health.ny.gov/'}
};
const epaRecords=[...epaMichigan.records,...epaOther.records];
const epaBeaches=epaRecords.map(r=>{
 const authority=STATE_SAFETY[r.state];
 if(!authority||!/^[A-Z]{2}[A-Z0-9]{4,14}$/.test(r.id)||
    !Number.isFinite(r.lat)||!Number.isFinite(r.lon))
   throw new Error('Invalid EPA shoreline source record');
 return {
  slug:'epa-'+r.id.toLowerCase(),epaId:r.id,name:r.name,
  lake:r.lake||'Great Lakes',state:r.state,city:r.county+' County',
  county:r.county,country:'US',lat:r.lat,lon:r.lon,
  forecastReference:{lat:r.lat,lon:r.lon,scope:'Approximate beach location; NWS official land grid independently checked'},
  parkUrl:EPA_MAP,coordinateSource:r.coordinateSource||epaMichigan.sourceUrl,
  coordinateNote:'Approximate beach location; not a verified swim boundary, entry point or parking location',
  story:'This beach is in '+r.county+' County, '+r.state+
    '. An official nearby land-area weather forecast can help you prepare for wind and air comfort. Check local beach access and swimming guidance. Source: EPA 2025 beach directory; current access, facilities and water quality are not verified.',
  accessAlert:null,safety:authority
 };
});
const bySlug=new Map([...data.beaches,...epaBeaches].map(b=>[b.slug,b]));
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;

function validLocation(beach){
  return beach&&LAKES.has(beach.lake)&&beach.country==='US'&&
    /^[a-z0-9-]{3,80}$/.test(beach.slug)&&
    finite(beach.lat,40,49)&&finite(beach.lon,-93,-76)&&
    finite(beach.forecastReference?.lat,40,49)&&finite(beach.forecastReference?.lon,-93,-76)&&
    /^https:\/\//.test(beach.parkUrl)&&/^https:\/\//.test(beach.safety?.url);
}
function officialNwsUrl(url){
  if(typeof url!=='string')return null;
  try{
    const obj=new URL(url);
    return obj.protocol==='https:'&&obj.hostname==='api.weather.gov'&&
      /^\/gridpoints\/[A-Z]{3,4}\/\d+,\d+\/forecast\/hourly$/.test(obj.pathname)&&
      !obj.username&&!obj.password&&!obj.search&&!obj.hash?obj.href:null;
  }catch{return null;}
}
function windMph(text){
  if(typeof text!=='string')return null;
  if(/^calm$/i.test(text.trim()))return 0;
  if(!/\bmph\b/i.test(text))return null;
  const n=[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
  if(!n.length||n.length>2||n.some(v=>!finite(v,0,110)))return null;
  return Math.max(...n);
}
function selectPeriod(periods,now){
  if(!Array.isArray(periods)||!Number.isFinite(now.getTime()))return null;
  return periods.find(p=>{
    if(typeof p?.startTime!=='string'||typeof p?.endTime!=='string')return false;
    const start=Date.parse(p.startTime),end=Date.parse(p.endTime);
    return Number.isFinite(start)&&Number.isFinite(end)&&end>start&&
      now.getTime()>=start&&now.getTime()<end&&
      now.getTime()-start<=7200000;
  })||null;
}
function unavailable(beach,reason){
  return {
    status:'unavailable',beach:beach?.slug||null,
    source:'National Weather Service hourly area forecast',
    asOf:null,issuedAt:null,airF:null,feelsLikeF:null,
    method:null,windMph:null,windFrom:null,humidity:null,
    reason:reason||'A recent National Weather Service land forecast is unavailable.',
    water:'No swimming-area water temperature is reported by this service.',
    risk:'unknown',swimmingSafety:'Not evaluated; check the official state or park authority.',
    scope:'Area forecast near the beach, not an on-sand measurement.'
  };
}
function interpret(beach,point,hourly,now=new Date(),water=null){
  if(!validLocation(beach)||!Number.isFinite(now.getTime()))return unavailable(beach,'Invalid location or time.');
  if(point?.properties?.type!=='land')return unavailable(beach,'NWS did not confirm a land forecast grid here.');
  const issuedAt=hourly?.properties?.updateTime;
  const issueMs=Date.parse(issuedAt||'');
  if(!Number.isFinite(issueMs)||now.getTime()-issueMs>18*3600000||
      issueMs-now.getTime()>3600000)return unavailable(beach,'NWS forecast issue time is missing or stale.');
  const period=selectPeriod(hourly?.properties?.periods,now);
  if(!period||!finite(period.temperature,-60,125)||period.temperatureUnit!=='F')
    return unavailable(beach,'Current NWS hourly air forecast is missing or outdated.');
  const wind=windMph(period.windSpeed);
  const humidity=period.relativeHumidity?.value;
  const rh=finite(humidity,0,100)?humidity:null;
  const comfort=apparentTemperature(period.temperature,wind,rh);
  if(!finite(comfort.tempF,-100,145))return unavailable(beach,'Current apparent temperature is not valid.');
  const from=typeof period.windDirection==='string'&&/^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/.test(period.windDirection.toUpperCase())
    ?period.windDirection.toUpperCase():null;
  let heading='Out on the open shore';
  let guide='The National Weather Service forecasts conditions near the park, but the beach may feel different when you leave the shelter of trees and buildings.';
  if(wind!==null&&wind>=18){heading='A stiff breeze over open sand';guide='Moving air takes warmth from wet skin and exposed clothing. An extra layer can make a long walk beside the water more comfortable.';}
  else if(wind!==null&&wind>=9){heading='The breeze will be part of your visit';guide='The wind becomes easier to notice when you step beyond dunes and buildings. Pay attention to gusts before swimming or paddling.';}
  else if(wind!==null){heading='A quieter spell on the shoreline';guide='Lighter forecast wind may leave the shoreline feeling calmer, but local lake breezes can still develop and shift while you are there.';}
  const shorelineRealFeel=interpretShoreline({provider:'NWS',weather:{
    startsAt:period.startTime,tempF:period.temperature,windMph:wind,
    windDirection:from,humidity:rh},water,beach:{lat:beach.lat,lon:beach.lon},
    lake:beach.lake,apparentF:comfort.tempF,apparentMethod:comfort.method,now});
  return {
    status:'forecast-based',beach:beach.slug,source:'National Weather Service hourly area forecast',
    shorelineRealFeel,
    asOf:period.startTime,issuedAt,airF:Math.round(period.temperature),feelsLikeF:comfort.tempF,
    method:comfort.method,windMph:wind,windFrom:from,humidity:rh,
    heading,guide,
    risk:'unknown',swimmingSafety:'Not evaluated. Official beach advisories and posted flags are separate.',
    water:'No swimming-area water temperature is reported by this service.',
    scope:'Land-area forecast referenced near the beach, not a thermometer on the sand or an actual shoreline cooling correction.',
    reference:{lat:beach.forecastReference.lat,lon:beach.forecastReference.lon},
    notice:'A location forecast cannot certify safe swimming, lake water temperature or open access.'
  };
}
module.exports={data,epaBeaches,epaRecords,STATE_SAFETY,bySlug,validLocation,officialNwsUrl,windMph,selectPeriod,unavailable,interpret};
