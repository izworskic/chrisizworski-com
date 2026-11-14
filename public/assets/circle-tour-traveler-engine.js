/* Source-constrained, visitor-first Circle Tour policy. No invented routes. */
(function(root){
'use strict';
const OPTIONS=[7,10,15],FOCUS=['hiking','waterfalls','shipwatch'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DEFAULTS=Object.freeze({days:10,maxDrive:5,month:8,interests:['hiking','waterfalls'],pictured:true});
function settings(raw={}){
 const days=Number(raw.days),drive=Number(raw.maxDrive),month=Number(raw.month);
 return {days:OPTIONS.includes(days)?days:10,
 maxDrive:[4,5,6,8].includes(drive)?drive:5,
 month:Number.isInteger(month)&&month>=1&&month<=12?month:8,
 interests:Array.isArray(raw.interests)?FOCUS.filter(x=>raw.interests.includes(x)):DEFAULTS.interests.slice(),
 pictured:raw.pictured===false?false:raw.pictured===true?true:true};
}
function sampleDrive(miles){return Math.round(miles/47*1.2*10)/10;}
function dayPolicy(day,p,kernel){
 const calculated=day.miles/47*1.2,exceeds=calculated>p.maxDrive+0.000001;
 const seasonal=[11,12,1,2,3,4].includes(p.month)&&day.seasonalSensitive;
 const state=kernel?.feasibility?.({
   miles:day.miles,availableHours:p.maxDrive+1+day.borderReserveMinutes/60,
   visitHours:1,borderMinutes:day.borderReserveMinutes,
   evidenceComplete:day.complete,seasonalHold:seasonal});
 const code=Number.isInteger(state?.code)?state.code:
  !day.complete?4:seasonal?5:exceeds?3:p.maxDrive-calculated<.75?2:1;
 const label=!day.complete?'Road approach needs verifying':
   seasonal?'Seasonal access needs checking':
   exceeds?'Over your driving preference':
   p.maxDrive-calculated<.75?'Little driving margin':'Within sample driving budget';
 return {...day,driveHours:sampleDrive(day.miles),exceeds,seasonalHold:seasonal,code,label};
}
function suggestions(day,p,specialists){
 return (day.highlights||[]).filter(id=>specialists[id]).map(id=>{
  const v=specialists[id];
  return {id,...v,score:(id==='11'&&p.pictured?10:0)+
    v.interests.reduce((n,x)=>n+(p.interests.includes(x)?3:0),0)};
 }).sort((a,b)=>b.score-a.score).slice(0,2);
}
function compare(source,raw,kernel){
 if(source?.version!==1||source.start!=='Duluth, Minnesota'||source.direction!=='counterclockwise')
  throw Error('Unverified published route source');
 const p=settings(raw),list={};
 for(const duration of OPTIONS){
  const published=source.options?.[String(duration)];
  if(!published||!Array.isArray(published.days)||published.days.length!==duration)
   throw Error('Missing source itinerary '+duration);
  const days=published.days.map(d=>{
    const value=dayPolicy(d,p,kernel);
    return {...value,suggestions:suggestions(d,p,source.specialists||{})};
  });
  list[String(duration)]={duration,days,over:days.filter(x=>x.exceeds).length,
   uncertain:days.filter(x=>!x.complete).length,
   seasonal:days.filter(x=>x.seasonalHold).length,
   editorialMiles:published.totalEditorialMiles};
 }
 const chosen=list[String(p.days)];
 const good=OPTIONS.filter(d=>d>=p.days&&list[String(d)].over===0);
 const improved=OPTIONS.filter(d=>d>p.days&&list[String(d)].over<chosen.over);
 const next=chosen.over?(good[0]??improved[0]??null):null;
 return {settings:p,chosen,options:list,alternative:next,monthName:MONTHS[p.month-1]};
}
const api=Object.freeze({DEFAULTS,FOCUS,MONTHS,settings,compare,sampleDrive});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CircleTourTraveler=api;
})(typeof window==='undefined'?null:window);
