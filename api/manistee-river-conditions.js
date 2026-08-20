const SITES=['04123500','04124000','04124200','04125550','04125460'];
const USGS_IV='https://waterservices.usgs.gov/nwis/iv/';
const USGS_STAT='https://waterservices.usgs.gov/nwis/stat/';

function finite(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function cToF(c){return c===null?null:Math.round((c*9/5+32)*10)/10;}
function parameterCode(series={}){
  return series.variable?.variableCode?.[0]?.value||null;
}
function siteCode(series={}){
  return series.sourceInfo?.siteCode?.[0]?.value||null;
}
function latest(series={}){
  const values=series.values?.[0]?.value||[];
  for(let i=values.length-1;i>=0;i--){
    const point=values[i];
    const value=finite(point?.value);
    if(value!==null&&value!==-999999)return {value,dateTime:point.dateTime||null,qualifiers:point.qualifiers||[]};
  }
  return null;
}
function emptyGauge(id){
  return {id,name:id,latitude:null,longitude:null,measured_at:null,discharge_cfs:null,water_temp_c:null,water_temp_f:null,gage_height_ft:null,turbidity_fnu:null,dissolved_oxygen_mgl:null};
}
function normalize(payload){
  const bySite={};
  for(const series of payload?.value?.timeSeries||[]){
    const id=siteCode(series),code=parameterCode(series);
    if(!id||!code)continue;
    if(!bySite[id]){
      const geo=series.sourceInfo?.geoLocation?.geogLocation||{};
      bySite[id]={...emptyGauge(id),name:series.sourceInfo?.siteName||id,latitude:finite(geo.latitude),longitude:finite(geo.longitude)};
    }
    const point=latest(series);
    if(!point||point.value===null)continue;
    if(!bySite[id].measured_at||String(point.dateTime)>String(bySite[id].measured_at))bySite[id].measured_at=point.dateTime;
    if(code==='00060')bySite[id].discharge_cfs=point.value;
    if(code==='00010'){
      bySite[id].water_temp_c=point.value;
      bySite[id].water_temp_f=cToF(point.value);
    }
    if(code==='00065')bySite[id].gage_height_ft=point.value;
    if(code==='63680')bySite[id].turbidity_fnu=point.value;
    if(code==='00300')bySite[id].dissolved_oxygen_mgl=point.value;
  }
  return SITES.map(id=>bySite[id]||emptyGauge(id));
}
function tempContext(f){
  if(f===null)return {key:'unknown',label:'Temperature not reported'};
  if(f>=68)return {key:'thermal-stress',label:'68°F+ — trout thermal-stress context'};
  if(f>=65)return {key:'warm',label:'65–67.9°F — use extra trout-care judgment'};
  return {key:'cool',label:'Below 65°F'};
}
function flowContext(flow,stats={}){
  const median=finite(stats.p50);
  if(flow===null||median===null||median<=0)return {key:'unknown',label:'Seasonal flow comparison unavailable',percent_of_median:null};
  const pct=Math.round((flow/median)*100);
  let key='near-median',label='Near the seasonal median';
  if(pct<70){key='well-below-median';label='Well below the seasonal median';}
  else if(pct<90){key='below-median';label='Below the seasonal median';}
  else if(pct<=110){key='near-median';label='Near the seasonal median';}
  else if(pct<=140){key='above-median';label='Above the seasonal median';}
  else {key='well-above-median';label='Well above the seasonal median';}
  return {key,label,percent_of_median:pct};
}
function parseStatsRdb(text,siteId,date=new Date()){
  const lines=String(text||'').split(/\r?\n/).filter(Boolean);
  const headerIndex=lines.findIndex(line=>!line.startsWith('#')&&line.split('\t').includes('month_nu'));
  if(headerIndex<0)return {gaugeId:siteId,p10:null,p25:null,p50:null,p75:null,p90:null};
  const header=lines[headerIndex].split('\t');
  const month=String(date.getMonth()+1),day=String(date.getDate());
  const monthI=header.indexOf('month_nu'),dayI=header.indexOf('day_nu');
  const get=(parts,name)=>{
    const i=header.indexOf(name);
    return i>=0?finite(parts[i]):null;
  };
  for(const line of lines.slice(headerIndex+2)){
    if(line.startsWith('#'))continue;
    const parts=line.split('\t');
    if(parts[monthI]===month&&parts[dayI]===day){
      return {gaugeId:siteId,p10:get(parts,'p10_va'),p25:get(parts,'p25_va'),p50:get(parts,'p50_va'),p75:get(parts,'p75_va'),p90:get(parts,'p90_va')};
    }
  }
  return {gaugeId:siteId,p10:null,p25:null,p50:null,p75:null,p90:null};
}
async function getStats(siteId){
  const url=new URL(USGS_STAT);
  url.searchParams.set('format','rdb');
  url.searchParams.set('sites',siteId);
  url.searchParams.set('statReportType','daily');
  url.searchParams.set('statTypeCd','p10,p25,p50,p75,p90');
  url.searchParams.set('parameterCd','00060');
  try{
    const response=await fetch(url,{headers:{accept:'text/plain','user-agent':'ChrisIzworskiManisteeFieldMap/2.0 (https://chrisizworski.com/manistee-river-map/)'},signal:AbortSignal.timeout(6500)});
    if(!response.ok)throw new Error(`USGS statistics returned ${response.status}`);
    return parseStatsRdb(await response.text(),siteId);
  }catch(_error){
    return {gaugeId:siteId,p10:null,p25:null,p50:null,p75:null,p90:null};
  }
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  const url=new URL(USGS_IV);
  url.searchParams.set('format','json');
  url.searchParams.set('sites',SITES.join(','));
  url.searchParams.set('parameterCd','00010,00060,00065,63680,00300');
  url.searchParams.set('siteStatus','all');
  try{
    const [response,statsList]=await Promise.all([
      fetch(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiManisteeFieldMap/2.0 (https://chrisizworski.com/manistee-river-map/)'},signal:AbortSignal.timeout(9000)}),
      Promise.all(SITES.map(getStats))
    ]);
    if(!response.ok)throw new Error(`USGS returned ${response.status}`);
    const payload=await response.json();
    const statsBySite=new Map(statsList.map(s=>[s.gaugeId,s]));
    const gauges=normalize(payload).map(g=>{
      const stats=statsBySite.get(g.id)||{};
      return {...g,seasonal_stats:stats,temperature_context:tempContext(g.water_temp_f),flow_context:flowContext(g.discharge_cfs,stats)};
    });
    const now=Date.now();
    for(const gauge of gauges){
      const t=Date.parse(gauge.measured_at||'');
      gauge.age_minutes=Number.isFinite(t)?Math.round((now-t)/60000):null;
      gauge.fresh=gauge.age_minutes!==null&&gauge.age_minutes>=0&&gauge.age_minutes<=180;
    }
    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      source:'USGS Water Services — provisional instantaneous values plus approved daily statistics, subject to revision and availability',
      source_url:'https://waterdata.usgs.gov/',
      statistics_source_url:'https://waterservices.usgs.gov/docs/statistics/',
      fetched_at:new Date().toISOString(),
      gauges,
      disclaimer:'Each gauge describes its measured location. Seasonal flow comparisons use approved USGS daily statistics for this calendar date when available. They are descriptive context, not a fishing-quality or boating-safety score.'
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'USGS Manistee conditions unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={finite,cToF,parameterCode,siteCode,latest,normalize,tempContext,flowContext,parseStatsRdb,SITES};
