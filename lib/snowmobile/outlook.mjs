/* NWS digital forecast at a named hub. Forecast only; never trail base.
 * Grid interval API: https://weather-gov.github.io/api/gridpoints
 * Snow amounts are interval totals in mm; boundary overlap is an explicitly
 * approximate uniform-time allocation, not an hourly snow-rate forecast.
 */
const HOUR=3600000;
const DAY=24*HOUR;
const MAX_AGE=6*HOUR;
const iso=ms=>new Date(ms).toISOString();
function interval(raw){
  const [startText,duration,...extra]=String(raw||'').split('/');
  const start=Date.parse(startText);
  const d=duration?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if(extra.length||!Number.isFinite(start)||!d)return null;
  const ms=(Number(d[1]||0)*24*3600+Number(d[2]||0)*3600+Number(d[3]||0)*60+Number(d[4]||0))*1000;
  return Number.isFinite(ms)&&ms>0?{start,end:start+ms}:null;
}
function samples(series,unit,start,end,kind){
  if(series?.uom!==unit||!Array.isArray(series.values))return null;
  const rows=[];
  for(const r of series.values){
    const t=interval(r?.validTime);
    if(!t)return null;
    if(t.end<=start||t.start>=end)continue;
    const v=r.value;
    if(!Number.isFinite(v)||(kind==='snow'&&(v<0||v>3000))||(kind==='temp'&&(v<-90||v>65)))return null;
    rows.push({...t,value:v,left:Math.max(start,t.start),right:Math.min(end,t.end)});
  }
  rows.sort((a,b)=>a.left-b.left);
  // Exact continuous coverage is required; gaps and overlap/duplicate
  // records are not filled or added twice. Missing never means zero.
  let cursor=start;
  for(const r of rows){if(r.left!==cursor)return null;cursor=r.right;}
  return cursor===end?rows:null;
}
function snowWindow(series,start,end){
  const rows=samples(series,'wmoUnit:mm',start,end,'snow');
  if(!rows)return null;
  return rows.reduce((sum,r)=>sum+r.value*(r.right-r.left)/(r.end-r.start),0)/25.4;
}
function tempWindow(series,start,end){
  const rows=samples(series,'wmoUnit:degC',start,end,'temp');
  if(!rows)return null;
  const c=rows.map(r=>r.value);
  const above=rows.reduce((n,r)=>n+(r.value>0?(r.right-r.left)/HOUR:0),0);
  return {lowF:Math.round(Math.min(...c)*9/5+32),highF:Math.round(Math.max(...c)*9/5+32),
    aboveFreezingHours:Math.round(above*10)/10,
    signal:above===0?'AT_OR_BELOW_FREEZING':Math.min(...c)<=0?'FREEZE_THAW_POSSIBLE':'ABOVE_FREEZING'};
}
export function threeDayOutlook(grid,now=Date.now()){
  const p=grid?.properties;
  const issued=Date.parse(p?.updateTime);
  if(!Number.isFinite(now)||!Number.isFinite(issued)||issued>now||now-issued>MAX_AGE)return null;
  const start=Math.ceil(now/HOUR)*HOUR;
  const days=Array.from({length:3},(_,i)=>{
    const from=start+i*DAY,to=from+DAY;
    return {startAt:iso(from),endAt:iso(to),
      snowInches:snowWindow(p.snowfallAmount,from,to),
      temperature:tempWindow(p.temperature,from,to)};
  });
  if(days.every(d=>d.snowInches===null&&d.temperature===null))return null;
  const complete=days.every(d=>d.snowInches!==null&&d.temperature!==null);
  return {version:1,issuedAt:iso(issued),startAt:iso(start),endAt:iso(start+3*DAY),
    status:complete?'AVAILABLE':'PARTIAL',days,
    snowTotalInches:days.every(d=>d.snowInches!==null)?days.reduce((n,d)=>n+d.snowInches,0):null,
    source:'NWS digital forecast grid',scope:'HUB_POINT_ONLY'};
}
