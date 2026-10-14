'use strict';
// ShoreFeel: deterministic evidence contracts. Comfort is not swim safety.
//
// Water evidence ladder for a destination, best first:
//   1. A buoy in the destination's own water, reporting within 6 hours.
//   2. The nearest valid NOAA GLSEA ACSPO satellite pixel inside that water body,
//      within a few km of the beach, dated within 3 days.
//   3. Nothing. The whole-lake daily average is CONTEXT and is never promoted to a
//      destination reading: a Lake Michigan mean says little about shallow bay water.
const LAKES=Object.freeze({superior:2,michigan:3,huron:4,erie:5,ontario:6});
const LT_CODES=Object.freeze({s:'superior',m:'michigan',h:'huron',e:'erie',o:'ontario'});
const DESTINATIONS=Object.freeze({
  'grand-haven':{
    name:'Grand Haven',lat:43.0631,lon:-86.2284,lake:'michigan',water:'Lake Michigan off Grand Haven',
    beach:{name:'Grand Haven State Park beach',lat:43.0566,lon:-86.2493},
    station:'45029',stationName:'Holland (Port Sheldon) offshore buoy',stationLat:42.8996,stationLon:-86.2723,stationOwner:'LimnoTech',
    stationCaveat:'The Port Sheldon buoy sits offshore between Grand Haven and Holland; it does not measure the Grand Haven beach or harbor.',
    cells:[{key:'open-shore',short:'Off the state park',label:'Lake Michigan off Grand Haven State Park',lat:43.0516,lon:-86.2671,maxKm:4}]
  },
  'traverse-city':{
    name:'Traverse City',lat:44.7631,lon:-85.6206,lake:'michigan',water:'Grand Traverse Bay',
    beach:{name:'Clinch Park beach',lat:44.7658,lon:-85.6230},
    station:'45020',stationName:'Grand Traverse Bay South buoy',stationLat:44.789,stationLon:-85.604,stationOwner:'Northwestern Michigan College',
    stationCaveat:'The NMC bay buoy is seasonal and is recovered for winter. An open-lake reading must not be substituted for Grand Traverse Bay.',
    // Nearest water pixels in each arm of the bay. The earlier single-pixel request
    // (44.7958,-85.6100) snapped onto the land mask and returned NaN every day.
    cells:[
      {key:'west-bay',short:'West Bay',label:'West Grand Traverse Bay, 4 km north of Clinch Park',lat:44.8036,lon:-85.6224,maxKm:4},
      {key:'east-bay',short:'East Bay',label:'East Grand Traverse Bay, 2 km off Traverse City State Park',lat:44.7615,lon:-85.5664,maxKm:4}
    ]
  }
});
const SOURCE='https://apps.glerl.noaa.gov/coastwatch/ftp/glsea/avgtemps/glsea-temps_1024_3.dat';
function f(c){return Math.round((c*9/5+32)*10)/10;}
function validOrdinal(year,day){return Number.isInteger(year)&&year>=1995&&year<=2100&&Number.isInteger(day)&&day>=1&&day<=(new Date(Date.UTC(year+1,0,0))-new Date(Date.UTC(year,0,0)))/86400000;}
function kmBetween(aLat,aLon,bLat,bLon){
  const R=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(bLat-aLat),dLon=toRad(bLon-aLon);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
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
  const lines=String(raw||'').replace(/^﻿/,'').split(/\r?\n/).filter(Boolean);
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

/* NOAA GLERL long-term average daily surface temperature (ERDDAP glerlLTAvgTemp).
   Returns {lake: tempF} for the rows present. Used only to say "warmer/cooler than
   normal for this date" about the whole-lake average. */
function parseLongTermAverage(raw){
  const out={};
  for(const line of String(raw||'').split(/\r?\n/)){
    const v=line.trim().replaceAll('"','').split(',').map(x=>x.trim());
    if(v.length<3)continue;
    const lake=LT_CODES[v[0].toLowerCase()];const c=Number(v[2]);
    if(!lake||!Number.isFinite(c)||c<-2||c>36)continue;
    out[lake]=f(c);
  }
  return out;
}

/* NOAA GLSEA ACSPO griddap: a small box of daily satellite surface pixels around a
 * destination. For each named cell, pick the NEAREST VALID WATER pixel within maxKm,
 * using its latest date. NaN is the land/no-data mask; the fill value, wrong
 * coordinates, HTML blocks and stale dates are all "unavailable", never estimated. */
function parseGLSEAGridCsv(raw,cells,now=new Date()){
  const txt=String(raw||'');
  const result=Object.fromEntries((cells||[]).map(c=>[c.key,null]));
  if(txt.length>262144)return result;
  const lines=txt.replace(/^﻿/,'').trim().split(/\r?\n/);
  if(lines.length<3||lines[0].replaceAll('"','').trim().toLowerCase()!=='time,latitude,longitude,sst')return result;
  const pixels=new Map();// "lat,lon" -> latest valid sample
  for(const line of lines.slice(1)){
    const v=line.replaceAll('"','').trim().split(',').map(x=>x.trim());
    if(v.length!==4||v[0]==='UTC'||v.some(cell=>cell===''))continue;
    const t=Date.parse(v[0]),y=Number(v[1]),x=Number(v[2]),c=Number(v[3]);
    if(!Number.isFinite(t)||!Number.isFinite(y)||!Number.isFinite(x)||!Number.isFinite(c))continue;
    if(c<-2||c>36)continue;
    const age=now.getTime()-t;
    if(age<-3600000||age>72*3600000)continue;
    const k=y.toFixed(4)+','+x.toFixed(4);
    const prev=pixels.get(k);
    if(!prev||t>prev.t)pixels.set(k,{t,y,x,c});
  }
  for(const cell of cells||[]){
    let best=null;
    for(const p of pixels.values()){
      const km=kmBetween(cell.lat,cell.lon,p.y,p.x);
      if(km>(cell.maxKm||4))continue;
      if(!best||km<best.km)best={...p,km};
    }
    if(best)result[cell.key]={tempF:f(best.c),observedAt:new Date(best.t).toISOString(),sampleLat:best.y,sampleLon:best.x,distanceKm:Math.round(best.km*10)/10,ageHours:Math.round(Math.max(now.getTime()-best.t,0)/360000)/10};
  }
  return result;
}
/* Backward-compatible single-point form used by older tests. */
function parseGLSEABayGridCsv(raw,{lat,lon},now=new Date()){
  return parseGLSEAGridCsv(raw,[{key:'p',lat,lon,maxKm:3}],now).p;
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

/* Choose the destination's water reading. Buoy beats satellite; satellite cells are
   tried in listed order (the first is the one nearest the main beach). */
function waterEvidence(place,buoy,cells){
  const buoyKm=place.beach?Math.round(kmBetween(place.beach.lat,place.beach.lon,place.stationLat,place.stationLon)*10)/10:null;
  const haveSatellite=(place.cells||[]).some(c=>Number.isFinite(cells?.[c.key]?.tempF));
  // A measured buoy wins when it is in the destination's own water (within 10 km of the
  // beach), or when there is nothing else. A buoy 18 km down the coast loses to a valid
  // satellite pixel 1.5 km off the beach; it is still reported alongside.
  if(buoy&&Number.isFinite(buoy.tempF)&&(buoyKm===null||buoyKm<=10||!haveSatellite)){
    return {kind:'buoy',tempF:buoy.tempF,observedAt:buoy.observedAt,label:place.stationName+' '+place.station,
      where:place.water,caveat:'A buoy reading is the water at the buoy'+(buoyKm!==null?', '+buoyKm+' km from '+place.beach.name:'')+', not the shallow water at the beach.',distanceKm:buoyKm,ageHours:buoy.ageHours};
  }
  for(const cell of place.cells||[]){
    const m=cells?.[cell.key];
    if(m&&Number.isFinite(m.tempF)){
      const fromBeach=place.beach?Math.round(kmBetween(place.beach.lat,place.beach.lon,m.sampleLat,m.sampleLon)*10)/10:null;
      return {kind:'satellite',tempF:m.tempF,observedAt:m.observedAt,label:cell.label,cellKey:cell.key,where:place.water,
        caveat:'NOAA daily satellite surface analysis for an offshore pixel'+(fromBeach!==null?' about '+fromBeach+' km from '+place.beach.name:'')+', not a thermometer at the beach. Shallow water on a sunny afternoon can run warmer.',
        distanceKm:fromBeach,sampleLat:m.sampleLat,sampleLon:m.sampleLon,ageHours:m.ageHours};
    }
  }
  return null;
}

function windMph(period){
  const raw=String(period?.windSpeed||'');
  const range=raw.match(/(\d+(?:\.\d+)?)(?:\s*to\s*(\d+(?:\.\d+)?))?\s*(mph|kt|kts|knots)/i);
  if(!range)return null;
  const speed=Math.max(Number(range[1]),Number(range[2]||range[1]));
  return /mph/i.test(range[3])?Math.round(speed):Math.round(speed*1.15078);
}
function weatherPeriods(raw){
  return (Array.isArray(raw)?raw:[]).slice(0,36).map(p=>({
    startsAt:p.startTime||null,tempF:Number.isFinite(Number(p.temperature))?(p.temperatureUnit==='C'?f(Number(p.temperature)):Number(p.temperature)):null,
    windMph:windMph(p),summary:String(p.shortForecast||'').slice(0,100),
    rainChance:Number.isFinite(Number(p.probabilityOfPrecipitation?.value))?Number(p.probabilityOfPrecipitation.value):null,
    humidity:Number.isFinite(Number(p.relativeHumidity?.value))?Number(p.relativeHumidity.value):null,
    daylight:p.isDaytime===true
  })).filter(p=>p.startsAt);
}
/* The hourly period that contains `now`; otherwise the first one. The old code took
   the first DAYLIGHT period, which at 9 pm described tomorrow morning as "now". */
function nowPeriod(periods,now=new Date()){
  const t=now.getTime();
  return periods.find(p=>{const s=Date.parse(p.startsAt);return Number.isFinite(s)&&s<=t&&t<s+3600000;})||periods[0]||null;
}

/* Water bands follow the National Center for Cold Water Safety's public thresholds
   (60°F: cold-shock line; 70°F; 77°F). They describe thermal exposure only. */
function waterBand(tempF){
  if(!Number.isFinite(tempF))return null;
  if(tempF<60)return {key:'cold-shock',name:'Cold-shock cold',text:'Below 60°F. Entering this water causes an involuntary gasp and fast breathing for most people. Wade in slowly, keep your head up, and stay close to shore.'};
  if(tempF<70)return {key:'cold',name:'Cold',text:'In the 60s. A brisk swim for the acclimated; most people are ready to get out within minutes. Children and thin swimmers chill faster.'};
  if(tempF<77)return {key:'cool',name:'Cool but swimmable',text:'In the 70s. Comfortable for an active swim; you will feel it when you stop moving. About as warm as open Lake Michigan gets in August.'};
  return {key:'warm',name:'Warm for the Great Lakes',text:'77°F or above. Rare on Lake Michigan outside sheltered shallows in a hot spell; comfortable for most people.'};
}
/* Getting out wet: air temperature and wind on wet skin, in plain terms. */
function afterText(air,wind){
  if(!Number.isFinite(air))return 'Shoreline air forecast is missing, so we cannot say how fast you will dry off.';
  const w=Number.isFinite(wind)?wind:null;
  const windy=w!==null&&w>=12;
  const airTxt=Math.round(air)+'°F air'+(w===null?'':' and '+w+' mph wind');
  if(air<60)return airTxt+': you will chill within a minute or two of getting out. Have a towel and a dry layer within reach, not in the car.';
  if(air<68)return airTxt+': expect shivering soon after you stand up wet'+(windy?', faster in this breeze':'')+'. Dry off right away.';
  if(air<78)return airTxt+(windy?': the breeze will raise goosebumps while you are wet; it passes once you are dry.':': comfortable to drip-dry in the sun.');
  return airTxt+': warm enough to air-dry. Shade and water matter more than the chill.';
}
function comfort(activity,water,weather){
  const w=weather||{};const wind=w.windMph;const temp=w.tempF;const phrase=String(w.summary||'').toLowerCase();
  const evidence=water&&typeof water==='object'?water:(Number.isFinite(water)?{tempF:water,kind:'buoy',label:'nearby buoy'}:null);
  const tempF=evidence?.tempF??null;
  const band=waterBand(tempF);
  const sky=/sunny|clear|mostly sunny|fair/.test(phrase)?'Sun will make the sand and your skin feel warmer than the air number.':/cloud|overcast|fog|rain|shower/.test(phrase)?'Little direct sun, so the air number is about what you will feel.':'Sun and cloud may change through the day.';
  const windNote=wind===null||wind===undefined?'Wind is unknown, so comfort out of the water cannot be judged.':wind>=18?'A strong '+wind+' mph breeze: wet skin and damp clothing will feel far colder than the air.':wind>=10?'A '+wind+' mph lake breeze will feel cool when you are wet.':'Light wind ('+wind+' mph), so the air temperature is a fair guide.';
  const beach=temp===null||temp===undefined?'Air comfort is unavailable while the shoreline forecast is missing.':temp>=82?'Hot ('+Math.round(temp)+'°F); shade and water matter.':temp>=70?'Mild to warm ('+Math.round(temp)+'°F) for time on the sand.':temp>=55?'Cool ('+Math.round(temp)+'°F); fine moving, chilly sitting still.':'Cold ('+Math.round(temp)+'°F) for staying on the beach long.';
  const where=evidence?.where||'this water';
  const waterText=!evidence?'No recent measurement for '+where+'. We will not guess from the whole-lake average, so we cannot tell you how this water will feel.'
    :band.name+' · '+tempF.toFixed(1)+'°F at '+evidence.label+'. '+band.text;
  const after=afterText(temp,wind);
  const starts={swim:'Planning to swim?',family:'Bringing the family?',paddle:'Planning to paddle?',relax:'Spending time on the sand?'};
  const specific={
    swim:band?.key==='cold-shock'?'At this temperature the first minute is the dangerous one. Enter slowly, never jump in from a height, and swim parallel to shore.':'Water temperature describes thermal exposure, never current or wave safety.',
    family:band?.key==='cold-shock'||band?.key==='cold'?'Children lose heat faster than adults; plan on short dips with warm-up breaks, and supervise closely.':'Children cool faster than adults even in pleasant water. Check official advisories and supervise closely.',
    paddle:band&&tempF<70?'If you capsize, this water is cold enough to matter more than the air. Dress for immersion, not for the forecast.':'Unexpected immersion matters more than warm air. Choose protective gear for the water, not just the forecast.',
    relax:'Air, sun and wind decide your afternoon if you stay dry; the water number only matters when you go in.'
  };
  const a=Object.hasOwn(starts,activity)?activity:'swim';
  return {heading:starts[a],beach:beach+' '+sky+' '+windNote,water:waterText,after,decision:specific[a],band:band?band.key:null,state:evidence?'contextual':'limited'};
}
function bestWeatherWindow(periods,activity){
  // Only compare weather comfort; no claim about beach hazards or water temperature.
  const eligible=periods.filter(p=>p.daylight&&Number.isFinite(p.tempF)&&Number.isFinite(p.windMph));
  if(!eligible.length)return null;
  const score=p=>(activity==='paddle'? -Math.abs(p.tempF-72) : -Math.abs(p.tempF-76)) - p.windMph*.55 -(p.rainChance??50)*.18;
  const winner=[...eligible].sort((a,b)=>score(b)-score(a))[0];
  return {startsAt:winner.startsAt,tempF:winner.tempF,windMph:winner.windMph,summary:winner.summary,reason:'Relative air-and-wind comfort only; NOT a swim-safety or water-temperature forecast.'};
}
module.exports={LAKES,DESTINATIONS,SOURCE,kmBetween,parseGLSEA,parseGLSEACsv,parseLongTermAverage,parseGLSEAGridCsv,parseGLSEABayGridCsv,lakeSeries,parseNDBC,waterEvidence,weatherPeriods,nowPeriod,waterBand,comfort,bestWeatherWindow};
