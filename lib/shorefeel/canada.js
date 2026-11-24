'use strict';
// ECCC GeoMet city-page forecasts for verified Ontario shore destinations.
// A nearest city forecast cannot establish beach-air microclimate accuracy.
const catalog=require('../../data/shorefeel-canada-ontario.json');
const {interpretShoreline}=require('./shoreline-real-feel.js');
const bySlug=new Map(catalog.locations.map(x=>[x.slug,x]));
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const rad=x=>x*Math.PI/180;
function kmBetween(lat1,lon1,lat2,lon2){
  const a=Math.sin(rad(lat2-lat1)/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon1)/2)**2;
  return 12742*Math.asin(Math.min(1,Math.sqrt(a)));
}
function validBeach(x){
  return !!x&&x.country==='Canada'&&x.province==='Ontario'&&
    ['Superior','Huron','Erie','Ontario'].includes(x.lake)&&
    /^[a-z0-9-]{3,90}$/.test(x.slug)&&finite(x.reference?.lat,41,50)&&
    finite(x.reference?.lon,-90,-75)&&/^https:\/\//.test(x.officialUrl)&&
    /^https:\/\//.test(x.advisory?.url);
}
function bboxUrl(beach){
  if(!validBeach(beach))return null;
  const {lat,lon}=beach.reference;
  // Fixed, modest search window at the shore. No caller-supplied fetch URL.
  const format=x=>x.toFixed(3);
  return 'https://api.weather.gc.ca/collections/citypageweather-realtime/items?bbox='+
    [lon-.75,lat-.53,lon+.75,lat+.53].map(format).join(',')+'&limit=12&f=json';
}
function sourceValue(field){
  const value=field?.value?.en;
  return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function empty(beach,reason){
  return {status:'unavailable',beach:beach?.slug||null,source:'Environment and Climate Change Canada (ECCC)',
    temperatureC:null,temperatureF:null,apparentC:null,method:null,windKmh:null,windDirection:null,
    validAt:null,forecastIssueAt:null,forecastPlace:null,forecastDistanceKm:null,
    reason:reason||'A sufficiently local and recent ECCC city forecast is unavailable.',
    waterTemperature:null,swimmingStatus:'not-checked',
    scope:'No on-sand thermometer or verified Canadian beach microclimate correction exists in this tool.'};
}
function chooseFeature(beach,collection){
  if(!validBeach(beach)||!Array.isArray(collection?.features))return null;
  const viable=[];
  for(const feature of collection.features){
    const coords=feature?.geometry?.coordinates;
    if(feature?.geometry?.type!=='Point'||!Array.isArray(coords)||coords.length<2||
       !finite(coords[1],41,51)||!finite(coords[0],-91,-74)||
       typeof feature.properties?.name?.en!=='string'||typeof feature.properties?.identifier!=='string'||
       !/^on-\d+$/.test(feature.properties.identifier))continue;
    const dist=kmBetween(beach.reference.lat,beach.reference.lon,coords[1],coords[0]);
    if(dist<=55)viable.push({feature,distanceKm:dist});
  }
  viable.sort((a,b)=>a.distanceKm-b.distanceKm);
  return viable[0]||null;
}
function forecastPeriod(periods,now){
  if(!Array.isArray(periods)||!Number.isFinite(now.getTime()))return null;
  const list=periods.filter(p=>Number.isFinite(Date.parse(p?.timestamp||''))&&
    finite(sourceValue(p.temperature),-50,55)).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  // Same-hour forecast, or upcoming hour if the city page starts ahead.
  return list.find(p=>{const ms=Date.parse(p.timestamp);return now.getTime()>=ms&&now.getTime()<ms+3600000})||
    list.find(p=>{const ms=Date.parse(p.timestamp);return ms>now.getTime()&&ms-now.getTime()<=5400000})||null;
}
function interpret(beach,collection,now=new Date(),water=null){
  if(!validBeach(beach)||!Number.isFinite(now.getTime()))return empty(beach,'Unsupported beach or invalid date.');
  const selected=chooseFeature(beach,collection);
  if(!selected)return empty(beach,'No nearby ECCC city forecast within 55 km of this shore.');
  const p=selected.feature.properties;
  const updated=Date.parse(p.lastUpdated||'');
  if(!Number.isFinite(updated)||now.getTime()-updated>16*3600000||
      updated-now.getTime()>3600000)return empty(beach,'ECCC source has no recent issue timestamp.');
  const hourly=p.hourlyForecastGroup;
  const issued=Date.parse(hourly?.timestamp?.en||'');
  if(!Number.isFinite(issued)||now.getTime()-issued>24*3600000||issued-now.getTime()>3600000)
    return empty(beach,'ECCC hourly forecast issue time is missing or stale.');
  const h=forecastPeriod(hourly.hourlyForecasts,now);
  if(!h)return empty(beach,'No valid current or imminent ECCC hourly air forecast.');
  const temp=sourceValue(h.temperature);
  const wind=sourceValue(h.wind?.speed);
  const speed=finite(wind,0,180)?wind:null;
  const directions=new Set(['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW','VR']);
  const dir=typeof h.wind?.direction?.value?.en==='string'&&directions.has(h.wind.direction.value.en.toUpperCase())
    ?h.wind.direction.value.en.toUpperCase():null;
  let apparent=temp,method='ECCC forecast air temperature';
  if(temp<=0&&speed!==null&&speed>=5){
    apparent=13.12+.6215*temp-11.37*speed**.16+.3965*temp*speed**.16;
    method='Calculated Canadian wind chill from ECCC forecast';
  }
  // Humidex is an official ECCC forecast element when it is present. Do not
  // manufacture a summer feels-like value from temperature without dewpoint.
  const humidex=sourceValue(h.humidex);
  if(temp>=20&&finite(humidex,25,65)&&humidex>temp){
    apparent=humidex;method='ECCC forecast humidex';
  }
  if(!finite(apparent,-75,65))return empty(beach,'Calculated comfort value is invalid.');
  const heading=speed===null?'The shoreline has its own weather':
    speed>=30?'An exposed and windy shore':speed>=15?'Feel the breeze as you reach the sand':'A quieter spell by the lake';
  const note=speed!==null&&speed>=30
    ?'An open beach offers little shelter. Moving air can quickly cool damp clothing and skin, even when inland streets seem sheltered.'
    :speed!==null&&speed>=15
    ?'At the waterline you may notice more wind than among trees and buildings. Check flags and waves before going into the lake.'
    :'Forecast wind is lighter at the nearby city reference, but a local lake breeze can still form or change direction beside the water.';
  const shorelineRealFeel=interpretShoreline({provider:'ECCC',weather:{
    startsAt:h.timestamp,tempF:temp*9/5+32,
    windMph:speed===null?null:speed/1.609344,
    windDirection:dir,humidity:null},water,
    beach:{lat:beach.reference.lat,lon:beach.reference.lon},
    lake:beach.lake,apparentF:apparent*9/5+32,apparentMethod:method,now});
  return {status:'forecast-based',beach:beach.slug,
    shorelineRealFeel,
    source:'Environment and Climate Change Canada (ECCC)',
    temperatureC:Math.round(temp),temperatureF:Math.round(temp*9/5+32),
    apparentC:Math.round(apparent),method,windKmh:speed===null?null:Math.round(speed),
    windDirection:dir,validAt:h.timestamp,forecastIssueAt:hourly.timestamp.en,
    forecastPlace:p.name.en,forecastDistanceKm:Math.round(selected.distanceKm),
    forecastId:p.identifier,isUpcoming:Date.parse(h.timestamp)>now.getTime(),
    heading,note,waterTemperature:null,swimmingStatus:'not-checked',
    scope:'This ECCC hourly forecast represents '+p.name.en+' about '+Math.round(selected.distanceKm)+
      ' km from the selected shore. It is not a thermometer on the sand or a validated beach temperature adjustment.',
    safetyNote:'Beach water tests, wave hazards, local restrictions and swimming flags are not checked in this forecast.'};
}
module.exports={catalog,bySlug,validBeach,bboxUrl,sourceValue,kmBetween,chooseFeature,forecastPeriod,interpret,empty};
