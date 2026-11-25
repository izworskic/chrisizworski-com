'use strict';
// Forecast samples, not observed leaf wetness or local infection.
const HOUR=3600000,DAY=24*HOUR;
const SOURCE='https://potatoes.ahdb.org.uk/development-and-implementation-of-a-new-national-warning-system-for-potato-late-blight-in-great-britain-hutton-criteria';
const valid=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
function evaluate(data,nowMs=Date.now(),zone='America/Detroit'){
 const p=data?.properties,issuedAt=p?.updateTime||p?.updated,issue=Date.parse(issuedAt);
 const result={schema:'garden-disease-weather-v1',status:'UNAVAILABLE',issuedAt:issuedAt||null,zone,scope:'NWS forecast hourly samples, not leaf wetness or infection',days:[],huttonWindows:[],huttonSource:SOURCE,huttonScope:'British potato warning criterion, not locally validated for Michigan or tomato'};
 if(!Number.isFinite(nowMs)||!Number.isFinite(issue)||issue>nowMs||nowMs-issue>18*HOUR||!Array.isArray(p?.periods)||p.periods.length>220||!['America/Detroit','America/Chicago','America/New_York','US/Eastern','US/Central'].includes(zone))return result;
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const local=t=>{const x=Object.fromEntries(fmt.formatToParts(t).map(q=>[q.type,q.value]));return {date:x.year+'-'+x.month+'-'+x.day,hour:+x.hour,minute:+x.minute};};
 const today=local(nowMs).date,slots=new Map(),conflict=new Set();
 for(const h of p.periods){
  const t=Date.parse(h?.startTime),end=Date.parse(h?.endTime),rh=h?.relativeHumidity?.value,pop=h?.probabilityOfPrecipitation?.value;
  const f=h?.temperatureUnit==='C'&&Number.isFinite(h.temperature)?h.temperature*9/5+32:h?.temperatureUnit==='F'?h.temperature:null;
  if(!Number.isFinite(t)||end-t!==HOUR||t<nowMs||local(t).minute!==0||!valid(f,-80,140)||!valid(rh,0,100))continue;
  const row={f,rh,pop:valid(pop,0,100)?pop:null};if(slots.has(t)&&JSON.stringify(slots.get(t))!==JSON.stringify(row))conflict.add(t);slots.set(t,row);
 }
 const daySlots=new Map(),base=Date.parse(today+'T00:00:00Z');
 for(let t=base-12*HOUR;t<base+5*DAY;t+=HOUR){const d=local(t).date;if(d<=today||d>shift(today,3))continue;const a=daySlots.get(d)||[];a.push(t);daySlots.set(d,a);}
 for(const [date,expected] of daySlots){
  const rows=expected.filter(t=>slots.has(t)&&!conflict.has(t)).map(t=>slots.get(t)),complete=rows.length===expected.length;
  const minF=complete?Math.min(...rows.map(h=>h.f)):null;
  const humid=complete?rows.filter(h=>h.rh>=90).length:null;
  result.days.push({date,coverage:complete?'complete':'partial',hours:rows.length,expectedHours:expected.length,minF,humidHours:humid,
   mildHumidHours:complete?rows.filter(h=>h.f>=68&&h.f<=81&&h.rh>=90).length:null,
   coolHumidHours:complete?rows.filter(h=>h.f>=59&&h.f<=68&&h.rh>=90).length:null,
   huttonDay:complete?minF>=50&&humid>=6:null});
 }
 for(let i=1;i<result.days.length;i++){const a=result.days[i-1],b=result.days[i];if(a.huttonDay===true&&b.huttonDay===true&&shift(a.date,1)===b.date)result.huttonWindows.push({from:a.date,to:b.date});}
 result.status=result.days.every(d=>d.coverage==='complete')&&result.days.length===3?'AVAILABLE':result.days.some(d=>d.coverage==='complete')?'PARTIAL':'UNAVAILABLE';
 return result;
}
module.exports={evaluate,SOURCE};
