const SITES=['04123500','04124000','04124200','04125550','04125460'];
const USGS='https://waterservices.usgs.gov/nwis/iv/';

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
  const point=values[values.length-1]||null;
  if(!point)return null;
  return {value:finite(point.value),dateTime:point.dateTime||null,qualifiers:point.qualifiers||[]};
}
function normalize(payload){
  const bySite={};
  for(const series of payload?.value?.timeSeries||[]){
    const id=siteCode(series);
    const code=parameterCode(series);
    if(!id||!code)continue;
    if(!bySite[id]){
      const geo=series.sourceInfo?.geoLocation?.geogLocation||{};
      bySite[id]={
        id,
        name:series.sourceInfo?.siteName||id,
        latitude:finite(geo.latitude),
        longitude:finite(geo.longitude),
        measured_at:null,
        discharge_cfs:null,
        water_temp_c:null,
        water_temp_f:null,
        gage_height_ft:null
      };
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
  }
  return SITES.map(id=>bySite[id]||{id,name:id,latitude:null,longitude:null,measured_at:null,discharge_cfs:null,water_temp_c:null,water_temp_f:null,gage_height_ft:null});
}
function tempContext(f){
  if(f===null)return {key:'unknown',label:'Temperature not reported'};
  if(f>=68)return {key:'thermal-stress',label:'68°F+ — trout thermal-stress context'};
  if(f>=65)return {key:'warm',label:'65–67.9°F — use extra trout-care judgment'};
  return {key:'cool',label:'Below 65°F'};
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  const url=new URL(USGS);
  url.searchParams.set('format','json');
  url.searchParams.set('sites',SITES.join(','));
  url.searchParams.set('parameterCd','00010,00060,00065');
  url.searchParams.set('siteStatus','all');
  try{
    const response=await fetch(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiManisteeFieldMap/1.0 (https://chrisizworski.com/manistee-river-map/)'},signal:AbortSignal.timeout(9000)});
    if(!response.ok)throw new Error(`USGS returned ${response.status}`);
    const payload=await response.json();
    const gauges=normalize(payload).map(g=>({...g,temperature_context:tempContext(g.water_temp_f)}));
    const now=Date.now();
    for(const gauge of gauges){
      const t=Date.parse(gauge.measured_at||'');
      gauge.age_minutes=Number.isFinite(t)?Math.round((now-t)/60000):null;
      gauge.fresh=gauge.age_minutes!==null&&gauge.age_minutes>=0&&gauge.age_minutes<=180;
    }
    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      source:'USGS Water Services — provisional instantaneous values subject to revision',
      source_url:'https://waterdata.usgs.gov/',
      fetched_at:new Date().toISOString(),
      gauges,
      disclaimer:'These readings describe measured river conditions at individual gauges. They are not a boating-safety determination, do not represent every reach, and temperature context is a trout-care planning aid rather than a legal closure.'
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'USGS Manistee conditions unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={finite,cToF,parameterCode,siteCode,latest,normalize,tempContext,SITES};
