'use strict';
// One shoreline interpretation across NWS, ECCC and (eventually) other approved
// area forecasts. The apparent temperature remains that of the named provider.
// NOAA's offshore water pixel can explain lake influence, never alter the number.
const {beachFeel}=require('./beach-feel.js');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function interpretShoreline({weather,water,beach,lake,provider,apparentF,apparentMethod,now=new Date()}){
 const point=beach?.reference||beach;
 const waterAt=Date.parse(water?.observedAt||'');
 const waterAge=Number.isFinite(waterAt)&&Number.isFinite(now?.getTime?.())
   ?(now.getTime()-waterAt)/3600000:NaN;
 const goodWater=water?.kind==='satellite'&&finite(water.tempF)&&
   finite(water.sampleLat)&&finite(water.sampleLon)&&
   finite(water.distanceKm)&&water.distanceKm>=0&&water.distanceKm<=4&&
   waterAge>=0&&waterAge<=36;
 const qualified=goodWater?water:null;
 const ref=qualified?{lat:qualified.sampleLat,lon:qualified.sampleLon}:null;
 const normalized=weather&&{
  startsAt:weather.startsAt,tempF:weather.tempF,windMph:weather.windMph,
  windDirection:weather.windDirection,humidity:weather.humidity
 };
 const result=beachFeel(normalized,qualified,point,ref,now,
  {waterBody:lake==='Great Lakes'?'nearby Great Lakes water':'Lake '+lake,shoreWord:'lake'});
 const ready=result.status==='forecast-based'&&finite(apparentF);
 const validWater=ready&&!!qualified;
 const windStatus=validWater?result.windExposure:'unknown';
 const contrast=validWater?result.waterAirContrastF:null;
 const basis=(provider==='ECCC'?'ECCC nearby-city':'NWS land-area')+' forecast';
 const contrastNote=contrast===null?'':Math.abs(contrast)<0.1
  ?'The modeled area-air and analyzed offshore-water temperatures are approximately equal. '
  :'The '+basis+' air is '+Math.abs(contrast).toFixed(1)+'°F '+(contrast>=0?'warmer':'cooler')+' than that offshore-water analysis, NOT an on-sand air correction. ';
 const prefix=validWater
  ?'NOAA GLSEA analyzed offshore water '+water.tempF.toFixed(1)+'°F, '+water.distanceKm+' km from the named shoreline, dated '+water.observedAt+'. '+contrastNote
  :'No recent, sufficiently close NOAA offshore water pixel was verified. ';
 let label='Local lake influence not verified';
 let explanation='The '+basis+' gives a forecast air-comfort value, not a beach thermometer. With no trustworthy nearby lake-water reference, a temperature change at the sand cannot be calculated.';
 if(ready&&validWater){
  if(windStatus==='onshore'&&contrast>=8){
   label='Possible cooling from lake wind';
   explanation=prefix+'The '+basis+' wind direction points toward this beach from the nearest analyzed water. Lake moderation could make the exposed shore cooler than sheltered inland areas, but no measured or calibrated degree change is available.';
  }else if(windStatus==='onshore'&&contrast<=-8){
   label='Possible warming from lake wind';
   explanation=prefix+'The '+basis+' wind direction comes from the nearby analyzed water, which is warmer than forecast air. Shoreline moderation is plausible, but the size of any warming is not measured.';
  }else if(windStatus==='onshore'){
   label='Wind forecast from lake direction';
   explanation=prefix+'The '+basis+' wind is from the direction of the nearby analyzed water. This is not proof of a local lake breeze, and no degree correction is established.';
  }else if(windStatus==='offshore'){
   label='Wind forecast from land direction';
   explanation=prefix+'The '+basis+' wind points toward the nearby water. Lake-driven cooling is less directly indicated, but local shifts could still occur.';
  }else if(windStatus==='alongshore'){
   label='Wind forecast along the shore';
   explanation=prefix+'The '+basis+' wind runs approximately parallel to the direction of the nearest analyzed water. No local beach-air change can be inferred.';
  }else{
   explanation=prefix+'The '+basis+' has no sufficiently resolved wind direction for comparison. The lake effect on the sand is unknown.';
  }
 }
 return {
  status:ready?'forecast-based':'unavailable',version:'shorefeel-unified-evidence-v1',
  temperatureF:ready?apparentF:null,method:ready?apparentMethod:null,
  water:validWater?water:null,windExposure:windStatus,
  waterAirContrastF:contrast,origin:'Area meteorological forecast; separate NOAA offshore water analysis',
  lakeEffect:{status:validWater?'contextual':'unverified',label,explanation,
   bearingBasis:validWater?'Bearing to nearest valid NOAA water pixel, an approximation rather than surveyed coast orientation':'unavailable'},
  calibratedOnSand:false,beachAirCorrectionF:null,
  limitation:'NWS/ECCC apparent air comfort is based on area forecasts; the NOAA analyzed lake-water pixel is not the water at the swimming area. Wind direction and water cannot establish a numeric beach-air cooling correction or a swimming-safety decision.'
 };
}
module.exports={interpretShoreline};
