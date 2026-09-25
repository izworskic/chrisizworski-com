"use strict";

const TZ="America/Detroit";
const SUN_ZENITH=90.833;
const MIN_USABLE_LIGHT_MINUTES=45;

function finite(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function rad(value){return value*Math.PI/180;}
function deg(value){return value*180/Math.PI;}
function norm(value,max){return ((value%max)+max)%max;}
function dayOfYear(year,month,day){
  const start=Date.UTC(year,0,0);
  return Math.floor((Date.UTC(year,month-1,day)-start)/86400000);
}
function localDateParts(now){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const row=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {year:Number(row.year),month:Number(row.month),day:Number(row.day),key:`${row.year}-${row.month}-${row.day}`};
}
function solarEventUtc(dateParts,latitude,longitude,isSunrise){
  const lat=finite(latitude),lon=finite(longitude);
  if(lat===null||lon===null)return null;
  const n=dayOfYear(dateParts.year,dateParts.month,dateParts.day);
  const lngHour=lon/15;
  const t=n+(((isSunrise?6:18)-lngHour)/24);
  const m=(0.9856*t)-3.289;
  let l=m+(1.916*Math.sin(rad(m)))+(0.020*Math.sin(rad(2*m)))+282.634;
  l=norm(l,360);
  let ra=deg(Math.atan(0.91764*Math.tan(rad(l))));
  ra=norm(ra,360);
  const lQuadrant=Math.floor(l/90)*90;
  const raQuadrant=Math.floor(ra/90)*90;
  ra=(ra+(lQuadrant-raQuadrant))/15;
  const sinDec=0.39782*Math.sin(rad(l));
  const cosDec=Math.cos(Math.asin(sinDec));
  const cosH=(Math.cos(rad(SUN_ZENITH))-(sinDec*Math.sin(rad(lat))))/(cosDec*Math.cos(rad(lat)));
  if(cosH>1||cosH< -1)return null;
  let h=isSunrise?360-deg(Math.acos(cosH)):deg(Math.acos(cosH));
  h/=15;
  const localMean=h+ra-(0.06571*t)-6.622;
  const utcHours=norm(localMean-lngHour,24);
  const wholeHour=Math.floor(utcHours);
  const minuteFloat=(utcHours-wholeHour)*60;
  const wholeMinute=Math.floor(minuteFloat);
  const seconds=Math.round((minuteFloat-wholeMinute)*60);
  return new Date(Date.UTC(dateParts.year,dateParts.month-1,dateParts.day,wholeHour,wholeMinute,seconds));
}
function solarWindow(now,latitude,longitude){
  const date=localDateParts(now);
  const sunrise=solarEventUtc(date,latitude,longitude,true);
  const sunset=solarEventUtc(date,latitude,longitude,false);
  return {dateKey:date.key,sunrise,sunset};
}
function formatLocalTime(date){
  if(!(date instanceof Date)||Number.isNaN(date.getTime()))return "";
  return new Intl.DateTimeFormat("en-US",{timeZone:TZ,hour:"numeric",minute:"2-digit"}).format(date);
}
function daylightDecision(candidate,now=new Date()){
  const place=candidate&&candidate.place||{};
  const {sunrise,sunset}=solarWindow(now,place.lat,place.lon);
  if(!sunrise||!sunset)return {keep:true,candidate,reason:"solar-window-unavailable"};
  const driveMinutes=Math.max(0,finite(candidate&&candidate.discovery&&candidate.discovery.driveMinutes)||0);
  const arrival=new Date(now.getTime()+driveMinutes*60000);
  const usableUntil=new Date(sunset.getTime()-MIN_USABLE_LIGHT_MINUTES*60000);
  const sunriseLabel=formatLocalTime(sunrise);
  const sunsetLabel=formatLocalTime(sunset);

  if(now>=sunset){
    return {keep:false,candidate,reason:"after-sunset",sunrise,sunset,arrival};
  }
  if(arrival>usableUntil){
    return {keep:false,candidate,reason:"insufficient-light-after-drive",sunrise,sunset,arrival};
  }

  const clone={...candidate};
  if(now<sunrise){
    clone.timeWindow={label:`After sunrise · ${sunriseLabel}–${sunsetLabel}`,start:sunrise.toISOString(),end:sunset.toISOString()};
    clone.whyNow=`${candidate.whyNow||""} The usable daylight window begins around ${sunriseLabel}; sunset is around ${sunsetLabel}.`.trim();
  }else{
    const daylightMinutes=Math.max(0,Math.floor((sunset-arrival)/60000));
    clone.timeWindow={label:`Now–${sunsetLabel}`,start:now.toISOString(),end:sunset.toISOString()};
    clone.whyNow=`${candidate.whyNow||""} Leaving now allows about ${daylightMinutes} minutes of daylight after the estimated drive; sunset is around ${sunsetLabel}.`.trim();
  }
  clone.daylight={sunrise:sunrise.toISOString(),sunset:sunset.toISOString(),driveMinutes,minUsableLightMinutes:MIN_USABLE_LIGHT_MINUTES};
  return {keep:true,candidate:clone,reason:"usable-daylight",sunrise,sunset,arrival};
}
function applyRegionalDaylightGate(state,now=new Date()){
  if(!state||!state.ok||!state.data||!Array.isArray(state.data.candidates))return state;
  const kept=[];
  const suppressed=[];
  for(const candidate of state.data.candidates){
    const decision=daylightDecision(candidate,now);
    if(decision.keep)kept.push(decision.candidate);
    else suppressed.push({id:candidate&&candidate.id||null,reason:decision.reason});
  }
  return {
    ...state,
    data:{
      ...state.data,
      candidates:kept,
      candidateCount:kept.length,
      daylightSuppressedCount:suppressed.length,
      daylightSuppressed:suppressed
    }
  };
}

module.exports={
  MIN_USABLE_LIGHT_MINUTES,
  applyRegionalDaylightGate,
  _test:{dayOfYear,localDateParts,solarEventUtc,solarWindow,formatLocalTime,daylightDecision}
};
