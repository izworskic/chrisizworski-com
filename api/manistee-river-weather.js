const NWS='https://api.weather.gov';

function number(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function validPoint(lat,lon){
  return lat!==null&&lon!==null&&lat>=43.8&&lat<=45.1&&lon>=-86.5&&lon<=-84.4;
}
async function getJson(url){
  const response=await fetch(url,{
    headers:{accept:'application/geo+json, application/json','user-agent':'ChrisIzworskiManisteeFieldMap/2.0 (https://chrisizworski.com/manistee-river-map/)'},
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error(`NWS returned ${response.status}`);
  return response.json();
}
function period(p={}){
  return {
    name:p.name||null,
    startTime:p.startTime||null,
    endTime:p.endTime||null,
    isDaytime:p.isDaytime??null,
    temperature:number(p.temperature),
    temperatureUnit:p.temperatureUnit||null,
    windSpeed:p.windSpeed||null,
    windDirection:p.windDirection||null,
    shortForecast:p.shortForecast||null,
    detailedForecast:p.detailedForecast||null,
    probabilityOfPrecipitation:p.probabilityOfPrecipitation?.value??null,
  };
}
function alert(a={}){
  const p=a.properties||{};
  return {id:a.id||null,event:p.event||null,severity:p.severity||null,urgency:p.urgency||null,headline:p.headline||null,effective:p.effective||null,expires:p.expires||null,instruction:p.instruction||null};
}
function precipContext(periods=[]){
  const upcoming=periods.slice(0,8).map(p=>number(p.probabilityOfPrecipitation)).filter(v=>v!==null);
  const max=upcoming.length?Math.max(...upcoming):null;
  if(max===null)return {key:'unknown',label:'Precipitation probability unavailable',max_probability:null};
  if(max>=70)return {key:'high',label:'High precipitation chance in the next forecast periods',max_probability:max};
  if(max>=40)return {key:'moderate',label:'Meaningful precipitation chance in the next forecast periods',max_probability:max};
  if(max>=20)return {key:'low',label:'Some precipitation is possible',max_probability:max};
  return {key:'dry',label:'Low precipitation probability in the next forecast periods',max_probability:max};
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  const lat=number(req.query?.lat),lon=number(req.query?.lon);
  if(!validPoint(lat,lon)){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'A valid Manistee-region latitude and longitude are required'});
  }
  try{
    const points=await getJson(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const props=points?.properties||{};
    const hourlyUrl=props.forecastHourly,forecastUrl=props.forecast;
    if(!hourlyUrl&&!forecastUrl)throw new Error('NWS point lookup did not return a forecast URL');
    const [hourly,daily,alerts]=await Promise.all([
      hourlyUrl?getJson(hourlyUrl):Promise.resolve({properties:{periods:[]}}),
      forecastUrl?getJson(forecastUrl):Promise.resolve({properties:{periods:[]}}),
      getJson(`${NWS}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`).catch(()=>({features:[]}))
    ]);
    const hourlyPeriods=(hourly?.properties?.periods||[]).slice(0,12).map(period);
    const dailyPeriods=(daily?.properties?.periods||[]).slice(0,8).map(period);
    const activeAlerts=(alerts?.features||[]).map(alert).slice(0,8);
    const relative=props.relativeLocation?.properties||{};
    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      source:'National Weather Service',
      source_url:'https://www.weather.gov/',
      fetched_at:new Date().toISOString(),
      point:{latitude:lat,longitude:lon},
      place:{city:relative.city||null,state:relative.state||'MI'},
      hourly:hourlyPeriods,
      forecast:dailyPeriods,
      precipitation_context:precipContext(hourlyPeriods.length?hourlyPeriods:dailyPeriods),
      alerts:activeAlerts,
      disclaimer:'Weather and alerts are planning context near the selected access point. They do not measure river conditions, predict fish activity, or determine whether paddling, wading, boating, or fishing is safe.'
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Local NWS weather unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={number,validPoint,period,alert,precipContext};
