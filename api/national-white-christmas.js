const { finite, sourceMeta } = require("../lib/national-outdoor");
const snow = require("./national-snow")._test;

const ACIS_META = "https://data.rcc-acis.org/StnMeta";
const ACIS_DATA = "https://data.rcc-acis.org/StnData";
const CPC_SEASON_TEMP = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/cpc_sea_temp_outlk/MapServer";
const CPC_SEASON_PRECIP = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/cpc_sea_precip_outlk/MapServer";
const CPC_MONTH_TEMP = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/cpc_mthly_temp_outlk/MapServer";
const CPC_MONTH_PRECIP = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/cpc_mthly_precip_outlk/MapServer";
const NWS_POINTS = "https://api.weather.gov/points";
const UA = "ChrisIzworskiWhiteChristmas/1.0 (+https://chrisizworski.com/national-tools/white-christmas/)";

function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }
function round5(v){ return Math.round(v/5)*5; }
function rad(v){ return Number(v)*Math.PI/180; }
function miles(a,b,c,d){
  const lat1=finite(a,-90,90),lon1=finite(b,-180,180),lat2=finite(c,-90,90),lon2=finite(d,-180,180);
  if([lat1,lon1,lat2,lon2].some(v=>v==null))return Infinity;
  const dl=rad(lat2-lat1),dn=rad(lon2-lon1);
  const x=Math.sin(dl/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dn/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
async function fetchJson(url,options={},timeout=5000){
  const response=await fetch(url,{
    ...options,
    headers:{accept:"application/json", "user-agent":UA, ...(options.headers||{})},
    signal:AbortSignal.timeout(timeout)
  });
  const body=await response.text();
  if(!response.ok)throw new Error(new URL(url).hostname+" returned "+response.status);
  try{return JSON.parse(body)}catch{throw new Error(new URL(url).hostname+" returned non-JSON")}
}
async function postJson(url,body,timeout=5500){
  return fetchJson(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)},timeout);
}
async function postAcis(url,body,timeout=5500){
  const params=new URLSearchParams({params:JSON.stringify(body)});
  return fetchJson(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params.toString()},timeout);
}
function bbox(lat,lon,milesRadius=140){
  const dy=milesRadius/69, dx=milesRadius/(69*Math.max(.25,Math.cos(rad(lat))));
  return [lon-dx,lat-dy,lon+dx,lat+dy].map(v=>Math.round(v*10000)/10000);
}
function sidFor(meta){
  const sids=Array.isArray(meta&&meta.sids)?meta.sids:[];
  return sids.find(x=>/\s6$/.test(String(x)))||sids.find(Boolean)||meta&&meta.uid||null;
}
function stationRows(payload){
  const list=Array.isArray(payload&&payload.meta)?payload.meta:[];
  return list.map(row=>{
    const ll=Array.isArray(row.ll)?row.ll:[null,null];
    return {
      name:row.name||"Climate station",
      state:row.state||null,
      longitude:finite(ll[0],-180,180),
      latitude:finite(ll[1],-90,90),
      elevation_ft:finite(row.elev),
      sid:sidFor(row),
      valid_daterange:row.valid_daterange||null
    };
  }).filter(row=>row.sid&&row.latitude!=null&&row.longitude!=null);
}
function annualSnowRows(payload){
  const data=Array.isArray(payload&&payload.data)?payload.data:[];
  return data.map(row=>{
    const year=Number(String(row&&row[0]||"").slice(0,4));
    const raw=Array.isArray(row)?row[1]:null;
    let value=null;
    if(raw==="T")value=0;
    else if(raw!==null&&raw!=="M"&&raw!==""&&Number.isFinite(Number(raw)))value=Number(raw);
    return {year,value};
  }).filter(row=>Number.isFinite(row.year));
}
function historicalSummary(rows){
  const baseline=rows.filter(r=>r.year>=1991&&r.year<=2020&&r.value!=null);
  const recent=rows.filter(r=>r.year>=2016&&r.year<=2025&&r.value!=null);
  const white=baseline.filter(r=>r.value>=1).length;
  const recentWhite=recent.filter(r=>r.value>=1).length;
  if(baseline.length<25)return null;
  return {
    probability:Math.round(white/baseline.length*1000)/10,
    valid_years:baseline.length,
    white_years:white,
    recent_probability:recent.length>=7?Math.round(recentWhite/recent.length*1000)/10:null,
    recent_valid_years:recent.length,
    recent_white_years:recentWhite,
    definition:"At least 1 inch of snow depth on December 25",
    normal_period:"1991-2020"
  };
}
async function historicalClimatology(lat,lon){
  const meta=await postAcis(ACIS_META,{
    bbox:bbox(lat,lon,180).join(","),
    sdate:"1991-12-25",
    edate:"2025-12-25",
    elems:"snwd",
    meta:["name","state","sids","ll","elev","uid","valid_daterange"]
  },5500);
  const candidates=stationRows(meta).map(row=>({...row,distance_miles:miles(lat,lon,row.latitude,row.longitude)})).sort((a,b)=>a.distance_miles-b.distance_miles).slice(0,6);
  for(const station of candidates){
    try{
      const payload=await postAcis(ACIS_DATA,{
        sid:station.sid,
        sdate:"1991-12-25",
        edate:"2025-12-25",
        meta:["name","state","ll","elev"],
        elems:[{name:"snwd",interval:[1,0,0],duration:1}]
      },5000);
      const history=historicalSummary(annualSnowRows(payload));
      if(history)return {station:{...station,distance_miles:Math.round(station.distance_miles*10)/10},history};
    }catch{}
  }
  return null;
}
function identifyUrl(base,lat,lon,layers="all"){
  const extent=[lon-.15,lat-.15,lon+.15,lat+.15].join(",");
  const params=new URLSearchParams({
    geometry:lon+","+lat,
    geometryType:"esriGeometryPoint",
    sr:"4326",
    tolerance:"1",
    mapExtent:extent,
    imageDisplay:"400,400,96",
    returnGeometry:"false",
    layers,
    f:"json"
  });
  return base+"/identify?"+params.toString();
}
function normalizeOutlookResult(result){
  const a=result&&result.attributes||{};
  const cat=String(a.cat||a.CAT||a.category||"").trim();
  const prob=finite(a.prob||a.PROB||a.probability,0,100);
  const valid=String(a.valid_seas||a.VALID_SEAS||a.valid||"").trim();
  const fcst=a.fcst_date||a.FCST_DATE||null;
  if(!cat||prob==null)return null;
  return {category:cat,probability:prob,valid_period:valid,forecast_date:fcst||null,layer_id:result.layerId};
}
function containsDecember(valid){
  const s=String(valid||"").toUpperCase().trim();
  return /\bDEC\b/.test(s)||/^(OND|NDJ|DJF)\b/.test(s)||/\b12\b/.test(s);
}
function decemberPriority(valid){
  const s=String(valid||"").toUpperCase().trim();
  if(/\bDEC\b/.test(s))return 0;
  if(/^NDJ\b/.test(s))return 1;
  if(/^OND\b/.test(s))return 2;
  if(/^DJF\b/.test(s))return 3;
  return 9;
}
function chooseDecemberOutlook(payload){
  return (Array.isArray(payload&&payload.results)?payload.results:[])
    .map(normalizeOutlookResult).filter(x=>x&&containsDecember(x.valid_period))
    .sort((a,b)=>decemberPriority(a.valid_period)-decemberPriority(b.valid_period))[0]||null;
}
async function cpcPair(lat,lon){
  const [st,sp,mt,mp]=await Promise.allSettled([
    fetchJson(identifyUrl(CPC_SEASON_TEMP,lat,lon),{},3500),
    fetchJson(identifyUrl(CPC_SEASON_PRECIP,lat,lon),{},3500),
    fetchJson(identifyUrl(CPC_MONTH_TEMP,lat,lon),{},3500),
    fetchJson(identifyUrl(CPC_MONTH_PRECIP,lat,lon),{},3500)
  ]);
  const monthlyTemp=mt.status==="fulfilled"?chooseDecemberOutlook(mt.value):null;
  const monthlyPrecip=mp.status==="fulfilled"?chooseDecemberOutlook(mp.value):null;
  const seasonalTemp=st.status==="fulfilled"?chooseDecemberOutlook(st.value):null;
  const seasonalPrecip=sp.status==="fulfilled"?chooseDecemberOutlook(sp.value):null;
  return {
    temperature:monthlyTemp||seasonalTemp,
    precipitation:monthlyPrecip||seasonalPrecip,
    mode:(monthlyTemp||monthlyPrecip)?"monthly":"seasonal",
    degraded:[st,sp,mt,mp].some(x=>x.status==="rejected")
  };
}
function christmasTarget(now=new Date()){
  const y=now.getUTCFullYear();
  const thisYear=new Date(Date.UTC(y,11,25,12));
  return now>new Date(Date.UTC(y,11,25,23,59,59))?new Date(Date.UTC(y+1,11,25,12)):thisYear;
}
function daysUntil(target,now=new Date()){ return Math.ceil((target-now)/86400000); }
async function nwsChristmasForecast(lat,lon,target){
  const pointsUrl=NWS_POINTS+"/"+Number(lat).toFixed(3)+","+Number(lon).toFixed(3);
  const points=await fetchJson(pointsUrl,{},3000);
  const forecastUrl=points&&points.properties&&points.properties.forecast;
  if(!forecastUrl)throw new Error("NWS forecast link unavailable");
  const data=await fetchJson(forecastUrl,{},3500);
  const periods=Array.isArray(data&&data.properties&&data.properties.periods)?data.properties.periods:[];
  const day=target.toISOString().slice(0,10);
  const eve=new Date(target); eve.setUTCDate(eve.getUTCDate()-1);
  const eveDay=eve.toISOString().slice(0,10);
  const selected=periods.filter(p=>String(p.startTime||"").startsWith(day)||String(p.startTime||"").startsWith(eveDay));
  if(!selected.length)return {available:false,forecast_url:forecastUrl,updated_at:data&&data.properties&&data.properties.updated||null};
  const temps=selected.map(p=>finite(p.temperature)).filter(v=>v!=null);
  const text=selected.map(p=>p.shortForecast||"").join(" · ");
  return {
    available:true,
    forecast_url:forecastUrl,
    updated_at:data&&data.properties&&data.properties.updated||null,
    periods:selected.map(p=>({name:p.name,startTime:p.startTime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,shortForecast:p.shortForecast,precip_probability:p.probabilityOfPrecipitation&&p.probabilityOfPrecipitation.value})),
    max_temperature_f:temps.length?Math.max(...temps):null,
    min_temperature_f:temps.length?Math.min(...temps):null,
    snow_signal:/snow|flurr/i.test(text),
    rain_signal:/rain|shower|drizzle/i.test(text)&&!/snow/i.test(text),
    text
  };
}
function packBasis(nohrsc,snotel){
  const p=snow.choosePack(nohrsc,snotel);
  if(!p||!Number.isFinite(Number(p.distance_miles)))return null;
  return {...p,distance_miles:Math.round(Number(p.distance_miles)*10)/10};
}
function outlookAdjustment(item,type){
  if(!item)return 0;
  const strength=clamp((Number(item.probability)-33)/57,0,1);
  const cat=String(item.category||"").toLowerCase();
  if(type==="temperature"){
    if(cat==="below")return 7*strength;
    if(cat==="above")return -7*strength;
  }else{
    if(cat==="above")return 4*strength;
    if(cat==="below")return -4*strength;
  }
  return 0;
}
function probabilityModel({history,cpc,pack,forecast,target,now=new Date()}){
  const baseline=history&&finite(history.probability,0,100);
  if(baseline==null)return {probability:null,confidence:"unavailable",stage:"climatology-unavailable",factors:[]};
  const d=daysUntil(target,now);
  let value=baseline;
  const factors=[{id:"history",label:"1991-2020 Christmas snow-depth history",effect_points:0,value:baseline}];
  const tAdj=outlookAdjustment(cpc&&cpc.temperature,"temperature");
  const pAdj=outlookAdjustment(cpc&&cpc.precipitation,"precipitation");
  const cpcWeight=d>60?.55:d>30?.8:1;
  value+=tAdj*cpcWeight+pAdj*cpcWeight;
  if(tAdj)factors.push({id:"cpc-temp",label:"CPC December temperature outlook",effect_points:Math.round(tAdj*cpcWeight*10)/10,source:cpc.temperature});
  if(pAdj)factors.push({id:"cpc-precip",label:"CPC December precipitation outlook",effect_points:Math.round(pAdj*cpcWeight*10)/10,source:cpc.precipitation});

  if(d<=45&&pack&&pack.distance_miles<=60){
    const depth=pack.kind==="depth"?finite(pack.value):null;
    let effect=0;
    if(depth!=null&&depth>=1)effect=d<=7?18:d<=14?11:d<=30?6:3;
    else if(depth!=null&&depth<1&&d<=14)effect=-8;
    value+=effect;
    if(effect)factors.push({id:"pack",label:"Current measured snowpack",effect_points:effect,value:pack.value,unit:pack.unit,distance_miles:pack.distance_miles});
  }
  if(d<=8&&forecast&&forecast.available){
    let effect=0;
    if(forecast.snow_signal)effect+=18;
    if(forecast.rain_signal)effect-=15;
    if(forecast.max_temperature_f!=null&&forecast.max_temperature_f<=32)effect+=12;
    else if(forecast.max_temperature_f!=null&&forecast.max_temperature_f>=42)effect-=18;
    else if(forecast.max_temperature_f!=null&&forecast.max_temperature_f>=36)effect-=8;
    if(forecast.min_temperature_f!=null&&forecast.min_temperature_f<=24)effect+=5;
    value+=effect;
    factors.push({id:"nws",label:"NWS Christmas-period forecast",effect_points:effect,max_temperature_f:forecast.max_temperature_f,min_temperature_f:forecast.min_temperature_f,snow_signal:forecast.snow_signal,rain_signal:forecast.rain_signal});
  }

  value=clamp(value,1,99);
  let confidence="low",stage="climatology-led";
  if(d<=60){confidence="low-to-moderate";stage="outlook-led";}
  if(d<=30){confidence="moderate";stage="snowpack-plus-outlook";}
  if(d<=8&&forecast&&forecast.available){confidence="moderate-high";stage="short-range-forecast-led";}
  if(d<=2&&forecast&&forecast.available&&pack&&pack.distance_miles<=60){confidence="high";stage="near-event";}
  return {probability:round5(value),raw_probability:Math.round(value*10)/10,confidence,stage,days_until:d,factors};
}
function verdict(model){
  if(model.probability==null)return {headline:"White Christmas odds are unavailable for this location",tone:"neutral"};
  const p=model.probability;
  if(p>=85)return {headline:"A white Christmas is strongly favored",tone:"snowy"};
  if(p>=65)return {headline:"The odds lean toward a white Christmas",tone:"snowy"};
  if(p>=45)return {headline:"A white Christmas is genuinely in play",tone:"mixed"};
  if(p>=25)return {headline:"A white Christmas is possible, but not favored",tone:"mixed"};
  return {headline:"A white Christmas would be a long shot",tone:"brown"};
}

module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=3600");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({error:"Method not allowed"});}
  const lat=finite(req.query&&req.query.lat,-90,90),lon=finite(req.query&&req.query.lon,-180,180);
  if(lat==null||lon==null)return res.status(400).json({error:"Valid latitude and longitude are required"});
  const state=String(req.query&&req.query.state||"").toUpperCase();
  const now=new Date(),target=christmasTarget(now),d=daysUntil(target,now);

  const baseTasks=[historicalClimatology(lat,lon),cpcPair(lat,lon)];
  const seasonalPack=d<=45?Promise.allSettled([snow.nohrscContext(lat,lon),snow.snotelContext(lat,lon,state)]):Promise.resolve([]);
  const shortForecast=d<=8?nwsChristmasForecast(lat,lon,target):Promise.resolve(null);
  const [base,packSettled,forecastSettled]=await Promise.all([
    Promise.allSettled(baseTasks),
    seasonalPack,
    Promise.resolve(shortForecast).then(x=>Promise.allSettled([x]))
  ]);

  const climatology=base[0].status==="fulfilled"?base[0].value:null;
  const cpc=base[1].status==="fulfilled"?base[1].value:{temperature:null,precipitation:null,mode:null,degraded:true};
  const nohrsc=packSettled[0]&&packSettled[0].status==="fulfilled"?packSettled[0].value:null;
  const snotel=packSettled[1]&&packSettled[1].status==="fulfilled"?packSettled[1].value:null;
  const pack=packBasis(nohrsc,snotel);
  const forecast=forecastSettled[0]&&forecastSettled[0].status==="fulfilled"?forecastSettled[0].value:null;
  const model=probabilityModel({history:climatology&&climatology.history,cpc,pack,forecast,target,now});
  const resultVerdict=verdict(model);
  const degraded=base.some(x=>x.status==="rejected")||packSettled.some&&packSettled.some(x=>x.status==="rejected")||(d<=8&&forecastSettled[0]&&forecastSettled[0].status==="rejected");

  const sources=[
    sourceMeta({name:"RCC-ACIS / NCEI-NWS station history",url:"https://www.rcc-acis.org/",updatedAt:null,staleAfterMinutes:null,available:Boolean(climatology),status:climatology?"historical":"unavailable"}),
    sourceMeta({name:"NOAA/NWS Climate Prediction Center outlooks",url:"https://www.cpc.ncep.noaa.gov/",updatedAt:null,staleAfterMinutes:43200,available:Boolean(cpc.temperature||cpc.precipitation),status:cpc.temperature||cpc.precipitation?"outlook":"unavailable"}),
    sourceMeta({name:"NOAA/NOHRSC + USDA NRCS current snowpack",url:"https://www.nohrsc.noaa.gov/nsa/",updatedAt:nohrsc&&[nohrsc.depth&&nohrsc.depth.observed_at,nohrsc.swe&&nohrsc.swe.observed_at].filter(Boolean).sort().at(-1)||null,staleAfterMinutes:1440,available:Boolean(pack),status:d<=45?(pack?"provisional-observation":"unavailable"):"not-yet-seasonally-weighted"}),
    sourceMeta({name:"NOAA/NWS short-range forecast",url:forecast&&forecast.forecast_url||"https://api.weather.gov/",updatedAt:forecast&&forecast.updated_at||null,staleAfterMinutes:360,available:Boolean(forecast&&forecast.available),status:d<=8?(forecast&&forecast.available?"forecast":"unavailable"):"outside-short-range-window"})
  ];

  return res.status(200).json({
    retrieved_at:now.toISOString(),
    target_date:target.toISOString().slice(0,10),
    location:{latitude:lat,longitude:lon,stateCode:/^[A-Z]{2}$/.test(state)?state:null},
    degraded:Boolean(degraded),
    definition:"At least 1 inch of snow on the ground on December 25.",
    estimate:model,
    verdict:resultVerdict,
    climatology,
    cpc,
    current_snowpack:{basis:pack,nohrsc,snotel,weighted:d<=45},
    christmas_forecast:forecast,
    imagery:{
      historical_probability_map:"https://www.arcgis.com/apps/mapviewer/index.html?webmap=f0ad5d4bb3fa4176ad2134cafbbf8cfd",
      current_snow_analysis:"https://www.nohrsc.noaa.gov/nsa/?region=National&units=e&var=snowdepth"
    },
    sources,
    limitations:[
      "The displayed percentage is a ChrisIzworski.com blended estimate, not an official NOAA probability forecast for this year's Christmas.",
      "The historical anchor is calculated from the nearest ACIS station with at least 25 valid December 25 snow-depth observations during 1991-2020; station distance is shown.",
      "NOAA's historical White Christmas definition is at least 1 inch of snow depth on December 25.",
      "CPC monthly or seasonal outlooks describe broad temperature and precipitation categories, not Christmas Day weather, so their influence is deliberately capped.",
      "Current NOHRSC/SNOTEL snowpack begins influencing the estimate only inside 45 days and only within the Snowpack tool's 60-mile local decision boundary.",
      "NWS short-range forecast becomes a major factor only when Christmas enters the normal forecast window.",
      "No source can guarantee snow at a house, neighborhood or exact Christmas-morning observation time."
    ]
  });
};

module.exports._test={
  annualSnowRows,
  bbox,
  chooseDecemberOutlook,
  christmasTarget,
  containsDecember,
  cpcPair,
  decemberPriority,
  historicalClimatology,
  historicalSummary,
  identifyUrl,
  normalizeOutlookResult,
  nwsChristmasForecast,
  outlookAdjustment,
  probabilityModel,
  stationRows,
  verdict
};
