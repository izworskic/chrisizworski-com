'use strict';

// Interpretive beach-weather layer for the existing Great Lakes beach catalog.
// The weather is a modeled location forecast, the water is an offshore sensor.
// They never combine into an invented site-specific temperature correction.

const LAKES=Object.freeze(['Lake Superior','Lake Michigan','Lake Huron','Lake Erie','Lake Ontario']);
const LIMIT=Object.freeze({airMin:-60,airMax:125,apparentMin:-100,apparentMax:145,windMax:110,ageHours:2});
const valid=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;

function sourceUtc(local,offsetSeconds){
  // Open-Meteo current.time has no Z; utc_offset_seconds identifies its
  // requested time zone. Never parse it using the server's own timezone.
  if(typeof local!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)||
      !valid(offsetSeconds,-43200,50400))return null;
  const ms=Date.parse(local+'Z');
  if(!Number.isFinite(ms))return null;
  const actual=new Date(ms-offsetSeconds*1000);
  return Number.isFinite(actual.getTime())?actual.toISOString():null;
}

function beachConditions(beach,weather,lake,now=new Date()){
  const base={status:'unavailable',source:'Open-Meteo location forecast',
    airF:null,apparentF:null,windMph:null,validAt:null,
    waterF:null,waterStation:null,waterDistanceMiles:null,
    heading:'Beach-air outlook unavailable',
    narrative:'The area forecast is not available or is too old to interpret. Check the official forecast before leaving.',
    waterNote:'No current NOAA water observation is available near this beach.',
    limitation:'No measured beach-air temperature or calibrated shoreline correction is available.'};
  if(!beach||!LAKES.includes(beach.lake)||!weather||!now||!Number.isFinite(now.getTime()))return base;
  const current=weather.current||{};
  const validAt=current.valid_at_utc;
  const ms=Date.parse(validAt||'');
  const age=now.getTime()-ms;
  const air=current.temperature_f;
  if(!valid(air,LIMIT.airMin,LIMIT.airMax)||!Number.isFinite(ms)||
      age>LIMIT.ageHours*3600000||age< -LIMIT.ageHours*3600000)return base;
  const apparent=valid(current.apparent_temperature_f,LIMIT.apparentMin,LIMIT.apparentMax)
    ?Math.round(current.apparent_temperature_f):null;
  const wind=valid(current.wind_mph,0,LIMIT.windMax)?Math.round(current.wind_mph):null;
  let heading='Notice the air beside the lake';
  let narrative='Air along the Great Lakes can change quickly. Notice the breeze when you leave shelter for the open shore.';
  if(wind!==null&&wind>=18){
    heading='A brisk breeze on the open shore';
    narrative='Once you step onto exposed sand, the wind can draw warmth from skin and damp clothing. Bring an extra layer if you plan to linger after swimming.';
  }else if(wind!==null&&wind>=9){
    heading='The breeze is part of the beach experience';
    narrative='The wind may feel more noticeable out on open sand than it does behind trees or buildings. When you come out of the water, wet skin cools faster in moving air.';
  }else if(wind!==null){
    heading='A lighter breeze by the water';
    narrative='A lighter area wind can make an outdoor visit feel more settled, though lake breezes can develop or shift during the day. Watch the water and shoreline flags when you arrive.';
  }
  const waterValid=lake?.fresh===true&&valid(lake.water_temp_f,32,100);
  const waterF=waterValid?Math.round(lake.water_temp_f):null;
  const distance=waterValid&&valid(lake.distance_miles,0,300)
    ?Math.round(lake.distance_miles*10)/10:null;
  const station=waterValid&&/^\d{5}$/.test(String(lake.station_id||''))?String(lake.station_id):null;
  let waterNote='No recent matching offshore NOAA water observation is available. The lake may differ greatly from the beach shallows.';
  if(waterValid){
    waterNote='A recent NOAA offshore station reports '+waterF+'°F'+
      (distance!==null?' from '+distance+' miles away':'')+
      '. That is an open-water observation, not the temperature at the swimming area.';
  }
  return {status:'forecast-based',source:'Open-Meteo location forecast',
    airF:Math.round(air),apparentF:apparent,windMph:wind,
    validAt,waterF,waterStation:station,waterDistanceMiles:distance,
    heading,narrative,waterNote,
    limitation:'The air and apparent temperatures are modeled conditions for the beach location, not a thermometer on the sand. Nearby water readings come from separate NOAA offshore stations. No beach-air cooling or warming correction has been calibrated.'};
}

module.exports={LAKES,sourceUtc,beachConditions};
