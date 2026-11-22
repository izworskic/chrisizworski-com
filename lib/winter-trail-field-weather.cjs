'use strict';
/**
 * Weather evidence for the 15 already published Michigan Winter Trails areas.
 *
 * These 15 atlas coordinates are editorial reference points copied from the
 * crawlable field-guide cards, NEVER certified trailheads or winter parking.
 * No arbitrary browser-supplied coordinate, URL or geometry is accepted.
 *
 * Existing NOAA/NWS research adapter owns fetch limits, provenance and freshness.
 * This module only publishes a narrowly scoped weather reading. It does not
 * turn that reading into a go/no-go, grooming, route or parking determination.
 */
const Live=require('./winter-hike-live.cjs');
const POINTS=Object.freeze({
 'stop-1':Object.freeze({lat:46.4100,lon:-86.6400}),
 'stop-2':Object.freeze({lat:46.60549,lon:-85.20342}),
 'stop-3':Object.freeze({lat:46.57568,lon:-85.25177}),
 'stop-4':Object.freeze({lat:46.63083,lon:-85.04883}),
 'stop-5':Object.freeze({lat:46.24881,lon:-84.42559}),
 'stop-6':Object.freeze({lat:46.8200,lon:-89.7500}),
 'stop-7':Object.freeze({lat:44.750594,lon:-85.493329}),
 'stop-8':Object.freeze({lat:44.750594,lon:-85.493329}),
 'stop-9':Object.freeze({lat:44.8750,lon:-86.0600}),
 'stop-10':Object.freeze({lat:44.8896,lon:-86.0215}),
 'stop-11':Object.freeze({lat:44.74163,lon:-84.66131}),
 'stop-12':Object.freeze({lat:44.85642,lon:-83.32423}),
 'stop-13':Object.freeze({lat:43.6829,lon:-86.4980}),
 'stop-14':Object.freeze({lat:43.25344,lon:-86.34359}),
 'stop-15':Object.freeze({lat:43.67514,lon:-83.92289})
});
const HOURS=3600000,DAY=24*HOURS;
const validStamp=(value,now,maxAgeMs)=>{
 const stamp=Date.parse(value);
 return Number.isFinite(stamp)&&stamp<=now+HOURS&&now-stamp>=0&&now-stamp<=maxAgeMs;
};
const finiteNumber=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max?value:null;
function input(trailId,date,now=Date.now()){
 const point=Object.hasOwn(POINTS,trailId)?POINTS[trailId]:null;
 if(!point || !Live.validPoint(point))return {error:'Choose one of the published Michigan trail areas'};
 if(!Live.validDate(date))return {error:'Choose a valid YYYY-MM-DD outing date'};
 const outing=Date.parse(date+'T12:00:00Z');
 if(outing<now-36*HOURS||outing>now+7*DAY)
  return {error:'Outing date is outside the supported seven-day NWS forecast window'};
 return {point};
}
function scopeEvidence(trailId,date,raw,now=Date.now()){
 const p=input(trailId,date,now);
 if(p.error)throw Error(p.error);
 const snow=raw?.snow||{},forecast=raw?.forecast||{},alerts=raw?.alerts||{};
 const snowDay=Live.validDate(snow.validDate)?Date.parse(snow.validDate+'T12:00:00Z'):NaN;
 const snowValid=snow.kind==='modeled'&&finiteNumber(snow.depthInches,0,800)!==null&&
  Number.isFinite(snowDay)&&snowDay<=now+HOURS&&now-snowDay<=72*HOURS;
 const forecastValid=forecast.targetCovered===true&&
  validStamp(forecast.updatedAt,now,12*HOURS)&&
  Live.validForecastUrl(forecast.sourceUrl)&&
  finiteNumber(forecast.tempMinF,-100,150)!==null&&
  finiteNumber(forecast.tempMaxF,-100,150)!==null&&
  forecast.tempMinF<=forecast.tempMaxF;
 const alertValid=alerts.status==='verified'&&
  validStamp(alerts.checkedAt,now,30*60*1000)&&Array.isArray(alerts.events);
 const events=alertValid?alerts.events.filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,140)):[];
 return {
  status:'area-weather-context-not-trip-clearance',
  trailId,tripDate:date,
  checkedAt:validStamp(raw?.generatedAt,now,30*60*1000)?raw.generatedAt:null,
  referencePoint:{lat:p.point.lat,lon:p.point.lon,
   meaning:'Regional trail-area weather reference, not a route, winter trailhead, access road or plowed parking location'},
  snow:{status:snowValid?'modeled':'unavailable',
   depthInches:snowValid?snow.depthInches:null,validDate:snowValid?snow.validDate:null,
   source:'NOAA NOHRSC modeled 1-km grid-cell snow depth',
   sourceUrl:'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer',
   meaning:'Modeled snow at a regional grid point, not snow on the named trail'},
  forecast:{status:forecastValid?'forecast':'unavailable',
   updatedAt:forecastValid?forecast.updatedAt:null,sourceUrl:forecastValid?forecast.sourceUrl:null,
   tempMinF:forecastValid?forecast.tempMinF:null,
   tempMaxF:forecastValid?forecast.tempMaxF:null,
   windMph:forecastValid?finiteNumber(forecast.windMph,0,160):null,
   windChillF:forecastValid?finiteNumber(forecast.windChillF,-150,150):null,
   freezeThaw:forecastValid?forecast.freezeThaw===true:null,
   rainOrFreezingRain:forecastValid?forecast.rainOrFreezingRain===true:null,
   hours:forecastValid?finiteNumber(forecast.hours,5,7):null,
   meaning:'NWS forecast for approximately 10 AM to 4 PM local time at the regional reference; not a ground observation'},
  alerts:{status:alertValid?'checked':'unavailable',checkedAt:alertValid?alerts.checkedAt:null,
   events,sourceUrl:'https://api.weather.gov/alerts/active',
   meaning:'Current NWS alerts at time checked, not a forecast of future warnings or a trail access decision'},
  access:{status:'not-verified',routeGeometry:'not-verified',grooming:'not-verified',
   road:'not-verified',parking:'not-verified',navigationReady:false,
   meaning:'Only the land manager can confirm current route permission, grooming, winter road access and plowed parking'}
 };
}
async function forTrail(trailId,date,{now=Date.now(),load=Live.getTripEvidence}={}){
 const checked=input(trailId,date,now);
 if(checked.error){const err=new Error(checked.error);err.code='INVALID_TRAIL_WEATHER_REQUEST';throw err}
 const evidence=await load(checked.point,date,{now});
 return scopeEvidence(trailId,date,evidence,now);
}
module.exports={POINTS,input,scopeEvidence,forTrail};
