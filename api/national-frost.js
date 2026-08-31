const NCEI="https://www.ncei.noaa.gov/access/services/data/v1";
const UA="ChrisIzworskiNationalFrostPlanner/1.0 (+https://chrisizworski.com/national-tools/frost/)";
const TYPES=["ANN-TMIN-PRBLST-T32FP10","ANN-TMIN-PRBLST-T32FP20","ANN-TMIN-PRBLST-T32FP50","ANN-TMIN-PRBFST-T32FP10","ANN-TMIN-PRBFST-T32FP20","ANN-TMIN-PRBFST-T32FP50","ANN-TMIN-PRBGSL-T32FP50"];

function finite(v,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function haversine(a,b,c,d){const r=3958.7613,toRad=x=>x*Math.PI/180;const dLat=toRad(c-a),dLon=toRad(d-b);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(q))}
async function json(url){const r=await fetch(url,{headers:{accept:"application/json","user-agent":UA},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);return r.json()}
function normalizeDate(v){
  if(v===null||v===undefined||v===""||Number(v)===-9999)return null;
  const raw=String(v).trim();
  const m=raw.match(/^(\d{1,2})[-\/]?(\d{2})$/);
  let month,day;
  if(m){month=Number(m[1]);day=Number(m[2]);}
  else{const digits=raw.replace(/\D/g,"");if(digits.length===4){month=Number(digits.slice(0,2));day=Number(digits.slice(2));}else if(/^\d{1,3}$/.test(digits)){const doy=Number(digits);if(doy>=1&&doy<=366){const d=new Date(Date.UTC(2024,0,doy));return {month:d.getUTCMonth()+1,day:d.getUTCDate(),mmdd:`${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`};}}}
  if(!(month>=1&&month<=12&&day>=1&&day<=31))return null;
  return{month,day,mmdd:`${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`};
}
function rowValue(row,key){return row?.[key]??row?.[key.toLowerCase()]??null}
function station(row,lat,lon){
  const slat=finite(row.LATITUDE??row.latitude,-90,90),slon=finite(row.LONGITUDE??row.longitude,-180,180);
  const dates={spring_10:normalizeDate(rowValue(row,TYPES[0])),spring_20:normalizeDate(rowValue(row,TYPES[1])),spring_50:normalizeDate(rowValue(row,TYPES[2])),fall_10:normalizeDate(rowValue(row,TYPES[3])),fall_20:normalizeDate(rowValue(row,TYPES[4])),fall_50:normalizeDate(rowValue(row,TYPES[5]))};
  return{id:row.STATION??row.station??null,name:row.NAME??row.name??"NOAA climate station",latitude:slat,longitude:slon,distance_miles:slat!==null&&slon!==null?haversine(lat,lon,slat,slon):null,growing_season_days_50:finite(rowValue(row,TYPES[6]),0,366),dates};
}
async function normals(lat,lon){
  for(const span of [0.35,0.8,1.8]){
    const u=new URL(NCEI);u.searchParams.set("dataset","normals-annualseasonal-1991-2020");u.searchParams.set("bbox",`${Math.min(90,lat+span)},${Math.max(-180,lon-span)},${Math.max(-90,lat-span)},${Math.min(180,lon+span)}`);u.searchParams.set("format","json");u.searchParams.set("includeStationName","1");u.searchParams.set("includeStationLocation","1");u.searchParams.set("dataTypes",TYPES.join(","));
    const rows=await json(u);const stations=(Array.isArray(rows)?rows:[]).map(r=>station(r,lat,lon)).filter(s=>s.dates.spring_50||s.dates.spring_10).sort((a,b)=>(a.distance_miles??9999)-(b.distance_miles??9999));
    if(stations.length)return stations[0];
  }
  return null;
}
async function nws(lat,lon){
  const p=await json(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);const u=p?.properties?.forecastHourly;if(!u)return null;const h=await json(u);
  const periods=(h?.properties?.periods||[]).slice(0,168).map(x=>({time:x.startTime,temp_f:finite(x.temperature),unit:x.temperatureUnit,is_daytime:x.isDaytime,forecast:x.shortForecast}));
  const fahrenheit=periods.map(x=>x.unit==="C"&&x.temp_f!==null?{...x,temp_f:x.temp_f*9/5+32}:x);const vals=fahrenheit.filter(x=>x.temp_f!==null);
  return{updated_at:h?.properties?.updateTime||null,min_7d_f:vals.length?Math.round(Math.min(...vals.map(x=>x.temp_f))):null,freeze_hours:fahrenheit.filter(x=>x.temp_f!==null&&x.temp_f<=32).slice(0,12),periods:fahrenheit};
}
module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("X-Robots-Tag","noindex, nofollow");res.setHeader("Cache-Control","public, s-maxage=21600, stale-while-revalidate=86400");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({error:"Method not allowed"});}
  const lat=finite(req.query?.lat,-90,90),lon=finite(req.query?.lon,-180,180);if(lat===null||lon===null)return res.status(400).json({error:"Valid latitude and longitude are required"});
  const [norm,forecast]=await Promise.allSettled([normals(lat,lon),nws(lat,lon)]);
  const climate=norm.status==="fulfilled"?norm.value:null,weather=forecast.status==="fulfilled"?forecast.value:null;
  if(!climate&&!weather)return res.status(502).json({error:"Frost data are temporarily unavailable"});
  return res.status(200).json({
    retrieved_at:new Date().toISOString(),degraded:!climate||!weather,location:{latitude:lat,longitude:lon},
    climate_normals:climate,current_forecast:weather,
    interpretation:{
      spring_10:"NOAA's 10% last-freeze date means only 10% of historical years had a 32°F freeze on this date or later. It is not a guarantee.",
      spring_50:"NOAA's 50% last-freeze date is the median historical threshold, not a safe planting date for frost-tender crops.",
      hardiness:"USDA Plant Hardiness Zones describe average annual extreme winter minimum temperature for perennial survival; they do not determine your spring planting date."
    },
    sources:[
      {name:"NOAA NCEI U.S. Climate Normals 1991–2020",url:"https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",available:Boolean(climate)},
      {name:"National Weather Service hourly forecast",url:"https://www.weather.gov/documentation/services-web-API",available:Boolean(weather)}
    ]
  });
};
module.exports._test={finite,haversine,normalizeDate,station};
