'use strict';
// Sheds are found, not weather-predicted. This module ONLY evaluates search conditions.
const LOCATIONS=[
{id:'bay-city',name:'Bay City / Saginaw Bay',region:'Central Lower',lat:43.5945,lon:-83.8889},
{id:'lansing',name:'Lansing / Mid-Michigan',region:'Central Lower',lat:42.7325,lon:-84.5555},
{id:'grand-rapids',name:'Grand Rapids',region:'Southern Lower',lat:42.9634,lon:-85.6681},
{id:'kalamazoo',name:'Kalamazoo',region:'Southern Lower',lat:42.2917,lon:-85.5872},
{id:'ann-arbor',name:'Ann Arbor',region:'Southern Lower',lat:42.2808,lon:-83.7430},
{id:'flint',name:'Flint / Thumb',region:'Central Lower',lat:43.0125,lon:-83.6875},
{id:'cadillac',name:'Cadillac / Huron-Manistee',region:'Northern Lower',lat:44.2519,lon:-85.4012},
{id:'traverse-city',name:'Traverse City',region:'Northern Lower',lat:44.7631,lon:-85.6206},
{id:'gaylord',name:'Gaylord / Northeast Lower',region:'Northern Lower',lat:45.0275,lon:-84.6748},
{id:'alpena',name:'Alpena',region:'Northern Lower',lat:45.0617,lon:-83.4328},
{id:'marquette',name:'Marquette',region:'Upper Peninsula',lat:46.5436,lon:-87.3954},
{id:'sault-ste-marie',name:'Sault Ste. Marie',region:'Upper Peninsula',lat:46.4977,lon:-84.3476},
{id:'iron-mountain',name:'Iron Mountain',region:'Upper Peninsula',lat:45.8202,lon:-88.0659},
{id:'escabana',name:'Escanaba',region:'Upper Peninsula',lat:45.7453,lon:-87.0646},
{id:'green-bay',name:'Green Bay, Wisconsin',region:'Wisconsin',lat:44.5133,lon:-88.0133},
{id:'wausau',name:'Wausau, Wisconsin',region:'Wisconsin',lat:44.9591,lon:-89.6301},
{id:'madison',name:'Madison, Wisconsin',region:'Wisconsin',lat:43.0731,lon:-89.4012},
{id:'duluth',name:'Duluth, Minnesota',region:'Minnesota',lat:46.7867,lon:-92.1005},
{id:'brainerd',name:'Brainerd, Minnesota',region:'Minnesota',lat:46.3580,lon:-94.2008},
{id:'toledo',name:'Toledo, Ohio',region:'Ohio',lat:41.6528,lon:-83.5379}
];
const LOC_BY_ID=new Map(LOCATIONS.map(x=>[x.id,x]));
function lookup(id){return LOC_BY_ID.get(id)||null;}
function phase(date=new Date()){
 const m=date.getUTCMonth()+1;
 if(m===1||m===2||m===3||m===4)return 'SEARCH_SEASON';
 if(m===12)return 'EARLY_WINTER';
 if(m===5)return 'LATE_SPRING';
 return 'OFF_SEASON';
}
function summarizeDay(periods,date){
 const matching=periods.filter(p=>String(p.startTime||'').slice(0,10)===date);
 if(!matching.length)return null;
 const temps=matching.map(p=>p.temperature).filter(Number.isFinite);
 if(temps.length<10)return null;
 const highs=Math.max(...temps),lows=Math.min(...temps);
 const snowHours=matching.filter(p=>/snow|sleet|blizzard|wintry mix|ice pellets/i.test(p.shortForecast||'')).length;
 const rainHours=matching.filter(p=>/rain|drizzle|thunder/i.test(p.shortForecast||'')).length;
 const wind=matching.map(p=>Number.parseInt(p.windSpeed,10)).filter(Number.isFinite);
 return {date,highF:highs,lowF:lows,snowHours,rainHours,thawHours:temps.filter(n=>n>34).length,
   freezingHours:temps.filter(n=>n<=32).length,maxWindMph:wind.length?Math.max(...wind):null,
   source:'NWS hourly forecast',temperaturesKnown:true};
}
function dailyFromHourly(periods,now=new Date()){
 if(!Array.isArray(periods))return [];
 const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 return Array.from({length:7},(_,i)=>{
  const t=new Date(today.getTime()+86400000*i);
  return summarizeDay(periods,t.toISOString().slice(0,10));
 }).filter(Boolean);
}
// Ground cover is a USER REPORT, not an automatically observed NOAA snow depth.
// The rating assesses field visibility / ease of searching, never shedding dates or odds.
const GROUND=['unknown','bare','patchy','shallow','deep'];
function judge(day,ground,season){
 if(!GROUND.includes(ground))ground='unknown';
 if(season!=='SEARCH_SEASON')return {status:'seasonal',score:null,label:'Outside the core search-planning season',reason:'Weather cannot establish whether antlers have dropped.'};
 if(!day)return {status:'unavailable',score:null,label:'Forecast unavailable',reason:'No reliable day-level forecast to assess.'};
 if(ground==='unknown')return {status:'needs-ground',score:null,label:'Check local snow cover',reason:'Weather alone does not reveal antlers buried under existing snow.'};
 if(ground==='deep')return {status:'protect-wildlife',score:12,label:'Wait — deep snow',reason:'Deep snow hides sheds and makes winter travel costly for deer. Avoid active winter concentration cover.'};
 const base={bare:88,patchy:75,shallow:53}[ground];
 const snowPenalty=Math.min(31,day.snowHours*3);
 const windPenalty=day.maxWindMph!=null&&day.maxWindMph>=24?12:0;
 const rainPenalty=day.rainHours>=8?13:day.rainHours>=3?6:0;
 const frozenPenalty=day.highF<15?12:0;
 const thawBonus=ground!=='bare'&&day.thawHours>=5?7:0;
 const score=Math.max(10,Math.min(95,base-snowPenalty-windPenalty-rainPenalty-frozenPenalty+thawBonus));
 const status=score>=73?'good':score>=49?'possible':'wait';
 const reason=status==='good'?'Existing reported cover and forecast favor seeing ground and walking. Recheck conditions before departure.'
 :status==='possible'?'Some ground may be visible; fresh snow, moisture or exposure could limit the search.'
 :'Search visibility or walking weather looks unfavorable. Wait for a clearer window.';
 return {status,score,label:status==='good'?'Worth considering this week':status==='possible'?'Possible — scout carefully':'Wait for a better window',reason};
}
function compare(days,ground,when){
 const season=phase(when);
 const sorted=days.map(d=>({date:d.date,...judge(d,ground,season),weather:d}));
 const eligible=sorted.filter(d=>typeof d.score==='number');
 const best=eligible.length?eligible.reduce((a,b)=>a.score>=b.score?a:b):null;
 return {season,best,days:sorted};
}
module.exports={LOCATIONS,lookup,phase,summarizeDay,dailyFromHourly,judge,compare};
