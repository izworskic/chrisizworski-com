const { RAMP_REGISTRY, TIDE_STATIONS, parseNpsStatus, rampAccessSummary, rankRamps } = require("../lib/cape-hatteras-access");

const USER_AGENT="ChrisIzworskiCapeHatterasAccess/1.0 (+https://chrisizworski.com/national-tools/cape-hatteras-beach-access/)";
const NPS_STATUS="https://www.nps.gov/caha/planyourvisit/conditions.htm";
const NPS_HOURS="https://www.nps.gov/caha/planyourvisit/hours.htm";
const NPS_FIELD_RULE="https://www.nps.gov/caha/planyourvisit/beachactivities.htm";
const NOAA_API="https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const NWS_SURF="https://api.weather.gov/products/types/SRF/locations/MHX/latest";
const NWS_ALERTS="https://api.weather.gov/alerts/active?area=NC";
const DRIVE_NC="https://drivenc.gov/";
const FERRY="https://www.ncdot.gov/travel-maps/ferry-tickets-services/routes/Pages/hatteras-ocracoke.aspx";

async function fetchWithTimeout(url,options={},timeout=15000){return fetch(url,{...options,signal:AbortSignal.timeout(timeout)});}
function source(result,label,url){return result.status==="fulfilled"?{status:"live",label,official_url:url}:{status:"unavailable",label,official_url:url,error:String(result.reason?.message||result.reason||"unavailable")};}
function isoLocalDate(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(now).replaceAll("/","-");}
function toIsoLocal(value){if(!value)return null; const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/); if(!m)return null; return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-04:00`;}

async function fetchNps(){const r=await fetchWithTimeout(NPS_STATUS,{headers:{"User-Agent":USER_AGENT,Accept:"text/html"}});if(!r.ok)throw new Error(`NPS status returned ${r.status}`);const html=await r.text();const parsed=parseNpsStatus(html);if(parsed.parser_quality==="failed")throw new Error(`NPS parser confidence failed; parsed ${parsed.parsed_count} ramps`);return parsed;}

async function fetchTide(area,station,now=new Date()){
 const begin=isoLocalDate(now).replaceAll("-","");
 const params=new URLSearchParams({product:"predictions",application:"ChrisIzworskiCapeHatterasAccess",begin_date:begin,range:"48",datum:"MLLW",station:station.id,time_zone:"lst_ldt",units:"english",interval:"hilo",format:"json"});
 const r=await fetchWithTimeout(`${NOAA_API}?${params}`,{headers:{"User-Agent":USER_AGENT}});if(!r.ok)throw new Error(`NOAA ${station.id} returned ${r.status}`);const payload=await r.json();if(payload.error)throw new Error(payload.error.message||`NOAA ${station.id} error`);
 return {area,station,events:(payload.predictions||[]).map(p=>({time:toIsoLocal(p.t),height_ft:Number(p.v),type:p.type})).filter(e=>e.time)};
}

function parseSurfText(text=""){
 const hat=text.match(/Hatteras Island-[\s\S]*?(?=\n\$\$|NCZ204-|$)/i)?.[0]||text;
 const north=hat.match(/North of Cape Hatteras\.{0,20}([A-Za-z]+)/i)?.[1]||null;
 const south=hat.match(/South of Cape Hatteras\.{0,20}([A-Za-z]+)/i)?.[1]||null;
 const heights=[...hat.matchAll(/Surf Height[\s\S]{0,220}?(?:North of Cape Hatteras\.{0,20})?(\d+)\s+to\s+(\d+)\s+feet/gi)].map(m=>Number(m[2]));
 const single=[...hat.matchAll(/Surf Height[\s\S]{0,220}?Around\s+(\d+)\s+feet/gi)].map(m=>Number(m[1]));
 const wind=hat.match(/Winds?\.{2,}.*?(\d+)\s*(?:to\s*(\d+)\s*)?mph/i);
 const thunder=hat.match(/Thunderstorm Potential\*\*\.{2,}([A-Za-z]+)/i)?.[1]||null;
 const water=hat.match(/Water Temperature\.{2,}([^\n]+)/i)?.[1]?.trim()||null;
 return {north_rip_current_risk:north,south_rip_current_risk:south,height_max_ft:[...heights,...single].filter(Number.isFinite).sort((a,b)=>b-a)[0]??null,wind_mph:wind?Number(wind[2]||wind[1]):null,thunderstorm:thunder?thunder.toLowerCase():null,water_temperature:water,raw_excerpt:hat.slice(0,2500)};
}

async function fetchSurf(){
 const headers={"User-Agent":USER_AGENT,Accept:"application/geo+json"};
 const latest=await fetchWithTimeout(NWS_SURF,{headers}); if(!latest.ok)throw new Error(`NWS latest surf returned ${latest.status}`); const meta=await latest.json();
 const productUrl=meta["@id"]||meta.id; if(!productUrl)throw new Error("NWS surf product id unavailable");
 const product=await fetchWithTimeout(productUrl,{headers}); if(!product.ok)throw new Error(`NWS surf product returned ${product.status}`); const body=await product.json();
 return {issued_at:body.issuanceTime||null,...parseSurfText(body.productText||"")};
}

async function fetchAlerts(){const r=await fetchWithTimeout(NWS_ALERTS,{headers:{"User-Agent":USER_AGENT,Accept:"application/geo+json"}});if(!r.ok)throw new Error(`NWS alerts returned ${r.status}`);const p=await r.json();return (p.features||[]).map(f=>({event:f.properties?.event||null,severity:f.properties?.severity||null,headline:f.properties?.headline||null,expires:f.properties?.expires||null})).filter(a=>/beach|coastal|flood|storm|hurricane|tropical|wind|surf/i.test(`${a.event} ${a.headline}`)).slice(0,12);}

function areaContext(area,tides,surf,npsQuality){
 const tide=tides[area]||null;
 let surfSide="north"; if(area==="Ocracoke Island")surfSide="south";
 const risk=surfSide==="south"?surf?.south_rip_current_risk:surf?.north_rip_current_risk;
 return {tide,weather:{wind_mph:surf?.wind_mph??null,thunderstorm:surf?.thunderstorm??null},surf:{height_max_ft:surf?.height_max_ft??null,rip_current_risk:risk},transport:{status:"unverified"},nps_quality:npsQuality};
}

module.exports=async function handler(req,res){
 if(!["GET","HEAD"].includes(req.method)){res.setHeader("Allow","GET, HEAD");return res.status(405).end();}
 res.setHeader("Cache-Control","s-maxage=600, stale-while-revalidate=900");
 res.setHeader("Access-Control-Allow-Origin","*");
 if(req.method==="HEAD")return res.status(200).end();
 const now=new Date();
 const npsPromise=fetchNps(); const surfPromise=fetchSurf(); const alertsPromise=fetchAlerts();
 const tidePromises=Object.entries(TIDE_STATIONS).map(async ([area,station])=>[area,await fetchTide(area,station,now)]);
 const [npsResult,surfResult,alertsResult,tideResult]=await Promise.allSettled([npsPromise,surfPromise,alertsPromise,Promise.all(tidePromises)]);
 if(npsResult.status!=="fulfilled")return res.status(503).json({status:"official-access-unavailable",retrieved_at:now.toISOString(),message:"Official NPS ramp status could not be verified, so this tool will not guess which ramps are open.",official_url:NPS_STATUS,sources:{nps:source(npsResult,"National Park Service beach access status",NPS_STATUS)}});
 const nps=npsResult.value;
 const surf=surfResult.status==="fulfilled"?surfResult.value:null;
 const tides={}; if(tideResult.status==="fulfilled")for(const [area,value] of tideResult.value)tides[area]=value;
 const contexts=Object.fromEntries(["Bodie Island","Hatteras Island","Ocracoke Island"].map(area=>[area,areaContext(area,tides,surf,nps.parser_quality)]));
 const hydrated=nps.ramps.map(r=>{const access=rampAccessSummary(r,now);const ctx=contexts[r.area]||{};const tide=ctx.tide||null;const nextLow=tide?.events?.find(e=>e.type==="L"&&new Date(e.time)>now)||null;const nextHigh=tide?.events?.find(e=>e.type==="H"&&new Date(e.time)>now)||null;return {...access,tide:{station:tide?.station||null,next_low:nextLow,next_high:nextHigh},surf:{rip_current_risk:ctx.surf?.rip_current_risk||null,height_max_ft:ctx.surf?.height_max_ft||null},weather:{wind_mph:ctx.weather?.wind_mph??null,thunderstorm:ctx.weather?.thunderstorm??null}};});
 const ranked=rankRamps(nps.ramps,contexts,now);
 const bestByArea={}; for(const area of ["Bodie Island","Hatteras Island","Ocracoke Island"]){const hit=ranked.find(x=>x.ramp.area===area);bestByArea[area]=hit?{id:hit.ramp.id,label:`Ramp ${hit.ramp.id}`,near:hit.ramp.near||null,derived_score:hit.result.score,components:hit.result.components,tide_label:hit.result.tide.label}:null;}
 const overall=ranked[0];
 return res.status(200).json({
  status:"live",retrieved_at:now.toISOString(),local_date:isoLocalDate(now),official_status_updated:nps.official_updated,parser_quality:nps.parser_quality,parsed_ramp_count:nps.parsed_count,
  field_authority:"NPS states that conditions and closures can change rapidly; signs posted in the field are the final authority.",
  recommendations:{overall:overall?{id:overall.ramp.id,label:`Ramp ${overall.ramp.id}`,area:overall.ramp.area,near:overall.ramp.near||null,derived_score:overall.result.score,tide_label:overall.result.tide.label}:null,by_area:bestByArea},
  mileage_summary:{note:"NPS mileage summary remains the official source; per-ramp mileage below is only what is explicitly stated in individual direction status text."},
  ramps:hydrated,
  weather:{surf,alerts:alertsResult.status==="fulfilled"?alertsResult.value:[]},
  tides,
  transportation:{status:"official-handoff",interpretation:"Live NCDOT/DriveNC transport data is not machine-ranked in v1. Check official NC 12 and Hatteras–Ocracoke ferry status before an Ocracoke trip.",drive_nc_url:DRIVE_NC,ferry_url:FERRY},
  sources:{
   nps:{...source(npsResult,"National Park Service beach access status",NPS_STATUS),official_updated:nps.official_updated,parser_quality:nps.parser_quality,truth_rule:"Missing or unparseable official access data withholds recommendations; it never becomes open."},
   nps_hours:{status:"reference",label:"NPS ORV operating hours",official_url:NPS_HOURS},
   field_signs:{status:"reference",label:"NPS beach activities / field authority",official_url:NPS_FIELD_RULE},
   tides:{status:Object.keys(tides).length?"live":"unavailable",label:"NOAA CO-OPS tide predictions",official_url:"https://tidesandcurrents.noaa.gov/",truth_rule:"Tides are convenience context, not proof that sand is safe or driveable."},
   surf:{...source(surfResult,"National Weather Service Surf Zone Forecast",NWS_SURF),truth_rule:"Rip-current risk describes surf-zone danger; it does not change official ORV access status."},
   alerts:{...source(alertsResult,"National Weather Service active alerts",NWS_ALERTS)},
   transportation:{status:"official-handoff",label:"NCDOT DriveNC and ferry service",official_url:DRIVE_NC}
  },
  map:{registry:RAMP_REGISTRY,truth_rule:"Only ramps with independently verified coordinates are pinned in v1; no coordinates are interpolated or invented."}
 });
};

module.exports.parseSurfText=parseSurfText;
module.exports.fetchTide=fetchTide;
