(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LighthouseEngine=api;})(typeof window==='undefined'?null:window,function(){
'use strict';
function windMph(v){if(typeof v!=='string'||!/^\d+(?:\s+to\s+\d+)?\s+mph$/.test(v))return null;return Math.max(...v.match(/\d+/g).map(Number));}
function windowChoice(periods,now=Date.now()){
 let best=null;
 for(let i=0;i<periods.length-2;i++){
  const group=periods.slice(i,i+3);
  if(group.some((p,j)=>!p.isDaytime||Date.parse(p.startTime)<now||windMph(p.windSpeed)===null||p.probabilityOfPrecipitation===null||(j&&Date.parse(p.startTime)-Date.parse(group[j-1].startTime)!==3600000)))continue;
  const wind=Math.max(...group.map(p=>windMph(p.windSpeed))),rain=Math.max(...group.map(p=>p.probabilityOfPrecipitation));
  if(wind>15||rain>30||group.some(p=>/thunder|freezing|snow|ice|sleet/i.test(p.shortForecast||'')))continue;
  const cost=wind+rain/3;if(!best||cost<best.cost)best={start:group[0].startTime,end:group[2].endTime,wind,rain,cost};
 }
 return best;
}
// NOAA-style sunrise equation. Approximate astronomical horizon times, not site access or a photo guarantee.
function solar(date,lat,lon){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date)return null;
 const rad=Math.PI/180,day=Math.floor((d-Date.UTC(d.getUTCFullYear(),0,0))/86400000),lng=lon/15;
 function event(rise){const t=day+((rise?6:18)-lng)/24,M=.9856*t-3.289,L=(M+1.916*Math.sin(M*rad)+.020*Math.sin(2*M*rad)+282.634+360)%360;let RA=Math.atan(.91764*Math.tan(L*rad))/rad;RA=(RA+360)%360;RA+=(Math.floor(L/90)*90-Math.floor(RA/90)*90);RA/=15;const sd=.39782*Math.sin(L*rad),cd=Math.cos(Math.asin(sd)),ch=(Math.cos(90.833*rad)-sd*Math.sin(lat*rad))/(cd*Math.cos(lat*rad));if(Math.abs(ch)>1)return null;const H=(rise?360-Math.acos(ch)/rad:Math.acos(ch)/rad)/15,utc=((H+RA-.06571*t-6.622-lng)%24+24)%24;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+utc*3600000);}
 const sunrise=event(true),sunset=event(false);if(!sunrise||!sunset)return null;if(sunset<sunrise)sunset.setUTCDate(sunset.getUTCDate()+1);return {sunrise,sunset,hours:(sunset-sunrise)/3600000};
}
return {windMph,windowChoice,solar};
});
