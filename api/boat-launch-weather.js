const NWS='https://api.weather.gov';

function number(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function validPoint(lat,lon){
  return lat!==null&&lon!==null&&lat>=41.5&&lat<=48.6&&lon>=-90.6&&lon<=-82.0;
}
async function getJson(url){
  const response=await fetch(url,{
    headers:{
      accept:'application/geo+json, application/json',
      'user-agent':'ChrisIzworskiBoatLaunchFinder/4.0 (https://chrisizworski.com/michigan-boat-launches/)'
    },
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error(`NWS returned ${response.status}`);
  return response.json();
}
function period(p={}){
  return {
    name:p.name||null,
    startTime:p.startTime||null,
    isDaytime:p.isDaytime??null,
    temperature:Number.isFinite(Number(p.temperature))?Number(p.temperature):null,
    temperatureUnit:p.temperatureUnit||null,
    windSpeed:p.windSpeed||null,
    windDirection:p.windDirection||null,
    shortForecast:p.shortForecast||null,
    probabilityOfPrecipitation:p.probabilityOfPrecipitation?.value??null,
  };
}
function alert(a={}){
  const p=a.properties||{};
  return {
    id:a.id||null,
    event:p.event||null,
    severity:p.severity||null,
    urgency:p.urgency||null,
    headline:p.headline||null,
    effective:p.effective||null,
    expires:p.expires||null,
    instruction:p.instruction||null,
  };
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
    return res.status(400).json({error:'A valid Michigan launch latitude and longitude are required'});
  }
  try{
    const points=await getJson(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const props=points?.properties||{};
    const forecastUrl=props.forecastHourly||props.forecast;
    if(!forecastUrl)throw new Error('NWS point lookup did not return a forecast URL');
    const [forecast,alerts]=await Promise.all([
      getJson(forecastUrl),
      getJson(`${NWS}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`).catch(()=>({features:[]}))
    ]);
    const periods=(forecast?.properties?.periods||[]).slice(0,8).map(period);
    const activeAlerts=(alerts?.features||[]).map(alert).slice(0,8);
    const relative=props.relativeLocation?.properties||{};
    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      source:'National Weather Service',
      source_url:'https://www.weather.gov/',
      fetched_at:new Date().toISOString(),
      point:{latitude:lat,longitude:lon},
      place:{city:relative.city||null,state:relative.state||'MI'},
      periods,
      alerts:activeAlerts,
      disclaimer:'Forecast and alerts are local planning context, not a ramp, wave, water-temperature or boating-safety determination.'
    });
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Local NWS weather unavailable',detail:String(error?.message||error)});
  }
};

module.exports._test={number,validPoint,period,alert};
