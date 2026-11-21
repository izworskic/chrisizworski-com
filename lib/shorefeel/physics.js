'use strict';
// Research-stage shoreline air model. This is NOT an observed beach temperature,
// a calibrated forecast, a confidence interval or a new NWS product.
// Paired NWS hourly fields and NOAA surface water, source age and onshore flow
// are required. The ensemble deliberately exposes parameter uncertainty.
// Physical derivation: rho Cp U h dT/dx = rho Cp Ch U (Tw - T),
// hence T(x) = Tw + (T_inland - Tw) exp(-Ch*x/h) for U>0.
// See docs/SHOREFEEL_PHYSICS_RESEARCH.md and Wolfram audit.

const {offshoreBearing,breezeSector}=require('./beach-feel.js');
const ASSUMPTIONS=Object.freeze({
  crossWaterKm:Object.freeze([2,5,10]),
  mixedLayerMeters:Object.freeze([20,60,150]),
  bulkHeatCoefficient:Object.freeze([0.0008,0.0012,0.002])
});
const INLAND_BAY_COUNTY=Object.freeze({lat:43.6714,lon:-84.1000,expectType:'land',
  label:'West Bay County inland forecast reference (about 16 km west of park)'});
const inRange=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const round=x=>Math.round(x*10)/10;

function parcelTemperatureF(inlandF,waterF,crossWaterKm,mixedDepthM,transferCoefficient){
  if(!inRange(inlandF,-60,140)||!inRange(waterF,25,105)||
    !inRange(crossWaterKm,.01,150)||!inRange(mixedDepthM,1,1000)||
    !inRange(transferCoefficient,0.00001,.03))return null;
  const fetchMeters=crossWaterKm*1000;
  return waterF+(inlandF-waterF)*Math.exp(-transferCoefficient*fetchMeters/mixedDepthM);
}
function hoursFrom(iso,now){
  const ms=Date.parse(iso||'');
  return Number.isFinite(ms)?(now.getTime()-ms)/3600000:null;
}
function forecastGridRelationship(shoreGrid,inlandGrid){
 const hasGrid=g=>g&&typeof g.office==='string'&&g.office.length>0
   &&Number.isInteger(g.x)&&Number.isInteger(g.y);
 if(!hasGrid(shoreGrid)||!hasGrid(inlandGrid))return {
   status:'unverified',description:'One or both NWS grid identities are missing. Independence of the two location forecasts cannot be established.'};
 const same=shoreGrid.office===inlandGrid.office
   &&shoreGrid.x===inlandGrid.x&&shoreGrid.y===inlandGrid.y;
 return {status:same?'same-grid':'distinct-grid',
   shore:{office:shoreGrid.office,x:shoreGrid.x,y:shoreGrid.y},
   inland:{office:inlandGrid.office,x:inlandGrid.x,y:inlandGrid.y},
   description:same?'Both locations resolve to one 2.5 km NWS forecast grid cell. A shore-versus-inland difference is not independently resolved.':
     'The locations resolve to different 2.5 km NWS forecast grid cells. This does not imply measurement at the beach or resolve a quarter-mile microclimate.'};
}
function inlandAndBeachForecast(inland,beach,now,gridRelationship=null){
  if(!inland||!beach||!inRange(inland.tempF,-60,140)||!inRange(beach.tempF,-60,140))return null;
  const a=hoursFrom(inland.startsAt,now),b=hoursFrom(beach.startsAt,now);
  if(a===null||b===null||Math.abs(a)>2||Math.abs(b)>2||
    Math.abs(Date.parse(inland.startsAt)-Date.parse(beach.startsAt))>3600000)return null;
  return {inlandF:inland.tempF,beachNwsF:beach.tempF,
    nwsDifferenceF:round(beach.tempF-inland.tempF),
    inlandStartsAt:inland.startsAt,beachStartsAt:beach.startsAt,
    gridRelationship:gridRelationship||{status:'unverified',description:'NWS grid metadata unavailable'}};
}
function marineAirFromNDBC(raw,now=new Date(),station={}){
  const lines=String(raw||'').split(/\r?\n/);
  const header=(lines.find(l=>/^#(?:YY|YYYY)\s/.test(l))||'')
    .replace(/^#/,'').trim().split(/\s+/);
  const idx=header.indexOf('ATMP');
  if(idx<0)return null;
  let selected=null;
  for(const line of lines){
    if(!line.trim()||line.startsWith('#'))continue;
    const a=line.trim().split(/\s+/);
    if(a.length<=idx)continue;
    let yr=Number(a[0]);if(yr<100)yr+=yr>=70?1900:2000;
    const parts=[yr,...a.slice(1,5).map(Number)];
    const airC=Number(a[idx]);
    if(!parts.every(Number.isInteger)||!inRange(airC,-45,50))continue;
    const [y,mon,day,hour,min]=parts;
    const time=new Date(Date.UTC(y,mon-1,day,hour,min));
    if(time.getUTCFullYear()!==y||time.getUTCMonth()!==mon-1||
      time.getUTCDate()!==day||time.getUTCHours()!==hour||
      time.getUTCMinutes()!==min)continue;
    const age=hoursFrom(time.toISOString(),now);
    if(age===null||age<0||age>6)continue;
    if(!selected||time>new Date(selected.observedAt))
      selected={tempF:round(airC*9/5+32),observedAt:time.toISOString(),
        ageHours:round(age),stationId:station.stationId||'45163',
        source:station.source||'NOAA NDBC air temperature, buoy 45163',
        location:station.location||'Outer Saginaw Bay, offshore and not the park beach'};
  }
  return selected;
}
function scenario(input,now=new Date()){
  const beachWeather=input?.beachWeather,inlandWeather=input?.inlandWeather,
    water=input?.water,beach=input?.beach,waterReference=input?.waterReference;
  const gridRelationship=forecastGridRelationship(input?.shoreGrid,input?.inlandGrid);
  const paired=inlandAndBeachForecast(inlandWeather,beachWeather,now,gridRelationship);
  const airReference=input?.marineAir||null;
  const reference={status:'unavailable',reason:'A paired current inland and shore NWS forecast is required.',
    independentMarineAir:airReference,gridRelationship};
  if(!paired)return reference;
  if(gridRelationship.status!=='distinct-grid'){
    return {...reference,status:'insufficient-data',paired:null,
      reason:gridRelationship.description,
      noIndependentTemperatureDifference:true};
  }
  const diff={...reference,paired,status:'insufficient-data'};
  const age=hoursFrom(water?.observedAt,now);
  if(water?.kind!=='satellite'||!inRange(water?.tempF,25,105)||
     age===null||age<0||age>36){
    diff.reason='A dated NOAA inner-bay satellite surface-water pixel newer than 36 hours is required.';
    return diff;
  }
  const bearing=offshoreBearing(beach,waterReference);
  const sector=breezeSector(beachWeather.windDirection,bearing,beachWeather.windMph);
  diff.windSector=sector;
  if(sector!=='onshore'){
    diff.reason='The NWS forecast does not indicate established onshore wind from the bay. Over-water parcel model is not applied.';
    return diff;
  }
  const contrast=paired.inlandF-water.tempF;
  if(Math.abs(contrast)<5){
    diff.reason='The inland-air to inner-bay-water temperature contrast is under 5°F. A lake-temperature-driven adjustment is not resolved.';
    return diff;
  }
  const samples=[];
  for(const fetchKm of ASSUMPTIONS.crossWaterKm)
    for(const h of ASSUMPTIONS.mixedLayerMeters)
      for(const ch of ASSUMPTIONS.bulkHeatCoefficient){
        const result=parcelTemperatureF(paired.inlandF,water.tempF,fetchKm,h,ch);
        if(result!==null)samples.push(result);
      }
  samples.sort((a,b)=>a-b);
  return {status:'research-only',calibrated:false,validatedAgainstBeachStations:false,
    independentMarineAir:airReference,gridRelationship,paired,waterF:water.tempF,
    waterObservedAt:water.observedAt,waterAgeHours:round(age),
    windSector:sector,windMph:beachWeather.windMph,windDirection:beachWeather.windDirection,
    scenarioCount:samples.length,
    lowF:round(samples[0]),highF:round(samples.at(-1)),medianF:round(samples[Math.floor(samples.length/2)]),
    assumptions:ASSUMPTIONS,
    method:'Idealized heat-exchange parcel relaxation through assumed over-water fetch and assumed mixed-layer depth.',
    reason:'Experimental physical sensitivity envelope, not a confidence interval or verified beach forecast. Fetch, mixing depth and surface transfer coefficients are illustrative assumptions. NWS coastal forecasts may already include lake cooling, so do not add this as a second correction.',
    usableForPublicBeachTemperature:false};
}
module.exports={ASSUMPTIONS,INLAND_BAY_COUNTY,parcelTemperatureF,marineAirFromNDBC,
  inlandAndBeachForecast,forecastGridRelationship,scenario};
