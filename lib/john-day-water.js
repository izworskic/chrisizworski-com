'use strict';
// John Day Dam USACE NWD hourly water report. This is dated provisional historical
// hydrology, never a navigation lock status / safe passage determination.
const SOURCE='https://www.nwd-wc.usace.army.mil/dd/nwdp/project_hourly/webexec/rep';
const COLS=['Hour','Total Outflow kcfs','Generation Flow kcfs','Spill kcfs','Forebay Elevation','Tailwater Elevation','Average Head'];
function num(value){
 const t=String(value??'').replace(/,/g,'').trim();
 return /^-?\d+(?:\.\d+)?$/.test(t)?Number(t):null;
}
function text(value){return String(value).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function sourceUrl(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid date');
 return SOURCE+'?r=jda&date='+encodeURIComponent(Number(date.slice(5,7))+'/'+Number(date.slice(8,10))+'/'+date.slice(0,4));
}
function parseHourly(html,requestedDate){
 if(typeof html!=='string'||html.length<300||html.length>2_000_000)throw Error('Missing/oversize upstream report');
 const name=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 if(!name||!/\bJohn Day Dam\b/i.test(text(name[1])))throw Error('Wrong project');
 const embeddedDate=html.match(/\bvar\s+date\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
 const embeddedCode=html.match(/\bvar\s+report\s*=\s*['"]([^'"]+)['"]/i)?.[1];
 if(!embeddedDate||embeddedDate!==requestedDate||embeddedCode!=='jda')throw Error('Report date/project does not match request');
 const header=html.match(/<tr\b[^>]*>((?:(?!<\/tr>)[\s\S])*?<th\b[\s\S]*?)<\/tr>/i)?.[1];
 const names=[...(header||'').matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>text(m[1]));
 if(names.length!==COLS.length||COLS.some((c,i)=>names[i]!==c))throw Error('Unrecognized report columns');
 const rows=new Map();
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>text(m[1]));
  if(cells.length!==7||!/^([1-9]|1\d|2[0-4])$/.test(cells[0]))continue;
  const hour=Number(cells[0]);
  if(rows.has(hour))throw Error('Duplicate report hour');
  const values=cells.slice(1).map(num);
  if(values.some(v=>v===null))continue; // explicitly missing data, never substitute zero
  const [outflow,generation,spill,forebay,tailwater,head]=values;
  if(outflow<0||outflow>1500||generation<0||generation>1500||spill<0||spill>1500
   ||forebay<0||forebay>1000||tailwater<0||tailwater>1000||head<0||head>500
   ||Math.abs((forebay-tailwater)-head)>3)continue;
  rows.set(hour,{hour,outflowKcfs:outflow,generationKcfs:generation,spillKcfs:spill,forebayFt:forebay,tailwaterFt:tailwater,headFt:head});
 }
 const observations=[...rows.values()].sort((a,b)=>a.hour-b.hour);
 if(observations.length<20)throw Error('Insufficient valid hourly records to describe completed day');
 const peak=observations.reduce((a,b)=>b.outflowKcfs>a.outflowKcfs?b:a);
 const low=observations.reduce((a,b)=>b.outflowKcfs<a.outflowKcfs?b:a);
 const mean=key=>Number((observations.reduce((sum,r)=>sum+r[key],0)/observations.length).toFixed(2));
 return {
  project:'John Day Dam',reportDate:requestedDate,timezone:'America/Los_Angeles',
  units:{flow:'thousand cubic feet per second',elevation:'feet'},
  completeness:observations.length===24?'complete':'partial',
  observedHours:observations.length,missingHours:Array.from({length:24},(_,i)=>i+1).filter(h=>!rows.has(h)),
  summary:{
   averageOutflowKcfs:mean('outflowKcfs'),minimumOutflowKcfs:low.outflowKcfs,
   maximumOutflowKcfs:peak.outflowKcfs,minimumHour:low.hour,peakHour:peak.hour,
   averageGenerationKcfs:mean('generationKcfs'),averageSpillKcfs:mean('spillKcfs'),
   averageHeadFt:mean('headFt')
  },
  observations,sourceUrl:sourceUrl(requestedDate)
 };
}
function localReportDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'})
 .formatToParts(now).filter(x=>x.type!=='literal');
 const v=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return v.year+'-'+v.month+'-'+v.day;
}
module.exports={SOURCE,COLS,parseHourly,localReportDate,sourceUrl};
