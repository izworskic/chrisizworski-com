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
function publishedAccess(site,targetMs,now,windowEndMs=null){
 const hours=Array.isArray(site?.hoursByMonth)?site.hoursByMonth:null;
 const reviewed=Date.parse(String(site?.reviewed||'')+'T12:00:00Z');
 const recent=Number.isFinite(reviewed)&&now>=reviewed-86400000&&now-reviewed<=180*86400000;
 const note=site?.notes||'Check posted site rules and current official notices for this shoreline.';
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
 // A model window is not usable merely because its first minute is inside opening hours.
 // Check the final minute, including the local calendar day. A different day's
 // opening hours must never make an overnight or closing-time overlap look open.
 if(Number.isFinite(windowEndMs)&&windowEndMs>targetMs){
   const finish=localParts(windowEndMs-1,site.zone);
   const sameDay=finish&&finish.year===local.year&&finish.month===local.month&&finish.day===local.day;
   const fullWindowInside=sameDay&&finish.hour>=limits[0]&&finish.hour<limits[1];
   if(!fullWindowInside)return {level:'partial',label:'Only part of the ship window fits published hours',
     note:schedule+'The estimated passage window extends outside published park hours. The vessel may not pass before closing; do not assume the public park stays open for the full estimate. '+note};
 }
 return {level:'published',
   label:Number.isFinite(windowEndMs)&&windowEndMs>targetMs
     ?'Full modeled window within published hours'
     :'Selected viewing hour within published hours',
   note:schedule+'This is not a live closure check. '+note};
}
function chooseHour(weather,when,window,now,zone){
 if(!weather?.ok||!validAge(weather.checkedAt,now,MAX_WEATHER_AGE)||!Array.isArray(weather.periods))
   return {level:'unknown',label:'Weather not verified',note:'The NWS hourly forecast is unavailable or older than 35 minutes. Check NWS before leaving.',at:null,period:null,alerts:[]};
 const valid=weather.periods.filter(p=>Number.isFinite(Date.parse(p?.starts||''))&&
   Number.isFinite(Date.parse(p?.ends||''))&&Date.parse(p.ends)>Date.parse(p.starts)&&Date.parse(p.ends)>now-3600000)
   .sort((a,b)=>Date.parse(a.starts)-Date.parse(b.starts));
 if(!valid.length)return {level:'unknown',label:'No usable hourly forecast',note:'NWS returned no forecast for the chosen period.',at:null,period:null,alerts:[]};
 const start=window?Math.max(now,Date.parse(window.start)):null;
 const finish=window?Date.parse(window.end):null;
 let selected=null;
 let target=start===null?when==='tomorrow'?null:now+20*60000:start;
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
 // A visit spanning hours must check every relevant hourly interval, not just
 // the initial conditions. Incomplete time coverage cannot become favorable.
 const fullWindow=Number.isFinite(start)&&Number.isFinite(finish)&&finish>start;
 const watchStart=fullWindow?start:Date.parse(selected.starts);
 const watchEnd=fullWindow?finish:Date.parse(selected.ends);
 const scope=valid.filter(p=>Date.parse(p.starts)<watchEnd&&Date.parse(p.ends)>watchStart);
 let cursor=watchStart;
 for(const p of scope) {
   const a=Date.parse(p.starts),b=Date.parse(p.ends);
   if(a>cursor)break;
   cursor=Math.max(cursor,b);
 }
 const fullyCovered=scope.length>0&&cursor>=watchEnd;
 const effective=scope.length?scope:[selected];
 const overlappingAlerts=(Array.isArray(weather.alerts)?weather.alerts:[]).filter(a=>{
   const aStart=Date.parse(a.starts||''),aEnd=Date.parse(a.expires||'');
   return (!Number.isFinite(aStart)||aStart<watchEnd)&&(!Number.isFinite(aEnd)||aEnd>watchStart);
 });
 const important=overlappingAlerts.filter(a=>['Severe','Extreme'].includes(a.severity));
 const hardWind=effective.some(p=>p.windMph!==null&&p.windMph>=35);
 const highPrecip=effective.some(p=>p.precipProbability!==null&&p.precipProbability>=75);
 const dark=effective.some(p=>p.isDaytime===false);
 const cold=effective.some(p=>p.temperatureF!==null&&p.temperatureF<=25);
 const wind=effective.some(p=>p.windMph!==null&&p.windMph>=18);
 const rain=effective.some(p=>p.precipProbability!==null&&p.precipProbability>=45);
 const windValues=effective.map(p=>p.windMph).filter(Number.isFinite);
 const precipValues=effective.map(p=>p.precipProbability).filter(Number.isFinite);
 const tempValues=effective.map(p=>p.temperatureF).filter(Number.isFinite);
 const weatherSummary=[
   tempValues.length?(Math.round(Math.min(...tempValues))+'–'+Math.round(Math.max(...tempValues))+'°F'):null,
   windValues.length?'wind up to '+Math.max(...windValues)+' mph':null,
   precipValues.length?Math.max(...precipValues)+'% highest hourly precipitation chance':null,
   selected.shortForecast||null
 ].filter(Boolean).join(' · ');
 let level='favorable',label='No major hourly limiter identified';
 if(important.length||hardWind) {level='avoid';label=important.length?'Active severe NWS alert in visit window':'Very strong forecast wind in visit window';}
 else if(!fullyCovered){level='unknown';label='Forecast incomplete for the full viewing window';}
 else if(dark||highPrecip||cold||wind||rain){level='caution';label=dark?'Part of the viewing window is after dark':'Conditions may be uncomfortable';}
 if(weather.alertsStatus!=='available'&&level==='favorable') {level='unverified';label='Weather alerts could not be checked';}
 return {level,label,
   note:weatherSummary+(important.length?' · Alert: '+important.map(a=>a.event).join(', '):'')+
     (fullWindow&&!fullyCovered?' · NWS forecast does not cover the whole ship window.':'')+
     (weather.alertsStatus!=='available'?' · NWS active alerts not verified.':'')+
     ' · NWS hourly shore forecast for the viewing window, not observed conditions or safety clearance.',
   at:selected.starts,period:selected,alerts:overlappingAlerts,
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
 const access=publishedAccess(site,target,now,window?Date.parse(window.end):null);
 const blocked=access.level==='outside'||access.level==='partial';
 const risk=weather.level==='avoid';
 let code,title,summary,whenText,why=[];
 if(result?.status==='in-lock'&&result.inLock&&validAge(result.inLock.seen,now,8*60000)){
   code='LOCAL_IN_LOCK';
   title='Look toward the locks: '+(result.inLock.name||'a commercial vessel')+' reported in a chamber';
   summary='The Soo Locks engine identified this vessel inside '+(result.inLock.chamberName||'a lock chamber')+
     '. If you are at the waterfront, look toward the chamber and follow its current position. It may move at any time.';
   whenText='Look now. Last AIS report '+formatClock(result.inLock.seen,site.zone)+
     '. This is an observed in-chamber position, not a future passage estimate.';
   why.push('The in-lock state comes from the specialist chamber engine, not a guessed itinerary.');
 }else if(window&&ship){
   const starts=Date.parse(window.start),ends=Date.parse(window.end);
   const arrive=new Date(Math.max(now,starts-20*60000)).toISOString();
   whenText= 'Modeled passage '+formatClock(window.start,site.zone)+'–'+formatClock(window.end,site.zone)+
     '. If you are already on the waterfront, watch during this interval. If a short walk away, be at the viewing area by '+formatClock(arrive,site.zone)+'.';
   title='Watch for '+(ship.name||'a reported vessel');
   summary='The existing '+(site.id==='soo'?'Soo Locks':'Duluth canal')+
     ' engine supports a bounded passage window from recent AIS movement. Use it to decide when to watch from this shoreline; a sighting is not guaranteed.';
   code='PLAN_WINDOW';
   why.push('AIS-based corridor prediction is available; ships can wait, stop, turn or use another approach.');
   if(starts-now<20*60000)why.push('The window begins soon: scan the waterway and map now.');
   if(ends-starts>120*60000)why.push('This broad prediction spans more than two hours. It does not justify assuming the ship will pass at any particular moment.');
   if(Number.isFinite(ship.confidence))why.push('Source-model confidence is not a calibrated probability of seeing the ship.');
 }else if(when==='tomorrow'){
   code='PLAN_SHORE';title='No confirmed ship passage for tomorrow yet';
   summary='Tomorrow’s ships are not established by today’s AIS. When you are at this shoreline, refresh the vessel reports to see what is actually nearby.';
   whenText=weather.at?'Forecast reference for '+formatClock(weather.at,site.zone)+'. This is a weather hour, not a ship passage time.':'No reliable ship time for tomorrow. Check live reports when you are there.';
   why.push('Tomorrow’s forecast describes the shore, not tomorrow’s ship movements.');
 }else if(near){
   code='NEARBY_ONLY';title='Moving freighter reported near this shoreline';
   summary=(near.v.name||'A commercial vessel')+' last reported moving within about '+
     near.distance.toFixed(1)+' nautical miles of the general shore reference. That does not establish its route, berth, or visibility from this spot.';
   whenText='Look toward the waterway and check the ship marker now. AIS does not confirm when or whether it will pass this particular viewpoint.';
   why.push('A recent moving AIS report is close to the selected area, but it is not a shore-sighting forecast.');
 }else {
   code='NO_CLOSE_REPORT';title=result?.status==='unavailable'?'Live ship positions unavailable right now':'No nearby moving freighter confirmed right now';
   summary=result?.status==='unavailable'
     ?'The live vessel check could not be completed. You can still watch the waterway, but there is no fresh evidence to identify which vessel to look for.'
     :'Current AIS reports do not identify a nearby moving commercial vessel for this viewing area. Ships farther out, stationary vessels, or vessels missing from receivers may still be on the water.';
   whenText='No supported passage time for this location. Keep an eye on the waterway, or refresh the vessel reports in a few minutes.';
   why.push('The broad AIS map is not a schedule, and an empty or stale receiver report does not prove the waterway is empty.');
 }
 if(blocked){
   code='HOURS_CONFLICT';
   if(access.level==='partial'){
     title='Ship window runs beyond published park hours';
     summary='Only the early portion of this estimated passage window falls within posted park hours. The ship could arrive after closing. Watch only while public access is permitted.';
     whenText+=' The modeled window extends beyond posted access hours. Do not expect the park to remain open until the predicted end.';
     why.push('A ship might arrive after closing. Follow posted signs and current land-manager notices.');
   }else{
     title='Viewing area may be closed at this hour';
     summary='The time you selected is outside this location’s published general hours. Do not enter or remain in a closed public area to watch a vessel.';
     why.push('Check the official land-manager page for possible schedule changes, closures and alternative viewpoints.');
   }
 }else if(risk){
   code='WEATHER_HOLD';title='Severe weather concern at this shoreline';
   summary='The NWS forecast or a severe alert signals potentially hazardous exposure at the shoreline. Prioritize shelter and current official warnings over ship watching.';
   why.push('Weather is a separate constraint and can override a promising ship position.');
 }else if(code==='PLAN_WINDOW'&&weather.level!=='favorable'){
   code='VERIFY_BEFORE_TRAVEL';title='Possible passage; check conditions while watching';
   why.push('Unknown or adverse shore conditions are not an all-clear for staying at the waterfront.');
 }else if(code==='PLAN_WINDOW'&&access.level!=='published'){
   code='VERIFY_BEFORE_TRAVEL';title='Possible passage; confirm this viewing area is accessible';
   why.push('The site is named from official information, but current operating access is not independently confirmed.');
 }else if(code==='PLAN_WINDOW'){
   code='PROMISING';title='Watch for '+(ship.name||'this vessel')+' during the modeled window';
   why.push('Published hours include this time; they do not verify that gates or facilities are open today.');
 }
 if(weather.level==='unknown')why.push('Hourly weather is missing or stale; check NWS before staying at the exposed shoreline.');
 if(access.level==='unverified')why.push('No current, affirmative site-opening determination is available.');
 return {code,tone:['PROMISING'].includes(code)?'supported':
   ['HOURS_CONFLICT','WEATHER_HOLD'].includes(code)?'hold':
   ['NO_CLOSE_REPORT','PLAN_SHORE'].includes(code)?'no-schedule':'conditional',
   title,summary,where:site.name+' · '+site.address,when:whenText,why,
   weather,access,ship:ship||result?.inLock||near?.v||null,site,nearNm:near?.distance??null,
   disclaimer:'This recommends an observation plan, never guarantees a ship sighting, navigational safety, or live public access.'};
}
return {recommendation,chooseHour,publishedAccess,recentNear,distanceNm,formatClock,validAge,dayKey};
});