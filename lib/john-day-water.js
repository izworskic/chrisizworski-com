'use strict';
// Parse official John Day USACE hourly report, cautiously. No invented values;
// on unrecognized format throw and let endpoint disclose upstream unavailable.
const SOURCE='https://www.nwd-wc.usace.army.mil/dd/nwdp/project_hourly/webexec/rep';
function n(v){const x=String(v??'').replace(/,/g,'').trim();return x!==''&&/^-?\d+(?:\.\d+)?$/.test(x)?Number(x):null;}
function htmlText(v){return String(v).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function parseHourly(html,date){
 if(typeof html!=='string'||html.length>2_000_000)throw Error('invalid upstream report');
 const title=htmlText(html.slice(0,30000));
 if(!/John Day/i.test(title))throw Error('unexpected project');
 const rows=[];
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>htmlText(m[1]));
  if(cells.length<7||!/^([1-9]|1\d|2[0-4])$/.test(cells[0]))continue;
  const hour=Number(cells[0]);
  const vals=cells.slice(1,7).map(n);
  if(vals.some(x=>x===null))continue; // missing observations stay missing, never zero
  const [outflow,generation,spill,forebay,tailwater,head]=vals;
  if(outflow<0||outflow>1500||generation<0||generation>1500||spill<0||spill>1500||forebay<0||forebay>1000||tailwater<0||tailwater>1000||head<0||head>500)continue;
  rows.push({hour,outflowKcfs:outflow,generationKcfs:generation,spillKcfs:spill,forebayFt:forebay,tailwaterFt:tailwater,headFt:head});
 }
 const ordered=[...new Map(rows.map(x=>[x.hour,x])).values()].sort((a,b)=>a.hour-b.hour);
 if(!ordered.length)throw Error('no recognized hourly observations');
 return {project:'John Day Dam',reportDate:date,timezone:'America/Los_Angeles',units:{flow:'thousand cubic feet per second',elevation:'feet'},observations:ordered,sourceUrl:SOURCE+'?r=jda&date='+encodeURIComponent(date.slice(5,7)+'/'+date.slice(8,10)+'/'+date.slice(0,4))};
}
function localReportDate(now=new Date()){
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
 const parts=Object.fromEntries(fmt.formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
module.exports={SOURCE,parseHourly,localReportDate};
