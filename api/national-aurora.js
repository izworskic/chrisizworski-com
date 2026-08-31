const { parseCurrentKp, parseKpForecast, parseOvation, parseSkyCover, skyCoverAt } = require("../lib/aurora");

const SWPC = Object.freeze({
  kpForecast:"https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  kpCurrent:"https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  ovation:"https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
});
const UA="ChrisIzworskiNationalAurora/1.0 (+https://chrisizworski.com/national-tools/aurora/)";

function finite(v,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
async function json(url){
  const r=await fetch(url,{headers:{accept:"application/geo+json, application/json","user-agent":UA},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.json();
}
async function nwsFor(lat,lon){
  const points=await json(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const gridUrl=points?.properties?.forecastGridData;
  const hourlyUrl=points?.properties?.forecastHourly;
  if(!gridUrl||!hourlyUrl)throw new Error("NWS point has no forecast endpoints");
  const [grid,hourly]=await Promise.all([json(gridUrl),json(hourlyUrl)]);
  return {points,grid,hourly};
}
function nightCandidates(hourly,skyCover,now=Date.now()){
  return (hourly?.properties?.periods||[]).filter(p=>{
    const t=Date.parse(p.startTime);return Number.isFinite(t)&&t>=now-3600000&&t<=now+30*3600000&&p.isDaytime===false;
  }).map(p=>({time:p.startTime,temperature_f:p.temperature,cloud_percent:skyCoverAt(skyCover,p.startTime)}));
}
function verdict({ovation,peakKp,nights}){
  if(!nights.length)return {level:"daylight",label:"No darkness in the near-term window",detail:"The aurora signal may exist, but this location does not have a dark viewing period in the next 30 hours.",confidence:"high"};
  const cloudValues=nights.map(x=>x.cloud_percent).filter(Number.isFinite);
  const minCloud=cloudValues.length?Math.min(...cloudValues):null;
  const signal=Number.isFinite(ovation)?ovation:null;
  let level="low",label="Low viewing potential",detail="The local NOAA OVATION signal is limited right now.";
  if(signal!==null&&signal>=10){level=minCloud!==null&&minCloud>70?"cloudy":"strong";label=minCloud!==null&&minCloud>70?"Strong aurora signal, poor sky":"Strong short-term aurora signal";detail=minCloud!==null&&minCloud>70?"NOAA's aurora nowcast is elevated here, but clouds are likely to block the view.":"NOAA's short-term aurora nowcast is elevated near this location.";}
  else if(signal!==null&&signal>=5){level="watch";label="Worth watching";detail="NOAA's local OVATION signal is elevated enough to monitor as conditions evolve.";}
  else if(Number.isFinite(peakKp)&&peakKp>=6){level="watch";label="Geomagnetic activity worth watching";detail="The broader Kp outlook is elevated, but the local OVATION signal is not yet strong here.";}
  if(minCloud!==null&&minCloud>85&&level!=="low"){level="cloudy";label="Clouds are the limiting factor";}
  return {level,label,detail,confidence:signal!==null&&minCloud!==null?"medium-high":"medium"};
}

module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({error:"Method not allowed"});}
  const lat=finite(req.query?.lat,-90,90),lon=finite(req.query?.lon,-180,180);
  if(lat===null||lon===null)return res.status(400).json({error:"Valid latitude and longitude are required"});
  const settled=await Promise.allSettled([json(SWPC.kpForecast),json(SWPC.kpCurrent),json(SWPC.ovation),nwsFor(lat,lon)]);
  const [kpF,kpC,ov,nws]=settled;
  const forecast=kpF.status==="fulfilled"?parseKpForecast(kpF.value):{peak_24h:null,peak_24h_at:null,periods:[]};
  const current=kpC.status==="fulfilled"?parseCurrentKp(kpC.value):null;
  const parsedOv=ov.status==="fulfilled"?parseOvation(ov.value):null;
  const ovationValue=parsedOv?parsedOv.valueAt(lat,lon):null;
  let sky={updated_at:null,periods:[]},nights=[];
  if(nws.status==="fulfilled"){sky=parseSkyCover(nws.value.grid);nights=nightCandidates(nws.value.hourly,sky);}
  const best=nights.filter(x=>Number.isFinite(x.cloud_percent)).sort((a,b)=>a.cloud_percent-b.cloud_percent)[0]||nights[0]||null;
  const resultVerdict=verdict({ovation:ovationValue,peakKp:forecast.peak_24h,nights});
  return res.status(200).json({
    retrieved_at:new Date().toISOString(),
    degraded:settled.some(x=>x.status==="rejected"),
    location:{latitude:lat,longitude:lon,timeZone:nws.status==="fulfilled"?nws.value.points?.properties?.timeZone:null},
    verdict:resultVerdict,
    local_signal:{ovation_value:ovationValue,ovation_forecast_at:parsedOv?.forecast_time?new Date(parsedOv.forecast_time).toISOString():null,best_dark_window:best,night_hours:nights.slice(0,12)},
    geomagnetic:{current_kp:current?.kp??null,current_observed_at:current?.observed_at??null,peak_24h_kp:forecast.peak_24h,peak_24h_at:forecast.peak_24h_at},
    sky_cover_updated_at:sky.updated_at,
    notes:{
      ovation:"OVATION is NOAA's 30–90 minute modeled aurora signal. The grid value is not a percent chance of seeing aurora.",
      kp:"Kp describes broad geomagnetic activity and is context, not a local visibility probability.",
      visibility:"Clouds, darkness, light pollution, moonlight and horizon quality can prevent a sighting even when space-weather signals are elevated."
    },
    sources:[
      {name:"NOAA Space Weather Prediction Center — OVATION",url:"https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",available:ov.status==="fulfilled"},
      {name:"NOAA Space Weather Prediction Center — Kp",url:"https://www.swpc.noaa.gov/products/planetary-k-index",available:kpF.status==="fulfilled"||kpC.status==="fulfilled"},
      {name:"National Weather Service forecast API",url:"https://www.weather.gov/documentation/services-web-API",available:nws.status==="fulfilled"}
    ]
  });
};
module.exports._test={finite,nightCandidates,verdict};
