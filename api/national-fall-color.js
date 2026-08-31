const GEOSERVER="https://geoserver.usanpn.org/geoserver/ows";
const UA="ChrisIzworskiNationalFallColor/1.0 (+https://chrisizworski.com/national-tools/fall-color/)";

function finite(v,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
async function json(url){const r=await fetch(url,{headers:{accept:"application/json","user-agent":UA},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);return r.json()}
async function sample(layer,lat,lon){
  const d=0.03,u=new URL(GEOSERVER);u.searchParams.set("service","WMS");u.searchParams.set("version","1.1.1");u.searchParams.set("request","GetFeatureInfo");u.searchParams.set("layers",layer);u.searchParams.set("query_layers",layer);u.searchParams.set("styles","");u.searchParams.set("srs","EPSG:4326");u.searchParams.set("bbox",`${lon-d},${lat-d},${lon+d},${lat+d}`);u.searchParams.set("width","101");u.searchParams.set("height","101");u.searchParams.set("x","50");u.searchParams.set("y","50");u.searchParams.set("info_format","application/json");u.searchParams.set("feature_count","1");
  const data=await json(u);const props=data?.features?.[0]?.properties||{};const values=Object.values(props).map(Number).filter(Number.isFinite);return values.length?values[0]:null;
}
function doyDate(doy,year=new Date().getFullYear()){if(!Number.isFinite(doy))return null;const d=new Date(Date.UTC(year,0,1));d.setUTCDate(d.getUTCDate()+Math.round(doy)-1);return d.toISOString().slice(0,10)}
function dayOfYear(date=new Date()){const start=Date.UTC(date.getUTCFullYear(),0,0);return Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-start)/86400000)}
function timing(nowDoy,median,mad){
  if(!Number.isFinite(median))return{stage:"Historical timing unavailable",confidence:"low",days_from_typical:null};
  const diff=Math.round(nowDoy-median),spread=Number.isFinite(mad)?mad:null;let stage;
  if(diff<-21)stage="Before the typical main autumn transition";
  else if(diff<-7)stage="Approaching the typical autumn transition";
  else if(diff<=7)stage="Near the historical mid-greendown window";
  else if(diff<=21)stage="Typically beyond the mid-greendown window";
  else stage="Typically late in or past the main transition";
  const confidence=spread===null?"low":spread<=7?"medium-high":spread<=14?"medium":"low";
  return{stage,confidence,days_from_typical:diff,median_absolute_deviation_days:spread};
}
module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("X-Robots-Tag","noindex, nofollow");res.setHeader("Cache-Control","public, s-maxage=86400, stale-while-revalidate=604800");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({error:"Method not allowed"});}
  const lat=finite(req.query?.lat,24,50),lon=finite(req.query?.lon,-125,-66);if(lat===null||lon===null)return res.status(400).json({error:"This beta currently covers the contiguous United States"});
  const [med,mad]=await Promise.allSettled([sample("inca:midgdown_median_nad83_02deg",lat,lon),sample("inca:midgdown_mad_nad83_02deg",lat,lon)]);
  const median=med.status==="fulfilled"?finite(med.value,1,450):null,spread=mad.status==="fulfilled"?finite(mad.value,0,100):null;const today=dayOfYear();
  if(median===null)return res.status(502).json({error:"Historical satellite timing is unavailable for this location"});
  return res.status(200).json({
    retrieved_at:new Date().toISOString(),mode:"historical-timing-beta",location:{latitude:lat,longitude:lon},
    typical_mid_greendown:{day_of_year:median,date_2026:doyDate(median,2026),mad_days:spread},
    timing_context:timing(today,median,spread),
    disclaimer:"This is a historical satellite timing estimate, not an observed 2026 leaf-color reading or a precise peak-color forecast. Local species, drought, storms, elevation and current weather can shift actual color.",
    sources:[
      {name:"USA National Phenology Network — Mid Green-down Median (MODIS 2001–2017)",url:"https://www.usanpn.org/data/maps/land_surface_phenology",status:"provisional historical land-surface phenology"},
      {name:"USDA Forest Service — Fall Colors",url:"https://www.fs.usda.gov/visit/fall-colors",status:"official seasonal reports and planning context"}
    ]
  });
};
module.exports._test={finite,doyDate,dayOfYear,timing};
