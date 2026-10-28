#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
// Ontario Parks only. Never infer "confirmed open" from a missing alert.
const ALERTS='https://www.ontarioparks.ca/park/lakesuperior/alerts';
const PARK='https://www.ontarioparks.ca/park/lakesuperior';
const OUT=path.resolve('public/assets/lspp-agawa-status.json');
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
function text(html){
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&rsquo;/gi,'’')
    .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function ymd(month,day,year){
  const m=months.indexOf(month.toLowerCase())+1,d=Number(day),y=Number(year);
  const date=new Date(Date.UTC(y,m-1,d));
  if(!m||y<2026||y>2100||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('invalid park operating date');
  return [y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
function dayUse(html){
  const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
  const row=rows.find(x=>/<td\b[^>]*>\s*Lake\s*Superior\s*<\/td>/i.test(x[0])&&/<img\b[^>]*\balt=["']Day\s*Use["']/i.test(x[0]))?.[0];
  if(!row)throw Error('official Lake Superior day-use table row missing');
  const found=text(row).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\s+to\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if(!found)throw Error('day-use dates are unparseable');
  const start=ymd(found[1],found[2],found[3]),end=ymd(found[4],found[5],found[6]);
  if(end<start)throw Error('invalid reverse day-use dates');
  return {start,end,year:Number(found[3])};
}
function notices(html){
  if(!/Agawa Rock/i.test(html)||!/Alerts and Advisories|Park Notice/i.test(html))throw Error('park alert page identity not verified');
  const blocks=[...html.matchAll(/<div\b[^>]*style=["'][^"']*padding-left:\s*55px[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)].map(x=>text(x[1]));
  if(!blocks.length)throw Error('official alert notices missing');
  return blocks;
}
function localDay(date){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const o=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return o.year+'-'+o.month+'-'+o.day;
}
export function evaluate(alertsHtml,parkHtml,day){
  if(!/^\d{4}-\d\d-\d\d$/.test(day))throw Error('invalid reference day');
  const schedule=dayUse(parkHtml),year=Number(day.slice(0,4));
  const relevant=notices(alertsHtml).filter(n=>/Agawa Rock Pictographs(?: Trail)?/i.test(n)&&!/Dogs:/i.test(n));
  const closures=relevant.filter(n=>/\bclos(?:ed|ure)\b/i.test(n));
  const reopenings=relevant.filter(n=>/\b(reopened|has reopened|now open|is open|open to the public)\b/i.test(n)&&!/\bclosed\b/i.test(n));
  const years=n=>[...n.matchAll(/\b(20\d{2})\b/g)].map(m=>Number(m[1]));
  const activeClosure=closures.some(n=>!/for the season/i.test(n)||!years(n).length||Math.max(...years(n))>=year);
  const publishedSeason=schedule.year===year&&day>=schedule.start&&day<=schedule.end;
  const explicitlyReopened=reopenings.some(n=>years(n).includes(year));
  const status=activeClosure?'closed':publishedSeason&&explicitlyReopened?'open-confirmed':publishedSeason?'no-current-closure-posted':'seasonal-review';
  return {
    schemaVersion:1,status,checkedAt:day,
    dayUse:schedule,currentDayUseActive:publishedSeason,
    source:{alerts:ALERTS,operatingDates:PARK},
    historical2026Closure:'2026-09-11',
    evidence:activeClosure?'Current or undated official Agawa closure notice.':status==='open-confirmed'?'Official same-season notice explicitly confirms reopening.':status==='no-current-closure-posted'?'Published operating season and no current-season closure notice; trail opening not independently confirmed.':'Outside published operating dates, or newer dates not yet published.',
    culturalSite:true,parkingPinVerified:false
  };
}
function selfTest(){
  const alert=body=>'<h1>Alerts and Advisories</h1><div style="padding-left: 55px;">'+body+'</div><div style="padding-left: 55px;">Dogs: Agawa Rock is a sacred site.</div>';
  const season=y=>'<table><tr><td>Lake Superior </td><td><img alt="Day Use"></td><td>May 1, '+y+' to October 25, '+y+'</td></tr></table>';
  const old='Agawa Rock Pictographs Trail is closed for the season as of September 11th, 2026.';
  const now='Agawa Rock Pictographs Trail is closed for the season as of May 2nd, 2027.';
  const open='Agawa Rock Pictographs Trail has reopened to the public for 2027.';
  const indefinite='Agawa Rock Pictographs Trail is closed until further notice since September 2026.';
  const cases=[
    [alert(old),season(2026),'2026-10-28','closed'],
    [alert(old),season(2026),'2027-06-12','seasonal-review'],
    [alert(old),season(2027),'2027-04-26','seasonal-review'],
    [alert(old),season(2027),'2027-05-03','no-current-closure-posted'],
    [alert(now),season(2027),'2027-05-03','closed'],
    [alert(indefinite),season(2027),'2027-05-03','closed'],
    [alert(open),season(2027),'2027-05-03','open-confirmed']
  ];
  for(const [a,p,d,status] of cases){const actual=evaluate(a,p,d).status;if(actual!==status)throw Error('status self-test failed: '+actual+' != '+status);}
  console.log('PASS Agawa seven seasonal, closure, reopening scenarios');
}
async function read(url){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{'user-agent':'ChrisIzworskiFieldGuideSourceMonitor/1.0 (+https://chrisizworski.com/)','accept':'text/html'}});
    if(!response.ok)throw Error('Ontario Parks HTTP '+response.status);
    const content=await response.text();
    if(content.length<3000||!/<html/i.test(content))throw Error('unexpected Ontario Parks response');
    return content;
  }finally{clearTimeout(timeout);}
}
async function main(){
  selfTest();
  const day=localDay(new Date());
  const [alerts,park]=await Promise.all([read(ALERTS),read(PARK)]);
  const current=evaluate(alerts,park,day);
  const old=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):null;
  const stateChanged=!old||old.status!==current.status||old.currentDayUseActive!==current.currentDayUseActive||
    JSON.stringify(old.dayUse)!==JSON.stringify(current.dayUse);
  const daysSince=old?(Date.parse(day+'T12:00:00Z')-Date.parse(old.checkedAt+'T12:00:00Z'))/86400000:999;
  // Daily source checks, at most one heartbeat commit per four days when state unchanged.
  if(stateChanged||daysSince>=4){
    fs.mkdirSync(path.dirname(OUT),{recursive:true});
    fs.writeFileSync(OUT,JSON.stringify(current,null,2)+'\n');
    console.log('PUBLISHED status: '+current.status+' checked '+day);
  }else console.log('CHECKED status unchanged: '+current.status+' (no build)');
}
if(process.argv.includes('--self-test'))selfTest();
else main().catch(error=>{console.error('Agawa source monitor failed; preserving prior state:',error.message);process.exitCode=1});
