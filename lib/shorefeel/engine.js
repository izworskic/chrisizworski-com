'use strict';
// ShoreFeel V1: deterministic evidence contracts. Comfort is not swim safety.
const LAKES=Object.freeze({superior:2,michigan:3,huron:4,erie:5,ontario:6});
const DESTINATIONS=Object.freeze({
  'grand-haven':{name:'Grand Haven',lat:43.0631,lon:-86.2284,lake:'michigan',station:'45029',stationName:'Port Sheldon offshore buoy',stationLat:42.8996,stationLon:-86.2723,stationCaveat:'The Port Sheldon buoy sits offshore between Grand Haven and Holland; it does not measure the Grand Haven beach or harbor.'},
  'traverse-city':{name:'Traverse City',lat:44.7631,lon:-85.6206,lake:'michigan',station:'45020',stationName:'Grand Traverse Bay South buoy',stationLat:44.789,stationLon:-85.604,stationCaveat:'The bay buoy is seasonal and may have no recent reports. An open-lake reading must not be substituted for Grand Traverse Bay.'}
});
const SOURCE='https://apps.glerl.noaa.gov/coastwatch/ftp/glsea/avgtemps/glsea-temps_1024_3.dat';
function f(c){return Math.round((c*9/5+32)*10)/10;}
function isoDay(year,day){const d=new Date(Date.UTC(year,0,day));return d.getUTCFullYear()===year&&d.getUTCDate()>0&&day>=1&&day<=(new Date(Date.UTC(year+1,0,0)).getUTCDate()===31?366:366)?d.toISOString().slice(0,10):null;}
function validOrdinal(year,day){return Number.isInteger(year)&&year>=1995&&year<=2100&&Number.isInteger(day)&&day>=1&&day<=(new Date(Date.UTC(year+1,0,0))-new Date(Date.UTC(year,0,0)))/86400000;}
function parseGLSEA(raw,now=new Date()){
  const out=[];const today=now.toISOString().slice(0,10);
  for(const line of String(raw||'').split(/\r?\n/)){
    const a=line.trim().split(/\s+/);if(a.length<7)continue;
    const year=Number(a[0]),day=Number(a[1]);if(!validOrdinal(year,day))continue;
    const date=new Date(Date.UTC(year,0,day)).toISOString().slice(0,10);
    if(date>today)continue;
    const values={};for(const [lake,col] of Object.entries(LAKES)){const c=Number(a[col]);values[lake]=Number.isFinite(c)&&c>=-2&&c<=36?f(c):null;}
    if(Object.values(values).every(v=>v===null))continue;
    out.push({date,values});
  }
  const byDate=new Map(out.map(r=>[r.date,r]));
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-40);
}
function lakeSeries(rows,lake,now=new Date()){
  if(!Object.hasOwn(LAKES,lake))return null;
  const history=rows.map(r=>({date:r.date,tempF:r.values[lake]})).filter(r=>r.tempF!==null).slice(-30);
  const latest=history.at(-1)||null;
  if(!latest)return {status:'unavailable',latest:null,history:[],trend7:null};
  const ageDays=Math.floor((Date.parse(now.toISOString().slice(0,10)+'T00:00:00Z')-Date.parse(latest.date+'T00:00:00Z'))/86400000);
  const prior=history.findLast(r=>r.date<=new Date(Date.parse(latest.date+'T00:00:00Z')-7*86400000).toISOString().slice(0,10));
  return {status:ageDays>=0&&ageDays<=3?'recent':'stale',latest:{...latest,ageDays},history,trend7:prior?Math.round((latest.tempF-prior.tempF)*10)/10:null};
}

/* Parse NOAA ERDDAP GLSEA CSV as a secondary official source.
   Must have named columns; HTML anti-bot responses must never pass as data. */
function parseGLSEACsv(raw,now=new Date()){
  const lines=String(raw||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const first=lines.findIndex(l=>/^"?Year"?\s*,\s*"?Day"?\s*,/i.test(l.trim()));
  if(first<0)return [];
  const cols=lines[first].replaceAll('"','').trim().split(',').map(x=>x.trim().toLowerCase().replace(/[._\s-]/g,''));
  const index={superior:cols.indexOf('sup'),michigan:cols.indexOf('mich'),huron:cols.indexOf('huron'),erie:cols.indexOf('erie'),ontario:cols.indexOf('ont')};
  if(cols.indexOf('year')<0||cols.indexOf('day')<0||Object.values(index).some(n=>n<0))return [];
  const plain=lines.slice(first+1).map(line=>{
    const v=line.trim().replaceAll('"','').split(',').map(x=>x.trim());
    const year=Number(v[cols.indexOf('year')]),day=Number(v[cols.indexOf('day')]);
    if(!validOrdinal(year,day))return null;
    return [year,day,...['superior','michigan','huron','erie','ontario'].map(l=>v[index[l]])].join(' ');
  }).filter(Boolean).join('\n');
  return parseGLSEA(plain,now);
}

function parseNDBC(raw,now=new Date()){
  const lines=String(raw||'').trim().split(/\r?\n/).filter(Boolean);
  const header=(lines.find(l=>/^#(YY|YYYY)\s/.test(l))||'').replace(/^#/,'').trim().split(/\s+/);
  const column=header.indexOf('WTMP');if(column<0)return null;
  let found=null;
  for(const line of lines){
    if(line.startsWith('#'))continue;
    const a=line.trim().split(/\s+/);if(a.length<=column)continue;
    let year=Number(a[0]);if(year<100)year+=year>=70?1900:2000;
    const parts=[year,...a.slice(1,5).map(Number)],c=Number(a[column]);
    if(parts.some(n=>!Number.isInteger(n))||!Number.isFinite(c)||c<0||c>36)continue;
    const [y,mo,d,h,mi]=parts;const stamp=new Date(Date.UTC(y,mo-1,d,h,mi));
    if(stamp.getUTCFullYear()!==y||stamp.getUTCMonth()!==mo-1||stamp.getUTCDate()!==d)continue;
    const hours=(now-stamp)/3600000;if(hours<0||hours>6)continue;
    if(!found||stamp>new Date(found.observedAt))found={tempF:f(c),observedAt:stamp.toISOString(),ageHours:Math.round(hours*10)/10};
  }
  return found;
}
function windMph(period){
  const raw=String(period?.windSpeed||'');
  const range=raw.match(/(\d+(?:\.\d+)?)(?:\s*to\s*(\d+(?:\.\d+)?))?\s*(mph|kt|kts|knots)/i);
  if(!range)return null;
  const speed=Math.max(Number(range[1]),Number(range[2]||range[1]));
  return /mph/i.test(range[3])?Math.round(speed):Math.round(speed*1.15078);
}
function weatherPeriods(raw){
  return (Array.isArray(raw)?raw:[]).slice(0,12).map(p=>({
    startsAt:p.startTime||null,tempF:Number.isFinite(Number(p.temperature))?(p.temperatureUnit==='C'?f(Number(p.temperature)):Number(p.temperature)):null,
    windMph:windMph(p),summary:String(p.shortForecast||'').slice(0,100),
    rainChance:Number.isFinite(Number(p.probabilityOfPrecipitation?.value))?Number(p.probabilityOfPrecipitation.value):null,
    humidity:Number.isFinite(Number(p.relativeHumidity?.value))?Number(p.relativeHumidity.value):null,
    daylight:p.isDaytime===true
  })).filter(p=>p.startsAt);
}
function comfort(activity,water,weather){
  const w=weather||{};const wind=w.windMph;const temp=w.tempF;const phrase=String(w.summary||'').toLowerCase();
  const sky=/sunny|clear|mostly sunny|fair/.test(phrase)?'Sunshine may make exposed sand feel warmer.':/cloud|overcast/.test(phrase)?'Cloud cover limits direct sun warmth.':'Sun and cloud conditions may change.';
  const windNote=wind===null?'Wind comfort cannot be assessed from current data.':wind>=18?'A strong breeze could make exposed skin and wet clothing feel substantially cooler.':wind>=10?'A noticeable lake breeze may feel cooler, especially when wet.':'Wind-driven cooling looks relatively limited in the available forecast.';
  const beach=temp===null?'Air comfort is unavailable while the shoreline forecast is missing.':temp>=82?'The air is hot; shade and hydration may matter.':temp>=70?'The air is mild to warm for time on the shore.':temp>=55?'The air may feel cool when sitting still.':'The air is cold for prolonged beach time.';
  const waterText=water===null?'No recent destination-relevant water measurement is available. We cannot tell you how this beach water will feel.':water<60?'The measured offshore water is cold; immersion can produce a strong cold response.':water<70?'The measured offshore water is brisk compared with warm summer air.':'The measured offshore water is relatively warm for the Great Lakes, but comfort remains personal.';
  const after=water===null?'Post-swim cooling depends on wind and wet-skin exposure; water temperature is unverified for this beach.':water<65?'Wet skin and any breeze can cool you quickly after leaving this relatively cold water.':'Even after warmer-water swimming, wet skin loses heat faster in the breeze.';
  const starts={swim:'Planning to swim?',family:'Bringing the family?',paddle:'Planning to paddle?',relax:'Spending time on the sand?'};
  const specific={swim:'Water temperature describes thermal exposure, never current or wave safety.',family:'Children may cool faster in water. Check official advisories and supervise closely.',paddle:'Unexpected immersion matters more than warm air. Choose protective gear for the water, not just the forecast.',relax:'Air, sun, and wind matter more than the offshore water reading if you are staying dry.'};
  const a=Object.hasOwn(starts,activity)?activity:'swim';
  return {heading:starts[a],beach:beach+' '+sky+' '+windNote,water:waterText,after,decision:specific[a],state:water===null?'limited':'contextual'};
}
function bestWeatherWindow(periods,activity){
  // Only compare weather comfort; no claim about beach hazards or water temperature.
  const eligible=periods.filter(p=>p.daylight&&Number.isFinite(p.tempF)&&Number.isFinite(p.windMph));
  if(!eligible.length)return null;
  const score=p=>(activity==='paddle'? -Math.abs(p.tempF-72) : -Math.abs(p.tempF-76)) - p.windMph*.55 -(p.rainChance??50)*.18;
  const winner=[...eligible].sort((a,b)=>score(b)-score(a))[0];
  return {startsAt:winner.startsAt,reason:'Relative air-and-wind comfort only; NOT a swim-safety or water-temperature forecast.'};
}
module.exports={LAKES,DESTINATIONS,SOURCE,parseGLSEA,parseGLSEACsv,lakeSeries,parseNDBC,weatherPeriods,comfort,bestWeatherWindow};