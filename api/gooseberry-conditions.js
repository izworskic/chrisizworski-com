// NWS regional *forecast* and *alerts* for Gooseberry Falls vicinity.
// NOT park trail status; NOT observed Gooseberry River discharge.
const POSITION={lat:47.143,lon:-91.470};
const HEADERS={Accept:'application/geo+json','User-Agent':'chrisizworski.com (public outdoor visitor decision engine)'};
const abortAfter=(ms=5200)=>{const c=new AbortController();const timeout=setTimeout(()=>c.abort(),ms);return {signal:c.signal,done:()=>clearTimeout(timeout)};};
async function getJson(url) {
  const a=abortAfter();
  try {
    const r=await fetch(url,{headers:HEADERS,signal:a.signal});
    if(!r.ok)throw new Error('upstream '+r.status);
    return await r.json();
  } finally{a.done();}
}
const string=(v)=>typeof v==='string'?v:'';
const validDate=(v)=>{if(typeof v!=='string')return null;const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString():null;};
module.exports=async function handler(req,res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=300');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const checkedAt=new Date().toISOString();
  const point=POSITION.lat+','+POSITION.lon;
  const result={scope:'regional-weather-only',parkAccess:'UNVERIFIED',flowMeasurement:'UNAVAILABLE_NO_CONTINUOUS_USGS_DATA',
    checkedAt,parkConditionsSource:'https://www.dnr.state.mn.us/state-parks/park.html?id=spk00172',
    weather:{state:'unavailable',source:'https://api.weather.gov/points/'+point,issuedAt:null,periods:[]},
    alerts:{state:'unavailable',source:'https://api.weather.gov/alerts/active?point='+point,items:[]}};
  const [pointResult,alertResult]=await Promise.allSettled([
    getJson('https://api.weather.gov/points/'+point),
    getJson('https://api.weather.gov/alerts/active?point='+point)
  ]);
  if(pointResult.status==='fulfilled') {
    const forecastUrl=pointResult.value?.properties?.forecast;
    if(typeof forecastUrl==='string'&&forecastUrl.startsWith('https://api.weather.gov/')){
      try{
        const j=await getJson(forecastUrl);
        const p=j?.properties||{};
        result.weather={state:'forecast',source:forecastUrl,issuedAt:validDate(p.updated),
          periods:(Array.isArray(p.periods)?p.periods:[]).slice(0,6).map(x=>({
            name:string(x.name).slice(0,90),startTime:validDate(x.startTime),endTime:validDate(x.endTime),
            temperature:Number.isFinite(Number(x.temperature))?Number(x.temperature):null,
            temperatureUnit:string(x.temperatureUnit),shortForecast:string(x.shortForecast).slice(0,150),
            isDaytime:Boolean(x.isDaytime)
          }))};
      }catch{result.weather.state='unavailable';}
    }
  }
  if(alertResult.status==='fulfilled'){
    const f=Array.isArray(alertResult.value?.features)?alertResult.value.features:[];
    result.alerts={state:'reported',source:'https://api.weather.gov/alerts/active?point='+point,
      items:f.slice(0,8).map(x=>({event:string(x.properties?.event).slice(0,120),
        severity:string(x.properties?.severity).slice(0,40),
        headline:string(x.properties?.headline).slice(0,200),
        issuedAt:validDate(x.properties?.sent),expiresAt:validDate(x.properties?.expires),
        url:string(x.properties?.['@id']||x.id).slice(0,350)
      }))};
  }
  return res.status(200).json(result);
};
