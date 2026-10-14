'use strict';
// Michigan Maple Sap Run — modeled freeze/thaw opportunities, not observed sap flow.
// Plain CommonJS so the engine runs in Vercel Functions and node --test.
const LOCATIONS = [
 ['detroit','Detroit',42.3314,-83.0458,'Southern Lower'],['ann-arbor','Ann Arbor',42.2808,-83.7430,'Southern Lower'],
 ['monroe','Monroe',41.9164,-83.3977,'Southern Lower'],['jackson','Jackson',42.2459,-84.4013,'Southern Lower'],
 ['kalamazoo','Kalamazoo',42.2917,-85.5872,'Southern Lower'],['battle-creek','Battle Creek',42.3212,-85.1797,'Southern Lower'],
 ['lansing','Lansing',42.7325,-84.5555,'Southern Lower'],['grand-rapids','Grand Rapids',42.9634,-85.6681,'Southern Lower'],
 ['holland','Holland',42.7875,-86.1089,'Southern Lower'],['muskegon','Muskegon',43.2342,-86.2484,'Southern Lower'],
 ['flint','Flint',43.0125,-83.6875,'Southern Lower'],['saginaw','Saginaw',43.4195,-83.9508,'Central Lower'],
 ['bay-city','Bay City',43.5945,-83.8889,'Central Lower'],['midland','Midland',43.6156,-84.2472,'Central Lower'],
 ['mount-pleasant','Mount Pleasant',43.5978,-84.7675,'Central Lower'],['big-rapids','Big Rapids',43.6981,-85.4837,'Central Lower'],
 ['bad-axe','Bad Axe',43.8019,-83.0008,'Central Lower'],['west-branch','West Branch',44.2764,-84.2386,'Northern Lower'],
 ['cadillac','Cadillac',44.2519,-85.4012,'Northern Lower'],['traverse-city','Traverse City',44.7631,-85.6206,'Northern Lower'],
 ['gaylord','Gaylord',45.0275,-84.6748,'Northern Lower'],['petoskey','Petoskey',45.3733,-84.9553,'Northern Lower'],
 ['alpena','Alpena',45.0617,-83.4328,'Northern Lower'],['rogers-city','Rogers City',45.4214,-83.8183,'Northern Lower'],
 ['sault-ste-marie','Sault Ste. Marie',46.4953,-84.3453,'Upper Peninsula'],
 ['rudyard','Rudyard',46.2306,-84.6036,'Upper Peninsula'],['esc​​anaba','Escanaba',45.7452,-87.0646,'Upper Peninsula'],
 ['marquette','Marquette',46.5436,-87.3954,'Upper Peninsula'],['munising','Munising',46.4112,-86.6493,'Upper Peninsula'],
 ['houghton','Houghton',47.1211,-88.5694,'Upper Peninsula'],['ironwood','Ironwood',46.4547,-90.1710,'Upper Peninsula']
].map(function(x){ return {id:x[0].replace(/[^a-z-]/g,''),name:x[1],lat:x[2],lon:x[3],region:x[4],tz:'America/Detroit'}; });
// An intentionally small set of statewide anchor forecasts; arbitrary site queries are allowlisted.
const BOARD_IDS = ['detroit','kalamazoo','grand-rapids','lansing','flint','bay-city','bad-axe','west-branch','traverse-city','gaylord','alpena','petoskey','esc​​anaba','marquette','sault-ste-marie','houghton'];
function lookup(id){ return LOCATIONS.find(function(x){return x.id===id;})||null; }
function season(location,when){
  const m=when.getUTCMonth()+1;
  if(m>=6 || m===12 || m===11 || m===10) return 'OFF_SEASON';
  if(m===5 && location.region!=='Upper Peninsula') return 'OFF_SEASON';
  return 'WEATHER_WINDOW';
}
function timeParts(iso,zone){
  const d=new Date(iso); if(Number.isNaN(+d)) return null;
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:zone||'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',hourCycle:'h23'
  }).formatToParts(d).filter(function(v){return v.type!=='literal';}).map(function(v){return [v.type,v.value];}));
  return {date:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour)};
}
function temperatureF(period){
  const n=Number(period.temperature);
  if(!Number.isFinite(n) || period.temperature===null) return null;
  return period.temperatureUnit==='C'? n*9/5+32:n;
}
function dailyOpportunity(night,day){
  if(night.length<5||day.length<4) return {score:null,level:'INSUFFICIENT',reason:'Not enough forecast hours to evaluate overnight freeze and daytime thaw.'};
  const low=Math.min(...night),high=Math.max(...day);
  const freezeHours=night.filter(function(t){return t<=31.9;}).length;
  const thawHours=day.filter(function(t){return t>=35;}).length;
  if(freezeHours===0) return {score:Math.min(20,thawHours*2),level:'LOW',reason:'The modeled overnight period lacks a freeze.'};
  if(thawHours===0) return {score:8,level:'LOW',reason:'Forecast daytime hours do not warm sufficiently above freezing.'};
  let score=35+Math.min(16,freezeHours*2.5)+Math.min(18,thawHours*3)+Math.min(12,Math.max(0,high-34)*0.8);
  if(low<10) score-=12;
  if(high>58) score-=Math.min(18,(high-58)*1.5);
  score=Math.max(0,Math.min(100,Math.round(score)));
  return {score,level:score>=75?'FAVORABLE':score>=50?'POSSIBLE':'LOW',
    reason:'Forecast overnight freeze ('+Math.round(low)+'°F) followed by a daytime thaw ('+Math.round(high)+'°F).'};
}
function evaluate(periods,location,now){
  const today=timeParts(now.toISOString(),location.tz).date;
  const items=periods.map(function(p){
    const parts=timeParts(p.startTime,location.tz),temp=temperatureF(p);
    return parts&&temp!==null?{...parts,temp}:null;
  }).filter(Boolean).sort(function(a,b){return a.date.localeCompare(b.date)||a.hour-b.hour;});
  const dates=[...new Set(items.map(function(p){return p.date;}))].filter(function(d){return d>=today;}).slice(0,7);
  return dates.map(function(date){
    const current=items.filter(function(x){return x.date===date;});
    const previousDate=new Date(date+'T12:00:00Z');
    previousDate.setUTCDate(previousDate.getUTCDate()-1);
    const prev=previousDate.toISOString().slice(0,10);
    const night=items.filter(function(x){return (x.date===date&&x.hour<=8)||(x.date===prev&&x.hour>=19);}).map(function(x){return x.temp;});
    const daytime=current.filter(function(x){return x.hour>=10&&x.hour<=18;}).map(function(x){return x.temp;});
    const result=dailyOpportunity(night,daytime);
    return {date,low:night.length?Math.round(Math.min(...night)):null,high:daytime.length?Math.round(Math.max(...daytime)):null,
      freezeHours:night.filter(function(t){return t<=31.9;}).length,thawHours:daytime.filter(function(t){return t>=35;}).length,...result};
  });
}
function summarize(daily){
  const valid=daily.filter(function(d){return d.score!==null;});
  const best=[...valid].sort(function(a,b){return b.score-a.score||a.date.localeCompare(b.date);})[0];
  return {bestDay:best?best.date:null,bestScore:best?best.score:null,
    bestLevel:best?best.level:'INSUFFICIENT',evaluatedDays:valid.length};
}
module.exports={LOCATIONS,BOARD_IDS,lookup,season,timeParts,temperatureF,dailyOpportunity,evaluate,summarize};