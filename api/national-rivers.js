const SITE="https://waterservices.usgs.gov/nwis/site/";
const IV="https://waterservices.usgs.gov/nwis/iv/";
const UA="ChrisIzworskiNationalRiverConditions/1.0 (+https://chrisizworski.com/national-tools/rivers/)";

function finite(v,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function haversine(a,b,c,d){const r=3958.7613,toRad=x=>x*Math.PI/180;const dLat=toRad(c-a),dLon=toRad(d-b);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(q))}
async function text(url){const r=await fetch(url,{headers:{accept:"text/plain","user-agent":UA},signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(`USGS returned ${r.status}`);return r.text()}
async function json(url){const r=await fetch(url,{headers:{accept:"application/json","user-agent":UA},signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(`USGS returned ${r.status}`);return r.json()}
function parseRdb(body){
  const lines=String(body||"").split(/\r?\n/).filter(Boolean);
  const hi=lines.findIndex(x=>!x.startsWith("#")&&x.includes("site_no")&&x.includes("station_nm"));
  if(hi<0)return[];
  const h=lines[hi].split("\t"),latI=h.indexOf("dec_lat_va"),lonI=h.indexOf("dec_long_va"),idI=h.indexOf("site_no"),nameI=h.indexOf("station_nm");
  return lines.slice(hi+2).filter(x=>!x.startsWith("#")).map(x=>x.split("\t")).map(p=>({id:p[idI],name:p[nameI],latitude:finite(p[latI],-90,90),longitude:finite(p[lonI],-180,180)})).filter(x=>x.id&&x.latitude!==null&&x.longitude!==null);
}
async function findSites(lat,lon){
  for(const span of [0.6,1.5,3]){
    const n=Math.min(90,lat+span),s=Math.max(-90,lat-span),w=Math.max(-180,lon-span),e=Math.min(180,lon+span);
    const u=new URL(SITE);u.searchParams.set("format","rdb");u.searchParams.set("bBox",`${w},${s},${e},${n}`);u.searchParams.set("siteType","ST");u.searchParams.set("siteStatus","active");u.searchParams.set("hasDataTypeCd","iv");u.searchParams.set("parameterCd","00060");
    const rows=parseRdb(await text(u));
    if(rows.length)return rows.map(x=>({...x,distance_miles:haversine(lat,lon,x.latitude,x.longitude)})).sort((a,b)=>a.distance_miles-b.distance_miles).slice(0,10);
  }
  return[];
}
function code(s){return s.variable?.variableCode?.[0]?.value||null}
function siteId(s){return s.sourceInfo?.siteCode?.[0]?.value||null}
function validPoints(s){return (s.values?.[0]?.value||[]).map(p=>({value:finite(p.value),time:p.dateTime,qualifiers:p.qualifiers||[]})).filter(p=>p.value!==null&&p.value!==-999999&&Date.parse(p.time))}
function atAgo(points,hours){
  if(!points.length)return null;const target=Date.now()-hours*3600000;
  return points.reduce((best,p)=>!best||Math.abs(Date.parse(p.time)-target)<Math.abs(Date.parse(best.time)-target)?p:best,null);
}
function normalize(payload,sites){
  const by=new Map(sites.map(x=>[x.id,{...x,discharge_cfs:null,gage_height_ft:null,water_temp_f:null,measured_at:null,flow_6h_ago:null,trend_percent_6h:null,qualifiers:[]}]));
  for(const s of payload?.value?.timeSeries||[]){
    const id=siteId(s);if(!by.has(id))continue;const pts=validPoints(s);if(!pts.length)continue;const last=pts.at(-1),g=by.get(id);
    if(!g.measured_at||Date.parse(last.time)>Date.parse(g.measured_at))g.measured_at=last.time;
    if(code(s)==="00060"){g.discharge_cfs=last.value;const old=atAgo(pts,6);g.flow_6h_ago=old?.value??null;if(old&&old.value>0)g.trend_percent_6h=Math.round(((last.value-old.value)/old.value)*100);}
    if(code(s)==="00065")g.gage_height_ft=last.value;
    if(code(s)==="00010")g.water_temp_f=Math.round((last.value*9/5+32)*10)/10;
    g.qualifiers=[...new Set([...g.qualifiers,...last.qualifiers])];
  }
  const now=Date.now();return [...by.values()].map(g=>{const t=Date.parse(g.measured_at||"");const age=Number.isFinite(t)?Math.round((now-t)/60000):null;return{...g,age_minutes:age,fresh:age!==null&&age>=0&&age<=180,provisional:true};});
}
async function observations(sites){
  if(!sites.length)return[];const u=new URL(IV);u.searchParams.set("format","json");u.searchParams.set("sites",sites.map(x=>x.id).join(","));u.searchParams.set("parameterCd","00060,00065,00010");u.searchParams.set("period","P1D");u.searchParams.set("siteStatus","all");return normalize(await json(u),sites);
}
module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("X-Robots-Tag","noindex, nofollow");res.setHeader("Cache-Control","public, s-maxage=600, stale-while-revalidate=1200");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({error:"Method not allowed"});}
  const lat=finite(req.query?.lat,-90,90),lon=finite(req.query?.lon,-180,180);if(lat===null||lon===null)return res.status(400).json({error:"Valid latitude and longitude are required"});
  try{const sites=await findSites(lat,lon);const gauges=await observations(sites);return res.status(200).json({
    retrieved_at:new Date().toISOString(),location:{latitude:lat,longitude:lon},gauges,
    source:{name:"USGS Water Data for the Nation",url:"https://waterdata.usgs.gov/",status:"provisional instantaneous values"},
    disclaimer:"Gauge readings describe measured locations and are provisional and subject to revision. Flow or stage alone cannot determine whether paddling, swimming, wading, or fishing is safe."
  });}catch(error){res.setHeader("Cache-Control","no-store");return res.status(502).json({error:"USGS river conditions unavailable",detail:String(error?.message||error)});}
};
module.exports._test={finite,haversine,parseRdb,validPoints,atAgo,normalize};
