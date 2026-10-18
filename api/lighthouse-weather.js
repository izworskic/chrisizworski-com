const stops=require('../public/data/lighthouses/stops.json');
const NWS='https://api.weather.gov';
async function get(url){const r=await fetch(url,{headers:{Accept:'application/geo+json','User-Agent':'ChrisIzworskiLighthousePlanner (https://chrisizworski.com/great-lakes-lighthouses/)'},signal:AbortSignal.timeout(6500)});if(!r.ok)throw new Error(`NWS ${r.status}`);return r.json();}
function trusted(url){try{return new URL(url).origin===NWS;}catch{return false;}}
module.exports=async(req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}
 const stop=stops.find(s=>s.id===req.query?.id);
 if(!stop){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Choose a mapped lighthouse'});}
 if(stop.region==='ON'){res.setHeader('Cache-Control','public, s-maxage=3600');return res.status(200).json({status:'outside-coverage',periods:[],alerts:[],alertsStatus:'unavailable',source:'Environment and Climate Change Canada',sourceUrl:'https://weather.gc.ca/',message:'NWS does not provide this Canadian forecast. Check Environment Canada for local conditions.'});}
 try{
 const point=await get(`${NWS}/points/${stop.weatherLat},${stop.weatherLon}`),url=point.properties?.forecastHourly;
 if(!trusted(url))throw new Error('Hourly forecast unavailable');
 const [forecast,alerts]=await Promise.allSettled([get(url),get(`${NWS}/alerts/active?point=${stop.weatherLat},${stop.weatherLon}`)]);
 if(forecast.status!=='fulfilled')throw new Error('Hourly forecast unavailable');
 const f=forecast.value.properties||{},now=Date.now();
 const periods=(f.periods||[]).filter(p=>Date.parse(p.endTime)>now).slice(0,48).map(p=>({startTime:p.startTime,endTime:p.endTime,isDaytime:p.isDaytime===true,temperature:typeof p.temperature==='number'?p.temperature:null,temperatureUnit:p.temperatureUnit,windSpeed:p.windSpeed,windDirection:p.windDirection,shortForecast:p.shortForecast,probabilityOfPrecipitation:typeof p.probabilityOfPrecipitation?.value==='number'?p.probabilityOfPrecipitation.value:null}));
 const updatedAt=f.updateTime||f.generatedAt||null,age=updatedAt?now-Date.parse(updatedAt):Infinity;
 const active=alerts.status==='fulfilled'?(alerts.value.features||[]).map(a=>({event:a.properties?.event,headline:a.properties?.headline,severity:a.properties?.severity,expires:a.properties?.expires})):[];
 res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
 return res.status(200).json({status:!periods.length?'unavailable':age>12*3600000?'stale':'current',fetchedAt:new Date(now).toISOString(),updatedAt,source:'National Weather Service',sourceUrl:`https://forecast.weather.gov/MapClick.php?lat=${stop.weatherLat}&lon=${stop.weatherLon}`,weatherContext:stop.weatherContext||'Nearby land forecast',periods,alerts:active,alertsStatus:alerts.status==='fulfilled'?'current':'unavailable'});
 }catch{res.setHeader('Cache-Control','no-store');return res.status(502).json({status:'unavailable',error:'NWS forecast unavailable. Use the official forecast link and retry.'});}
};
module.exports._test={trusted};
