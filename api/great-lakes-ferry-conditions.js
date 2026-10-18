// Best-effort U.S. shore gateway forecast. This is NOT an open-water marine forecast,
// live ferry status, cancellation signal or vessel safety assessment.
const PORTS=Object.freeze({
 "put-in-bay":{name:"Catawba Island, Ohio",lat:41.57,lon:-82.856},
 "lake-express":{name:"Muskegon, Michigan",lat:43.228,lon:-86.335},
 "ss-badger":{name:"Ludington, Michigan",lat:43.955,lon:-86.452},
 "isle-royale":{name:"Houghton, Michigan",lat:47.121,lon:-88.572},
 "beaver":{name:"Charlevoix, Michigan",lat:45.32,lon:-85.261},
});
const headers={Accept:"application/geo+json","User-Agent":"ChrisIzworskiFerryPlanner/1.0 (https://chrisizworski.com/)"};
async function json(url){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
 try{const response=await fetch(url,{headers,signal:controller.signal});if(!response.ok)throw Error("NWS request failed");return await response.json()}
 finally{clearTimeout(timer)}
}
export default async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"})}
 const id=String(req.query?.id||"");const port=PORTS[id];
 if(!port)return res.status(400).json({error:"No supported U.S. gateway for that route"});
 res.setHeader("Cache-Control","public, s-maxage=1200, stale-while-revalidate=600");
 try{
  const p=await json("https://api.weather.gov/points/"+port.lat+","+port.lon);
  const u=p?.properties?.forecastHourly;
  if(!u||!/^https:\/\/api\.weather\.gov\//.test(u))throw Error("Forecast link unavailable");
  const f=await json(u);
  const periods=(f?.properties?.periods||[]).slice(0,12).map(x=>({
    starts:x.startTime,temperature:x.temperature,temperatureUnit:x.temperatureUnit,
    windSpeed:x.windSpeed,windDirection:x.windDirection,shortForecast:x.shortForecast
  })).filter(x=>x.starts&&x.windSpeed);
  if(!periods.length)throw Error("No valid hourly forecast periods");
  return res.status(200).json({type:"shore-hourly-forecast",source:"National Weather Service",gateway:port.name,lat:port.lat,lon:port.lon,updatedAt:f.properties?.updateTime||new Date().toISOString(),periods,disclaimer:"A shore-side weather forecast at one mainland gateway; not open-water marine weather, a ferry cancellation, vessel approval or a safety forecast."})
 }catch{return res.status(503).json({error:"Hourly shore forecast temporarily unavailable. Consult the official operator and NWS marine forecast."})}
}