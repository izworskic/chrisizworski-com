'use strict';
// ShoreFeel's beach microclimate interpretation.
// NWS forecast air and humidity support the established NWS wind-chill/heat-index
// calculations. NOAA satellite water and wind-from direction identify possible
// lake moderation; they do NOT establish a numeric shoreline air correction.
// Reference: https://www.weather.gov/apx/lake_breeze
// Heat: https://www.weather.gov/safety/heat-index
// Cold: https://www.weather.gov/safety/cold-wind-chill-chart

const COMPASS={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,
  SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,
  NW:315,NNW:337.5};

function offshoreBearing(beach,waterReference){
  if(!beach||!waterReference)return null;
  const a=[beach.lat,beach.lon,waterReference.lat,waterReference.lon];
  if(!a.every(Number.isFinite))return null;
  const rad=Math.PI/180;
  const dLon=(waterReference.lon-beach.lon)*rad;
  const y=Math.sin(dLon)*Math.cos(waterReference.lat*rad);
  const x=Math.cos(beach.lat*rad)*Math.sin(waterReference.lat*rad)
   -Math.sin(beach.lat*rad)*Math.cos(waterReference.lat*rad)*Math.cos(dLon);
  return (Math.atan2(y,x)/rad+360)%360;
}
function breezeSector(direction,bearing,speed){
  if(!Number.isFinite(bearing)||!Number.isFinite(speed)||speed<3)return 'unknown';
  const from=COMPASS[String(direction||'').toUpperCase()];
  if(!Number.isFinite(from))return 'unknown';
  const separation=Math.abs(((from-bearing+540)%360)-180);
  return separation<=67.5?'onshore':separation>=112.5?'offshore':'alongshore';
}
function apparentTemperature(tempF,windMph,humidity){
  if(!Number.isFinite(tempF))return {tempF:null,method:'unavailable'};
  if(tempF<=50&&Number.isFinite(windMph)&&windMph>3){
    const wc=35.74+0.6215*tempF-35.75*Math.pow(windMph,.16)
      +0.4275*tempF*Math.pow(windMph,.16);
    return {tempF:Math.round(wc),method:'NWS wind chill'};
  }
  if(tempF>=80&&Number.isFinite(humidity)&&humidity>=0&&humidity<=100){
    const rh=humidity;
    const simple=0.5*(tempF+61+1.2*(tempF-68)+.094*rh);
    if((simple+tempF)/2>=80){
      let hi=-42.379+2.04901523*tempF+10.14333127*rh
        -.22475541*tempF*rh-.00683783*tempF**2
        -.05481717*rh**2+.00122874*tempF**2*rh
        +.00085282*tempF*rh**2-.00000199*tempF**2*rh**2;
      if(rh<13&&tempF>=80&&tempF<=112)hi-=((13-rh)/4)*Math.sqrt((17-Math.abs(tempF-95))/17);
      if(rh>85&&tempF>=80&&tempF<=87)hi+=((rh-85)/10)*((87-tempF)/5);
      return {tempF:Math.round(hi),method:'NWS heat index'};
    }
  }
  return {tempF:Math.round(tempF),method:'NWS forecast air'};
}
function beachFeel(weather,water,beach,waterReference,now=new Date(),options={}){
  const waterBody=typeof options?.waterBody==='string'&&/^[A-Za-z ]{4,35}$/.test(options.waterBody)?options.waterBody:'Saginaw Bay';
  const shoreWord=options?.shoreWord==='lake'?'lake':'bay';
  if(!weather||!Number.isFinite(weather.tempF)||!weather.startsAt){
    return {status:'unavailable',label:'Beach feel not available',
      note:'A recent NWS forecast for the park is unavailable. No inland or offshore reading is substituted.'};
  }
  const when=Date.parse(weather.startsAt),age=now.getTime()-when;
  if(!Number.isFinite(when)||!Number.isFinite(age)||age>2*3600000||age< -2*3600000){
    return {status:'unavailable',label:'Beach feel not available',
      note:'The available shoreline-area forecast is outside the current two-hour window.'};
  }
  const airF=weather.tempF,windMph=weather.windMph,humidity=weather.humidity;
  const windFrom=typeof weather.windDirection==='string'?weather.windDirection.toUpperCase():null;
  const apparent=apparentTemperature(airF,windMph,humidity);
  const bearing=offshoreBearing(beach,waterReference);
  const sector=breezeSector(windFrom,bearing,windMph);
  const waterF=water?.kind==='satellite'&&Number.isFinite(water.tempF)?water.tempF:null;
  const diff=Number.isFinite(waterF)?Math.round((airF-waterF)*10)/10:null;
  let label='Shoreline effect uncertain',note='The NWS forecast covers the park area; there is no beach thermometer.';
  if(sector==='onshore'&&diff!==null&&diff>=8){
    label='Lake-breeze cooling possible';
    note='Wind is blowing from '+waterBody+' toward the shore, and nearby water is cooler than forecast air. The beach may be cooler than inland. No exact degree correction is verified.';
  }else if(sector==='onshore'&&diff!==null&&diff<=-8){
    label='Lake moderation possible';
    note='Wind is blowing from the '+shoreWord+', where nearby water is warmer than the forecast air. It may moderate shoreline cold, but the precise air temperature is not measured.';
  }else if(sector==='offshore'){
    label='Wind blowing toward the '+shoreWord;
    note='The forecast wind comes from land, so strong lake-driven shoreline cooling is less directly indicated. A local lake-breeze shift is still possible.';
  }else if(sector==='alongshore'){
    label='Wind along the beach';
    note='Wind is roughly parallel to the shoreline. Water and area air readings alone cannot quantify any beach-temperature difference.';
  }else if(sector==='onshore'){
    label='Wind from the '+shoreWord;
    note='Wind from the '+shoreWord+' is indicated, but a reliable nearby water reading is missing or the temperature contrast is small. No local air correction is justified.';
  }
  const dataLine='NWS '+Math.round(airF)+'°F area air'
    +(Number.isFinite(windMph)?', '+Math.round(windMph)+' mph'+(windFrom?' from '+windFrom:''):'')
    +(Number.isFinite(waterF)?'; NOAA nearby surface water '+waterF.toFixed(1)+'°F':'')
    +'.';
  return {
    status:'forecast-based',airF:Math.round(airF),apparentF:apparent.tempF,apparentMethod:apparent.method,
    windMph:Number.isFinite(windMph)?windMph:null,windFrom,humidity:Number.isFinite(humidity)?humidity:null,
    waterF,windExposure:sector,waterAirContrastF:diff,offshoreBearingDeg:bearing,
    label,note,dataLine,startsAt:weather.startsAt,
    limitation:'The displayed temperature is based on the NWS area forecast, adjusted only by established wind-chill or heat-index formulas when applicable. Water temperature and wind direction inform the lake-breeze interpretation, not an invented number of degrees of beach cooling. Sun, wet skin and small shoreline temperature gradients are not captured.'
  };
}
module.exports={COMPASS,offshoreBearing,breezeSector,apparentTemperature,beachFeel};
