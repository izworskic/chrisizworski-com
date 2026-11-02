'use strict';
// Historical Garden Pest Timing Lab v1: retrospective research, NOT an emergence
// forecast. NASA Daymet daily tmin/tmax are independent of USA-NPN DDRP inputs.
// Daymet uses exactly 365 yday records even in leap years (skips Dec 31).
const HISTORIC_YEARS=Object.freeze([2021,2022,2023,2024,2025]);
const DAYMET_SOURCE='https://daymet.ornl.gov/web_services';
const DAYMET_CITATION='Thornton et al. (2022), Daymet V4 R1, NASA ORNL DAAC, doi:10.3334/ORNLDAAC/2129';
const JAPANESE_SOURCE='https://www.usanpn.org/data/maps/forecasts/Japanese_beetle';
const MODEL=Object.freeze({
 id:'japanese-beetle-daymet-retrospective-v1',
 pestId:'japanese-beetle',
 temperatureSource:'NASA Daymet V4 1km gridded historical tmax/tmin',
 expectedInput:'Daily tmax and tmin in °C',
 method:'single-triangle-horizontal-upper-cutoff',
 methodCaveat:'Independent single-triangle horizontal upper-cap reconstruction; exact parity with the operational DDRP/USA-NPN implementation has NOT been established.',
 start:'January 1',
 lowerF:50,
 upperF:92,
 thresholds:Object.freeze([{id:'adults',name:'Adult emergence heat threshold',gddF:873},{id:'eggs',name:'Egg hatch heat threshold',gddF:1543}]),
 sourceUrl:JAPANESE_SOURCE,
 status:'EXPERIMENTAL_HISTORICAL_ONLY'
});
function validDaily(low,high){
 return typeof low==='number'&&typeof high==='number'&&Number.isFinite(low)&&Number.isFinite(high)
 &&low<=high&&low>=-95&&high<=145;
}
// Average area above a lower temperature threshold under a symmetrical
// triangular diurnal temperature interpolation. Degrees Fahrenheit per day.
// Unlike a simple daily mean, returns non-zero when Tmin<base<Tmax and
// handles upper horizontal cap via subtracting the excess above upper bound.
function aboveThreshold(low,high,base){
 if(high<=base)return 0;
 if(low>=base)return (low+high)/2-base;
 if(high===low)return 0;
 return ((high-base)**2)/(2*(high-low));
}
function singleTriangleGddF(low,high,lower=50,upper=92){
 if(!validDaily(low,high)||!Number.isFinite(lower)||!Number.isFinite(upper)||lower>=upper)throw Error('INVALID_MODEL_TEMPERATURE');
 const raw=aboveThreshold(low,high,lower)-aboveThreshold(low,high,upper);
 return Math.max(0,Math.min(upper-lower,raw));
}
function simpleAverageGddF(low,high,base=43){
 if(!validDaily(low,high))throw Error('INVALID_MODEL_TEMPERATURE');
 return Math.max(0,(low+high)/2-base);
}
function daymetURL(lat,lon,years=HISTORIC_YEARS){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41.4||lat>48.7||lon< -90.7||lon> -81.9)throw Error('INVALID_MICHIGAN_REFERENCE_POINT');
 if(!Array.isArray(years)||years.length<1||years.length>5||years.some(y=>!HISTORIC_YEARS.includes(y))||new Set(years).size!==years.length)throw Error('INVALID_HISTORIC_YEAR_SCOPE');
 const u=new URL('https://daymet.ornl.gov/single-pixel/api/data');
 u.searchParams.set('lat',lat.toFixed(4));u.searchParams.set('lon',lon.toFixed(4));
 u.searchParams.set('vars','tmax,tmin');u.searchParams.set('years',years.join(','));
 return u.toString();
}
function parseDaymetCsv(csv,years=HISTORIC_YEARS){
 if(typeof csv!=='string'||csv.length>750000||csv.length<300||!Array.isArray(years))throw Error('DAYMET_INVALID_PAYLOAD');
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const headerIndex=lines.findIndex(s=>/^year\s*,\s*yday\s*,/i.test(s));
 if(headerIndex<0||headerIndex>15)throw Error('DAYMET_CSV_HEADER_MISSING');
 const columns=lines[headerIndex].split(',').map(x=>x.trim().toLowerCase());
 const idx={year:columns.indexOf('year'),yday:columns.indexOf('yday'),
  max:columns.findIndex(x=>x.startsWith('tmax (deg c)')),min:columns.findIndex(x=>x.startsWith('tmin (deg c)'))};
 if(Object.values(idx).some(x=>x<0))throw Error('DAYMET_REQUIRED_COLUMNS_MISSING');
 const all=new Map(years.map(y=>[y,[]]));
 for(const s of lines.slice(headerIndex+1)){
  const cells=s.split(',').map(v=>v.trim());
  if(cells.length!==columns.length)throw Error('DAYMET_BAD_ROW');
  const year=Number(cells[idx.year]),yday=Number(cells[idx.yday]),max=Number(cells[idx.max]),min=Number(cells[idx.min]);
  if(!all.has(year)||!Number.isInteger(yday)||yday<1||yday>365||cells[idx.max]===''||cells[idx.min]===''
  ||!Number.isFinite(max)||!Number.isFinite(min)||min>max||min<-60||max>60)throw Error('DAYMET_BAD_VALUES');
  const out=all.get(year);
  if(out.some(r=>r.yday===yday))throw Error('DAYMET_DUPLICATE_DAY');
  out.push({year,yday,tmaxC:max,tminC:min});
 }
 for(const [year,rows] of all){
  if(rows.length!==365)throw Error('DAYMET_INCOMPLETE_YEAR_'+year);
  rows.sort((a,b)=>a.yday-b.yday);
  if(rows.some((r,i)=>r.yday!==i+1))throw Error('DAYMET_MISSING_DAY_'+year);
 }
 return all;
}
function f(c){return c*9/5+32}
function isoForDay(year,yday){
 return new Date(Date.UTC(year,0,yday)).toISOString().slice(0,10);
}
function computeYear(year,rows){
 if(!Array.isArray(rows)||rows.length!==365||rows.some((r,i)=>r.year!==year||r.yday!==i+1))throw Error('INVALID_YEAR_SERIES');
 let cumulative=0;
 const events=Object.fromEntries(MODEL.thresholds.map(t=>[t.id,null]));
 const used=[];
 for(const row of rows){
  const add=singleTriangleGddF(f(row.tminC),f(row.tmaxC),MODEL.lowerF,MODEL.upperF);
  cumulative+=add;
  for(const t of MODEL.thresholds)if(!events[t.id]&&cumulative>=t.gddF)events[t.id]={date:isoForDay(year,row.yday),yday:row.yday,atThresholdF:t.gddF};
  used.push({yday:row.yday,total:cumulative});
 }
 return {year,modelId:MODEL.id,events,totalModelHeatF:Math.round(cumulative*10)/10,daysComplete:365,
  eventDescription:'Retrospective modeled thermal threshold crossing, not an observed insect appearance',
  sourceObservedYear:year};
}
function summarize(years){
 if(!Array.isArray(years)||years.length<3||years.length>5||years.some(y=>!Number.isInteger(y.year)))throw Error('INSUFFICIENT_VALIDATED_HISTORY');
 const stages=MODEL.thresholds.map(stage=>{
  const pairs=years.map(y=>({year:y.year,...y.events[stage.id]})).filter(x=>x.date);
  const days=pairs.map(x=>x.yday).sort((a,b)=>a-b);
  // Never invent a range, central estimate or future date if an event is
  // missing in ANY study year (at selected location).
  const complete=pairs.length===years.length;
  const median=complete?days[Math.floor(days.length/2)]:null;
  return {id:stage.id,stage:stage.name,thresholdGddF:stage.gddF,
    yearsCrossed:pairs.length,yearsTotal:years.length,status:complete?'HISTORIC_MODELLED':'INCOMPLETE',
    earliestYday:complete?days[0]:null,latestYday:complete?days[days.length-1]:null,medianYday:median,
    samples:pairs.map(p=>({year:p.year,date:p.date,yday:p.yday})),
    note:complete?'Range of reconstructed past threshold-crossing dates; not observed pest emergence and NOT a future forecast.':'Not every studied year reached the published thermal threshold; no central timing is inferred.'};
 });
 return stages;
}
async function fetchHistorical(lat,lon,fetcher=fetch,nowMs=Date.now()){
 const years=HISTORIC_YEARS;
 const url=daymetURL(lat,lon,years);
 const response=await fetcher(url,{headers:{accept:'text/csv','user-agent':'GardenPestScientificResearch/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},redirect:'error',signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw Error('DAYMET_FETCH_UNAVAILABLE');
 const text=await response.text();
 const byYear=parseDaymetCsv(text,years);
 const calculated=years.map(y=>computeYear(y,byYear.get(y)));
 return {schema:'garden-pest-historical-lab-v1',status:'HISTORIC_MODELLED_RESEARCH_ONLY',checkedAt:new Date(nowMs).toISOString(),
  geographicalMeaning:'1 km gridded historical temperature for the reference coordinate, not the garden address or a pest detection',
  model:MODEL,years,source:{name:'NASA ORNL DAAC Daymet Version 4 R1',url,citation:DAYMET_CITATION,
    license:'Daymet public research data; preserve NASA ORNL DAAC citation',modelSource:JAPANESE_SOURCE},
  events:summarize(calculated),annual:calculated,
  rightsAndParity:'Published model thresholds credited to USA-NPN. Independent calculations have no verified parity with USA-NPN operational DDRP; DO NOT promote this series to current-year pest alerts or treatment schedules.'};
}
module.exports={HISTORIC_YEARS,DAYMET_SOURCE,DAYMET_CITATION,MODEL,aboveThreshold,singleTriangleGddF,simpleAverageGddF,
 daymetURL,parseDaymetCsv,computeYear,summarize,fetchHistorical,isoForDay};
