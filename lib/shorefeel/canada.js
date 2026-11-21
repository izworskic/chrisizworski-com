'use strict';
// ECCC City Page Weather [experimental] is a regional city forecast, never a
// thermometer at an Ontario Parks beach. See MSC GeoMet API data licence.
const catalogue=require('../../data/shorefeel-canada.json');
const bySlug=new Map(catalogue.beaches.map(x=>[x.slug,x]));
const LAKES=Object.freeze(['Superior','Huron','Erie','Ontario']);
const integer=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const en=v=>v&&typeof v==='object'?v.en:null;
const km=(lat1,lon1,lat2,lon2)=>{
  const r=Math.PI/180,a=(lat2-lat1)*r,b=(lon2-lon1)*r;
  const x=Math.sin(a/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(b/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};
function validLocation(x){
  return x&&x.country==='CA'&&x.province==='ON'&&LAKES.includes(x.lake)&&
    /^[a-z0-9-]{3,60}$/.test(x.slug)&&integer(x.lat,41,50)&&integer(x.lon,-90,-76)&&
    /^https:\/\/www\.ontarioparks\.ca\/park\/[a-z]+$/.test(x.parkUrl)&&
    x.waterSafety?.url==='https://www.ontarioparks.ca/beachresults';
}
function sourceUrl(x){
  if(!validLocation(x))return null;
  const coords=[x.lon-.5,x.lat-.45,x.lon+.5,x.lat+.45].map(n=>n.toFixed(4)).join(',');
  return 'https://api.weather.gc.ca/collections/citypageweather-realtime/items?f=json&limit=100&bbox='+coords;
}
function unavailable(x,reason){
  return {status:'unavailable',beach:x?.slug||null,source:'Environment and Climate Change Canada city forecast',
    city:null,cityDistanceKm:null,forecastValidAt:null,issuedAt:null,temperatureC:null,temperatureF:null,
    windKmh:null,windFrom:null,reason:reason||'No recent nearby city forecast available.',
    swimSafety:'not-checked',waterTemperature:'not-measured',scope:'This tool does not measure air at the sand or verify swimming conditions.'};
}
function chooseForecast(x,json,now=new Date()){
  if(!validLocation(x)||!Number.isFinite(now.getTime()))return unavailable(x,'Invalid Canadian shoreline reference.');
  if(json?.type!=='FeatureCollection'||!Array.isArray(json.features))
    return unavailable(x,'The ECCC response did not contain a valid city forecast collection.');
  const eligible=json.features.map(f=>{
    const coords=f?.geometry?.coordinates||[];
    if(f?.geometry?.type!=='Point'||!integer(coords[0],-95,-75)||!integer(coords[1],40,55))return null;
    const p=f.properties||{},issuedMs=Date.parse(p.lastUpdated||'');
    if(!Number.isFinite(issuedMs)||now.getTime()-issuedMs>12*3600000||
       issuedMs-now.getTime()>3600000)return null;
    const dist=km(x.lat,x.lon,coords[1],coords[0]);
    if(dist>60)return null;
    const hours=p.hourlyForecastGroup?.hourlyForecasts;
    if(!Array.isArray(hours))return null;
    const current=hours.filter(h=>{
      const ms=Date.parse(h?.timestamp||'');
      return Number.isFinite(ms)&&ms>=now.getTime()-70*60000&&ms<=now.getTime()+150*60000&&
       en(h.temperature?.units)==='C'&&integer(en(h.temperature?.value),-60,55);
    }).sort((a,b)=>Math.abs(Date.parse(a.timestamp)-now.getTime())-
     Math.abs(Date.parse(b.timestamp)-now.getTime()))[0];
    if(!current)return null;
    const name=en(p.name);
    if(typeof name!=='string'||!name.trim())return null;
    return {distance:dist,issuedAt:p.lastUpdated,city:name.trim(),hour:current};
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
  if(!eligible)return unavailable(x,'No recent ECCC city forecast within 60 km of this park.');
  const h=eligible.hour;
  const windRaw=en(h.wind?.speed?.value),windUnits=en(h.wind?.speed?.units);
  const windKmh=windUnits==='km/h'&&integer(windRaw,0,180)?Math.round(windRaw):null;
  const direction=en(h.wind?.direction?.value);
  const windFrom=typeof direction==='string'&&/^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/i.test(direction)?direction.toUpperCase():null;
  const tempC=en(h.temperature.value),tempF=tempC*9/5+32;
  const distKm=Math.round(eligible.distance);
  let heading='A different kind of weather at the water';
  let guide='The city forecast is regional. The park can feel more exposed when you leave shelter for the lakeshore; listen for changes in wind.';
  if(windKmh!==null&&windKmh>=30){
    heading='An exposed shoreline wind';
    guide='A strong regional breeze can move heat away from damp skin and clothing. Pack a wind layer and check local waves and posted advisories when you arrive.';
  }else if(windKmh!==null&&windKmh>=15){
    heading='The breeze shapes a visit';
    guide='On an open beach, wind may be more noticeable than it is between the trees. Look toward the lake, and be prepared for conditions to shift.';
  }else if(windKmh!==null){
    heading='A quieter regional wind';
    guide='The nearest city forecast indicates lighter wind, but exposed lake beaches can develop their own breeze. Watch the shore when you arrive.';
  }
  return {status:'regional-forecast',beach:x.slug,
    source:'Environment and Climate Change Canada (ECCC), MSC GeoMet city forecast [experimental]',
    city:eligible.city,cityDistanceKm:distKm,forecastValidAt:h.timestamp,issuedAt:eligible.issuedAt,
    temperatureC:Math.round(tempC),temperatureF:Math.round(tempF),windKmh,windFrom,
    heading,guide,swimSafety:'not-checked',waterTemperature:'not-measured',
    scope:'Regional ECCC city forecast for '+eligible.city+' ('+distKm+' km from the park reference). Not a measurement or calibrated temperature on the sand. Beach water quality and access status have not been checked.'};
}
module.exports={catalogue,bySlug,LAKES,km,sourceUrl,chooseForecast,unavailable,validLocation};
