/* The shore-visit decision: source-checked and falsifiable, not a second ETA model.
 * All 6 locations get a named shore choice and a truthful next action.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)root.FreighterWatchDecision=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const MAX_WEATHER_AGE=35*60*1000;
const EARTH_NM=3440.065;
function validAge(iso,now,maxAge){
 const time=Date.parse(iso||'');
 return Number.isFinite(time)&&time<=now+60000&&now-time>=-60000&&now-time<=maxAge;
}
function distanceNm(a,b){
 const lat1=Number(a?.lat),lon1=Number(a?.lon),lat2=Number(b?.lat),lon2=Number(b?.lon);
 if(![lat1,lon1,lat2,lon2].every(Number.isFinite))return null;
 const r=Math.PI/180,dy=(lat2-lat1)*r,dx=(lon2-lon1)*r;
 const h=Math.sin(dy/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dx/2)**2;
 return 2*EARTH_NM*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function localParts(t,zone){
 const date=new Date(t);
 if(!Number.isFinite(date.getTime()))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
   timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
   hourCycle:'h23',minute:'2-digit'
 }).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 return {year:parts.year,month:parts.month,day:parts.day,hour:parts.hour,minute:parts.minute};
}
function dayKey(t,zone){
 const p=localParts(t,zone);
 return p?String(p.year)+'-'+String(p.month).padStart(2,'0')+'-'+String(p.day).padStart(2,'0'):'';
}
function tomorrowKey(now,zone){
 const p=localParts(now,zone);if(!p)return '';
 const x=new Date(Date.UTC(p.year,p.month-1,p.day+1));
 return x.toISOString().slice(0,10);
}
function formatClock(iso,zone){
 return new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
}
function publishedAccess(site,targetMs,now){
 const hours=Array.isArray(site?.hoursByMonth)?site.hoursByMonth:null;
 const reviewed=Date.parse(String(site?.reviewed||'')+'T12:00:00Z');
 const recent=Number.isFinite(reviewed)&&now>=reviewed-86400000&&now-reviewed<=180*86400000;
 const note=site?.notes||'Check the current official location rules before traveling.';
 if(!hours)return {level:'unverified',label:'Access hours not established',note:note+' No live closure verification is available.'};
 const local=localParts(targetMs,site.zone);
 const limits=local&&hours[local.month-1];
 if(!limits||!Number.isInteger(limits[0])||!Number.isInteger(limits[1]))
   return {level:'unverified',label:'Access schedule incomplete',note};
 const within=local.hour>=limits[0]&&local.hour<limits[1];
 const fmt=h=>h>12?String(h-12)+' PM':h===12?'12 PM':h===0?'12 AM':String(h)+' AM';
 const schedule='Published general hours '+fmt(limits[0])+'–'+fmt(limits[1])+'. ';
 if(!recent)return {level:'unverified',label:'Reconfirm published hours',note:schedule+'The source review is older than six months. '+note};
 if(!within)return {level:'outside',label:'Outside published hours',note:schedule+'This selected hour falls outside the published general park schedule. '+note};
 return {level:'published',label:'Within published hours',note:schedule+'This is not a live closure check. '+note};
}
function chooseHour(weather,when,window,now,zone){
 if(!weather?.ok||!validAge(weather.checkedAt,now,MAX_WEATHER_AGE)||!Array.isArray(weather.periods))
   return {level:'unknown',label:'Weather not verified',note:'The NWS hourly forecast is unavailable or older than 35 minutes. Check NWS before leaving.',at:null,period:null,alerts:[]};
 const valid=weather.periods.filter(p=>Number.isFinite(Date.parse(p?.starts||''))&&
   Number.isFinite(Date.parse(p?.ends||''))&&Date.parse(p.ends)>Date.parse(p.starts)&&Date.parse(p.ends)>now-3600000);
 if(!valid.length)return {level:'unknown',label:'No usable hourly forecast',note:'NWS returned no forecast for the chosen period.',at:null,period:null,alerts:[]};
 let selected=null;
 let target=window?Math.max(now,Date.parse(window.start)):when==='tomorrow'?null:now+20*60000;
 if(when==='tomorrow'){
   const key=tomorrowKey(now,zone);
   selected=valid.filter(p=>dayKey(p.starts,zone)===key&&p.isDaytime===true)
     .sort((a,b)=>Math.abs(localParts(a.starts,zone).hour-13)-Math.abs(localParts(b.starts,zone).hour-13))[0]||null;
 }else{
   selected=valid.find(p=>Date.parse(p.starts)<=target&&Date.parse(p.ends)>target)||
     valid.find(p=>Date.parse(p.starts)>=target&&Date.parse(p.starts)<=target+4*3600000)||null;
 }
 if(!selected)return {level:'unknown',label:'Chosen-hour forecast unavailable',note:'Do not substitute an unrelated hour or an earlier day for your viewing time.',at:null,period:null,alerts:[]};
 target=Math.max(now,Date.parse(selected.starts));
 const severity=(Array.isArray(weather.alerts)?weather.alerts:[]).filter(a=>{
   const start=Date.parse(a.starts||'');
   const end=Date.parse(a.expires||'');
   return (!Number.isFinite(start)||start<=target)&&(!Number.isFinite(end)||end>target);
 });
 const important=severity.filter(a=>['Severe','Extreme'].includes(a.severity));
 const hardWind=selected.windMph!==null&&selected.windMph>=35;
 const highPrecip=selected.precipProbability!==null&&selected.precipProbability>=75;
 const dark=selected.isDaytime===false;
 const cold=selected.temperatureF!==null&&selected.temperatureF<=25;
 const wind=selected.windMph!==null&&selected.windMph>=18;
 const rain=selected.precipProbability!==null&&selected.precipProbability>=45;
 const weatherSummary=[
   selected.temperatureF===null?null:Math.round(selected.temperatureF)+'°F',
   selected.windMph===null?null:'wind up to '+selected.windMph+' mph',
   selected.precipProbability===null?null:selected.precipProbability+'% precipitation chance',
   selected.shortForecast||null
 ].filter(Boolean).join(' · ');
 let level='favorable',label='No major hourly limiter identified';
 if(important.length||hardWind) {level='avoid';label=important.length?'Active severe NWS alert':'Very strong forecast wind';}
 else if(dark||highPrecip||cold||wind||rain){level='caution';label=dark?'Viewing hour is after dark':'Conditions may be uncomfortable';}
 if(weather.alertsStatus!=='available'&&level==='favorable') {level='unverified';label='Weather alerts could not be checked';}
 return {level,label,
   note:weatherSummary+(important.length?' · Alert: '+important.map(a=>a.event).join(', '):'')+
     (weather.alertsStatus!=='available'?' · NWS active alerts not verified.':'')+
     ' · NWS hourly shore forecast, not an observed condition or safety clearance.',
   at:selected.starts,period:selected,alerts:severity,
   sourceUrl:weather.sourceUrl,checkedAt:weather.checkedAt
 };
}
function recentNear(result,site,now){
 if(!result||result.status==='unavailable'||!result.checkedAt||!validAge(result.checkedAt,now,3*60000))return null;
 const vessels=(Array.isArray(result.observations)?result.observations:[])
   .map(v=>({v,distance:distanceNm(v,site)}))
   .filter(x=>x.distance!==null&&x.distance<=Math.min(4,Number(site?.nearNm)||3)&&
     validAge(x.v.seen,now,10*60000)&&Number(x.v.speedKnots)>=1.2&&
     (Number(x.v.lengthMeters)>=130||(Number(x.v.shipType)>=70&&Number(x.v.shipType)<90)))
   .sort((a,b)=>a.distance-b.distance);
 return vessels[0]||null;
}
function recommendation(result,context,now=Date.now()){
 const site=context?.site||null;
 if(!site)return {code:'NO_SITE',tone:'unknown',title:'Viewing location unavailable',
   summary:'The park source is unavailable. Please use the site guide below.',where:'Unverified',when:'Unverified',
   why:[],access:null,weather:null,ship:null,site:null};
 const when=result?.when||'today';
 const window=result?.status==='window'?result.pick?.window:null;
 const ship=window?result.pick.ship:null;
 const near=recentNear(result,site,now);
 const weather=chooseHour(context?.weather,when,window,now,site.zone);
 const target=window?Math.max(now,Date.parse(window.start)):weather.at?Date.parse(weather.at):when==='tomorrow'?now+24*3600000:now;
 const access=publishedAccess(site,target,now);
 const blocked=access.level==='outside';
 const risk=weather.level==='avoid';
 let code,title,summary,whenText,why=[];
 if(window&&ship){
   const starts=Date.parse(window.start),ends=Date.parse(window.end);
   const arrive=new Date(Math.max(now,starts-20*60000)).toISOString();
   whenText= 'Modeled passage '+formatClock(window.start,site.zone)+'–'+formatClock(window.end,site.zone)+
     '. Aim to be at the public shore by '+formatClock(arrive,site.zone)+', allowing your own travel and parking time.';
   title='A possible passage: '+(ship.name||'reported vessel');
   summary='The existing '+(site.id==='soo'?'Soo Locks':'Duluth canal')+
     ' engine supports a bounded window from recent AIS movement. This is not a confirmed arrival or a reservation.';
   code='PLAN_WINDOW';
   why.push('AIS-based corridor prediction is available; ships can wait, stop, turn or use another approach.');
   if(starts-now<20*60000)why.push('The window begins soon: only consider this if you are already close enough.');
   if(Number.isFinite(ship.confidence))why.push('Source-model confidence is not a calibrated probability of seeing the ship.');
 }else if(when==='tomorrow'){
   code='PLAN_SHORE';title='Plan a shore stop, not a ship arrival';
   summary='There is no verified ship passage for tomorrow. You can choose a public viewing location and check the live AIS again shortly before leaving.';
   whenText=weather.at?'Forecast reference for '+formatClock(weather.at,site.zone)+'. No vessel schedule for that hour.':'Tomorrow: choose a time after checking posted park hours and current weather.';
   why.push('Tomorrow’s forecast describes the shore, not tomorrow’s ship movements.');
 }else if(near){
   code='NEARBY_ONLY';title='Worth a look if you are already nearby';
   summary=(near.v.name||'A commercial vessel')+' last reported moving within about '+
     near.distance.toFixed(1)+' nautical miles of the general shore reference. That does not establish its route, berth, or visibility from this spot.';
   whenText='Check now; this ship may stop, turn or disappear from AIS coverage. No future passage time is supported.';
   why.push('A recent moving AIS report is close to the selected area, but it is not a shore-sighting forecast.');
 }else {
   code='NO_SHIP_TRIP';title='Do not make a trip solely for a ship yet';
   summary=result?.status==='unavailable'
     ?'The live vessel check is unavailable. We cannot determine which ships may be near this shoreline.'
     :'There is no recent moving commercial vessel close enough to this viewing area to justify a ship-specific recommendation. Other ships in the broad map region may be far away or stationary.';
   whenText='Recheck AIS closer to departure. No reliable arrival window is available for your selected time.';
   why.push('The broad AIS map is not a schedule, and an empty or stale receiver report does not prove the waterway is empty.');
 }
 if(blocked){
   code='HOURS_CONFLICT';title='Not at this time: published park hours conflict';
   summary='The selected visit would fall outside this location’s posted general hours. A ship report cannot override access rules.';
   why.push('Check the official land-manager page for possible schedule changes, closures and alternative viewpoints.');
 }else if(risk){
   code='WEATHER_HOLD';title='Reconsider the outdoor trip: weather concern';
   summary='The NWS forecast or active severe alert raises a material outdoor exposure concern. Do not treat a ship prediction as a reason to overlook it.';
   why.push('Weather is a separate constraint and can override a promising ship position.');
 }else if(code==='PLAN_WINDOW'&&weather.level!=='favorable'){
   code='VERIFY_BEFORE_TRAVEL';title='Possible passage, but verify conditions first';
   why.push('Do not interpret missing weather/alert information or adverse conditions as a GO signal.');
 }else if(code==='PLAN_WINDOW'&&access.level!=='published'){
   code='VERIFY_BEFORE_TRAVEL';title='Possible passage; public access still needs checking';
   why.push('The site is named from official information, but current operating access is not independently confirmed.');
 }else if(code==='PLAN_WINDOW'){
   code='PROMISING';title='Worth considering a shoreline visit for '+(ship.name||'this vessel');
   why.push('Published hours include this time; they do not verify that gates or facilities are open today.');
 }
 if(weather.level==='unknown')why.push('Hourly weather is missing or stale; check NWS before leaving.');
 if(access.level==='unverified')why.push('No current, affirmative site-opening determination is available.');
 return {code,tone:['PROMISING'].includes(code)?'supported':
   ['HOURS_CONFLICT','WEATHER_HOLD'].includes(code)?'hold':
   ['NO_SHIP_TRIP','PLAN_SHORE'].includes(code)?'no-schedule':'conditional',
   title,summary,where:site.name+' · '+site.address,when:whenText,why,
   weather,access,ship:ship||near?.v||null,site,nearNm:near?.distance??null,
   disclaimer:'This recommends an observation plan, never guarantees a ship sighting, navigational safety, or live public access.'};
}
return {recommendation,chooseHour,publishedAccess,recentNear,distanceNm,formatClock,validAge,dayKey};
});