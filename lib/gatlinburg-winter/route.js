"use strict";

const { decideClosedSet } = require("../mackinac-island/harness.js");

const DESTINATION = Object.freeze({
  name: "Gatlinburg, Tennessee",
  lat: 35.7143,
  lon: -83.5102,
  timezone: "America/New_York"
});

const USER_AGENT = "GatlinburgWinter/1.0 (+https://chrisizworski.com/gatlinburg-winter/)";
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const WEATHER_MAX_AGE_MS = 20 * 60 * 1000;
const SOURCE_CACHE = new Map();
const SOURCE_URLS = Object.freeze({
  winterMagic: "https://www.gatlinburg.com/events/annual-events/winter-magic/",
  events: "https://www.gatlinburg.com/events/",
  npsClosures: "https://www.nps.gov/grsm/planyourvisit/temproadclose.htm",
  npsHours: "https://www.nps.gov/grsm/planyourvisit/hours.htm",
  skypark: "https://www.gatlinburgskypark.com/hours",
  skyparkStatus: "https://www.gatlinburgskypark.com/",
  anakeesta: "https://anakeesta.com/hours-location/",
  ober: "https://obermountain.com/",
  oberTickets: "https://tickets.obermountain.com/",
  ripleyHours: "https://www.ripleys.com/attractions/ripleys-aquarium-of-the-smokies/hours",
  ripley: "https://www.ripleys.com/attractions/ripleys-aquarium-of-the-smokies",
  trolley: "https://www.gatlinburg.com/plan/getting-around/trolley/"
});

const SEASON = Object.freeze({
  start: "2026-11-05",
  end: "2027-02-15",
  label: "November 5, 2026 – February 15, 2027"
});

const FIXED_EVENTS = Object.freeze([
  {
    id: "winter-magic",
    name: "Gatlinburg Winter Magic",
    start: "2026-11-05",
    end: "2027-02-15",
    time: "after dark",
    category: "lights",
    sourceUrl: SOURCE_URLS.winterMagic,
    note: "Citywide seasonal lights; strongest after dark."
  },
  {
    id: "winter-festival-chili",
    name: "Winter Festival & Chili Cookoff",
    start: "2026-11-12",
    end: "2026-11-12",
    time: "event schedule",
    category: "event",
    sourceUrl: SOURCE_URLS.events,
    note: "Date-specific downtown seasonal event."
  },
  {
    id: "santa-smokies",
    name: "Santa in the Smokies",
    start: "2026-11-28",
    end: "2026-11-28",
    time: "event schedule",
    category: "family",
    sourceUrl: SOURCE_URLS.events,
    note: "Date-specific family holiday programming."
  },
  {
    id: "fantasy-lights-parade",
    name: "Fantasy of Lights Christmas Parade",
    start: "2026-12-04",
    end: "2026-12-04",
    time: "7:30 PM",
    category: "event",
    sourceUrl: "https://www.gatlinburg.com/events/annual-events/fantasy-of-lights-christmas-parade/",
    note: "Major downtown parade; expect unusually high evening crowd pressure."
  },
  {
    id: "new-years-eve",
    name: "New Year's Eve Celebration & Ball Drop",
    start: "2026-12-31",
    end: "2026-12-31",
    time: "evening",
    category: "event",
    sourceUrl: SOURCE_URLS.events,
    note: "Major downtown New Year's Eve event."
  }
]);

const CANDIDATES = Object.freeze([
  c("winter-magic-walk", "Winter Magic downtown lights", "lights", "downtown-core", 75, 1, 0.95, 0.94, 0.99, 0.35, "free", false, "dark", "low", 35.7145, -83.5110, SOURCE_URLS.winterMagic, {season:[SEASON.start,SEASON.end], walk:0.75}),
  c("parkway-lights", "Parkway + downtown holiday atmosphere", "lights", "downtown-core", 60, 0.9, 0.9, 0.92, 0.96, 0.2, "free", false, "dark", "low", 35.7140, -83.5107, SOURCE_URLS.winterMagic, {season:[SEASON.start,SEASON.end], walk:0.55}),
  c("skypark", "Gatlinburg SkyPark", "mountain", "skypark", 120, 0.82, 0.95, 0.9, 0.84, 0.45, "$$", true, "before-sunset", "high", 35.7137, -83.5164, SOURCE_URLS.skypark, {walk:0.62}),
  c("anakeesta", "Anakeesta", "mountain", "anakeesta", 150, 0.9, 0.9, 0.93, 0.9, 0.48, "$$", true, "day-or-evening", "high", 35.7162, -83.5103, SOURCE_URLS.anakeesta, {walk:0.55}),
  c("ober-mountain", "Ober Mountain", "snow", "ober", 180, 0.9, 0.82, 0.88, 0.78, 0.98, "$$", true, "day", "high", 35.7086, -83.5217, SOURCE_URLS.ober, {walk:0.45}),
  c("ober-snow-tubing", "Ober Mountain snow tubing", "snow", "ober", 120, 0.9, 0.72, 0.72, 0.6, 1, "$$", true, "day", "high", 35.7086, -83.5217, SOURCE_URLS.oberTickets, {walk:0.35, snowDependent:true}),
  c("ripley-aquarium", "Ripley's Aquarium of the Smokies", "indoor", "downtown-north", 120, 0.98, 0.78, 0.72, 0.65, 0.08, "$$", true, "any", "none", 35.7167, -83.5114, SOURCE_URLS.ripleyHours, {walk:0.32}),
  c("arts-crafts", "Great Smoky Arts & Crafts Community", "culture", "arts-crafts", 150, 0.75, 0.82, 0.68, 0.55, 0.18, "$", false, "day", "medium", 35.7378, -83.4588, "https://www.gatlinburg.com/things-to-do/arts-crafts/", {walk:0.25}),
  c("the-village", "The Village + downtown browsing", "shopping", "downtown-core", 75, 0.78, 0.94, 0.9, 0.9, 0.12, "$", false, "late-afternoon-evening", "low", 35.7149, -83.5132, "https://www.gatlinburg.com/listing/the-village-shops/134/", {walk:0.42}),
  c("sugarlands", "Sugarlands Visitor Center area", "park", "nps-sugarlands", 75, 0.82, 0.74, 0.3, 0.2, 0.28, "free", false, "day", "medium", 35.6872, -83.5361, "https://www.nps.gov/grsm/planyourvisit/sugarlands-visitor-center.htm", {walk:0.45, officialClosureSensitive:true}),
  c("newfound-gap", "Newfound Gap scenic drive/view", "scenic", "nps-newfound-gap", 150, 0.72, 0.9, 0.3, 0.15, 0.75, "free", false, "day", "very-high", 35.6112, -83.4245, SOURCE_URLS.npsClosures, {walk:0.2, officialClosureSensitive:true, visibilityDependent:true}),
  c("riverwalk-lights", "River Road + downtown lights loop", "lights", "downtown-core", 60, 0.82, 0.93, 0.98, 0.95, 0.15, "free", false, "dark", "medium", 35.7128, -83.5150, SOURCE_URLS.winterMagic, {walk:0.75}),
  c("indoor-ripleys", "Downtown indoor attraction block", "indoor", "downtown-core", 90, 0.85, 0.74, 0.55, 0.5, 0.05, "$$", true, "any", "none", 35.7143, -83.5112, "https://www.ripleys.com/gatlinburg", {walk:0.25}),
  c("downtown-dinner", "Dinner in the downtown core", "food", "downtown-core", 75, 0.95, 0.95, 0.78, 0.72, 0.05, "$$", true, "evening", "none", 35.7142, -83.5111, "https://www.gatlinburg.com/food-drink/", {walk:0.15, categoryOnly:true}),
  c("casual-food", "Casual food stop downtown", "food", "downtown-core", 50, 0.95, 0.82, 0.65, 0.58, 0.05, "$", false, "any", "none", 35.7142, -83.5111, "https://www.gatlinburg.com/food-drink/", {walk:0.12, categoryOnly:true}),
  c("trolley-lights", "Gatlinburg trolley + lights", "lights", "downtown-core", 75, 0.92, 0.78, 0.96, 0.92, 0.12, "free", false, "dark", "low", 35.7142, -83.5111, SOURCE_URLS.trolley, {walk:0.18, transitDependent:true, season:[SEASON.start,SEASON.end]}),
  c("space-needle", "Gatlinburg Space Needle", "view", "downtown-core", 75, 0.72, 0.9, 0.72, 0.75, 0.28, "$$", true, "day-or-evening", "medium", 35.7119, -83.5187, "https://www.gatlinburgspaceneedle.com/", {walk:0.32}),
  c("moonshine-free-loop", "Free downtown atmosphere loop", "free", "downtown-core", 90, 0.84, 0.88, 0.94, 0.9, 0.12, "free", false, "dark", "low", 35.7144, -83.5116, SOURCE_URLS.winterMagic, {walk:0.8, season:[SEASON.start,SEASON.end]}),
  c("parade", "Fantasy of Lights Christmas Parade", "event", "downtown-core", 150, 0.96, 0.82, 1, 1, 0.05, "free", false, "evening", "medium", 35.7144, -83.5116, FIXED_EVENTS[3].sourceUrl, {exactDate:"2026-12-04", exactStart:"19:30", walk:0.4}),
  c("new-years", "New Year's Eve Celebration & Ball Drop", "event", "downtown-core", 180, 0.7, 0.92, 0.82, 0.55, 0.05, "free", false, "evening", "medium", 35.7118, -83.5185, SOURCE_URLS.events, {exactDate:"2026-12-31", walk:0.45})
]);

function c(id,name,category,zone,durationMinutes,childFit,coupleFit,firstVisitFit,christmasFit,snowFit,cost,reservation,bestTime,weatherSensitivity,lat,lon,officialUrl,extra={}){
  return Object.freeze({id,name,category,zone,durationMinutes,childFit,coupleFit,firstVisitFit,christmasFit,snowFit,cost,reservation,bestTime,weatherSensitivity,lat,lon,officialUrl,...extra});
}

function clamp(n,min=0,max=1){ return Math.max(min,Math.min(max,n)); }
function usableState(state){ return ["live","cached","stale"].includes(state); }
function safe(v,max=240){ return String(v == null ? "" : v).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max); }
function isoDate(v){ return /^\d{4}-\d{2}-\d{2}$/.test(String(v||"")) ? String(v) : null; }
function hhmm(v){ return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||"")) ? String(v) : null; }
function minutes(v){ const [h,m]=String(v).split(":").map(Number); return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null; }
function toHHMM(n){ n=Math.max(0,Math.min(1439,Math.round(n))); return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`; }
function dateInRange(date,start,end){ return Boolean(date && date >= start && date <= end); }
function localDate(date=new Date()){ return new Intl.DateTimeFormat("en-CA",{timeZone:DESTINATION.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(date); }
function localTime(date=new Date()){ return new Intl.DateTimeFormat("en-US",{timeZone:DESTINATION.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(date).replace("24:","00:"); }
function dateLabel(date){
  const d=new Date(`${date}T12:00:00-05:00`);
  return new Intl.DateTimeFormat("en-US",{timeZone:DESTINATION.timezone,weekday:"long",month:"long",day:"numeric"}).format(d);
}
function formatTime(v){
  const m=minutes(v); if(m===null) return v;
  const h=Math.floor(m/60), mm=m%60, suffix=h>=12?"PM":"AM", h12=h%12||12;
  return `${h12}:${String(mm).padStart(2,"0")} ${suffix}`;
}
function inSeason(date){ return dateInRange(date,SEASON.start,SEASON.end); }
function eventsForDate(date){ return FIXED_EVENTS.filter(e=>dateInRange(date,e.start,e.end)); }

function normalizeInput(query={}){
  const today=localDate();
  const date=isoDate(query.date)||today;
  const currentLocal=localTime();
  const sameDay=date===today;
  const defaultStart=sameDay ? currentLocal : "14:00";
  let start=hhmm(query.start)||defaultStart;
  let end=hhmm(query.end)||"22:00";
  if(minutes(end)<=minutes(start)) end="23:30";
  const persona=["first","family","couple","christmas","snow","attractions","food-lights","budget","evening","full-day","multi-day"].includes(query.persona)?query.persona:"first";
  return {
    date,start,end,persona,
    kids:String(query.kids||"").split(",").map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=17).slice(0,5),
    budget:["low","medium","any"].includes(query.budget)?query.budget:(persona==="budget"?"low":"any"),
    crowds:["avoid","normal","embrace"].includes(query.crowds)?query.crowds:"normal",
    mobility:["low-walk","normal","stroller"].includes(query.mobility)?query.mobility:"normal",
    weatherPreference:["outdoor","indoor","balanced"].includes(query.weather)?query.weather:"balanced",
    mustSnow:String(query.mustSnow||"")==="1"||persona==="snow",
    mustLights:String(query.mustLights||"")==="1"||persona==="christmas"||persona==="food-lights",
    firstVisit:String(query.firstVisit||"")==="1"||persona==="first"||persona==="family",
    duration:persona==="multi-day"?"multi-day":persona==="evening"?"evening":persona==="full-day"?"full-day":"custom"
  };
}

async function fetchText(url,opts={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),opts.timeoutMs||3500);
  try{
    const res=await fetch(url,{headers:{"user-agent":USER_AGENT,"accept":opts.accept||"text/html,application/json"},signal:controller.signal,redirect:"follow"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }finally{clearTimeout(timer);}
}
async function fetchJson(url,opts={}){ return JSON.parse(await fetchText(url,{...opts,accept:"application/geo+json,application/json"})); }
async function cachedSource(key,ttlMs,loader){
  const hit=SOURCE_CACHE.get(key); const now=Date.now();
  if(hit && now-hit.at<ttlMs) return {...hit.value,state:hit.value.state==="live"?"cached":hit.value.state,cacheAgeSeconds:Math.round((now-hit.at)/1000)};
  try{
    const value=await loader();
    SOURCE_CACHE.set(key,{at:now,value});
    return value;
  }catch(error){
    if(hit) return {...hit.value,state:"stale",error:safe(error?.message||error),cacheAgeSeconds:Math.round((now-hit.at)/1000)};
    return {state:"unavailable",fetchedAt:new Date().toISOString(),error:safe(error?.message||error)};
  }
}

function nwsValueAt(values,target){
  if(!Array.isArray(values)||!target) return null;
  const t=target.getTime();
  for(const row of values){
    const [start,dur]=String(row.validTime||"").split("/");
    const s=Date.parse(start); if(!Number.isFinite(s)) continue;
    let span=3600000;
    const m=String(dur||"").match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if(m) span=(Number(m[1]||0)*60+Number(m[2]||0))*60000||span;
    if(t>=s && t<s+span) return row.value;
  }
  return null;
}

function localDateTimeParts(iso){
  const d=new Date(iso); if(!Number.isFinite(d.getTime())) return null;
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:DESTINATION.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")==="24"?"00":get("hour")}:${get("minute")}`};
}

async function fetchWeather(input){
  return cachedSource(`weather:${input.date}`,WEATHER_MAX_AGE_MS,async()=>{
    const point=await fetchJson(`https://api.weather.gov/points/${DESTINATION.lat},${DESTINATION.lon}`);
    const hourlyUrl=point?.properties?.forecastHourly;
    const gridUrl=point?.properties?.forecastGridData;
    if(!hourlyUrl) throw new Error("NWS hourly forecast URL missing");
    const [hourly,grid,alerts]=await Promise.all([
      fetchJson(hourlyUrl),
      gridUrl?fetchJson(gridUrl).catch(()=>null):Promise.resolve(null),
      fetchJson(`https://api.weather.gov/alerts/active?point=${DESTINATION.lat},${DESTINATION.lon}`).catch(()=>({features:[]}))
    ]);
    const periods=(hourly?.properties?.periods||[]).map(p=>({...p,local:localDateTimeParts(p.startTime)})).filter(p=>p.local?.date===input.date);
    const relevant=periods.filter(p=>{
      const t=minutes(p.local.time); return t!==null && t>=minutes(input.start)-60 && t<=minutes(input.end)+60;
    });
    if(!periods.length){
      return {state:"unavailable",fetchedAt:new Date().toISOString(),sourceUrl:hourlyUrl,reason:"Requested date is outside the available NWS hourly forecast window",periods:[],alerts:[]};
    }
    const temps=relevant.map(p=>Number(p.temperature)).filter(Number.isFinite);
    const precip=relevant.map(p=>Number(p.probabilityOfPrecipitation?.value)).filter(Number.isFinite);
    const wind=relevant.map(p=>Number(String(p.windSpeed||"").match(/\d+/)?.[0])).filter(Number.isFinite);
    const sky=relevant.map(p=>String(p.shortForecast||""));
    const activeAlerts=(alerts.features||[]).map(f=>({event:safe(f.properties?.event,90),headline:safe(f.properties?.headline,180),severity:safe(f.properties?.severity,40),url:f.id||"https://www.weather.gov/"}));
    const targetMid=relevant.length?new Date(relevant[Math.floor(relevant.length/2)].startTime):null;
    const cloud=targetMid&&grid?.properties?.skyCover ? nwsValueAt(grid.properties.skyCover.values,targetMid) : null;
    const vis=targetMid&&grid?.properties?.visibility ? nwsValueAt(grid.properties.visibility.values,targetMid) : null;
    const snowfall=targetMid&&grid?.properties?.snowfallAmount ? nwsValueAt(grid.properties.snowfallAmount.values,targetMid) : null;
    const rainStarts=relevant.find(p=>(Number(p.probabilityOfPrecipitation?.value)||0)>=45)?.local?.time||null;
    const snowSignal=relevant.some(p=>/snow|flurr|wintry|sleet/i.test(`${p.shortForecast} ${p.detailedForecast||""}`)) || Number(snowfall)>0;
    return {
      state:"live",fetchedAt:new Date().toISOString(),sourceUrl:hourlyUrl,
      periods:relevant.slice(0,18),
      tempHigh:temps.length?Math.max(...temps):null,tempLow:temps.length?Math.min(...temps):null,
      precipMax:precip.length?Math.max(...precip):null,windMax:wind.length?Math.max(...wind):null,
      cloudCover:Number.isFinite(Number(cloud))?Number(cloud):null,
      visibilityMeters:Number.isFinite(Number(vis))?Number(vis):null,
      snowSignal,rainStarts,summary:sky.filter(Boolean).slice(0,3).join(" → "),alerts:activeAlerts
    };
  });
}

function sunriseSunsetApprox(date){
  const noon=new Date(`${date}T12:00:00Z`); const start=new Date(Date.UTC(noon.getUTCFullYear(),0,0));
  const n=Math.floor((noon-start)/86400000); const lngHour=DESTINATION.lon/15;
  function calc(rise){
    const t=n+((rise?6:18)-lngHour)/24;
    const M=0.9856*t-3.289;
    let L=M+1.916*Math.sin(M*Math.PI/180)+0.020*Math.sin(2*M*Math.PI/180)+282.634; L=(L+360)%360;
    let RA=Math.atan(0.91764*Math.tan(L*Math.PI/180))*180/Math.PI; RA=(RA+360)%360;
    const Lq=Math.floor(L/90)*90, RAq=Math.floor(RA/90)*90; RA=(RA+(Lq-RAq))/15;
    const sinDec=0.39782*Math.sin(L*Math.PI/180), cosDec=Math.cos(Math.asin(sinDec));
    const cosH=(Math.cos(90.833*Math.PI/180)-sinDec*Math.sin(DESTINATION.lat*Math.PI/180))/(cosDec*Math.cos(DESTINATION.lat*Math.PI/180));
    if(cosH>1||cosH< -1) return null;
    let H=(rise?360-Math.acos(cosH)*180/Math.PI:Math.acos(cosH)*180/Math.PI)/15;
    const T=H+RA-0.06571*t-6.622; let UT=(T-lngHour)%24; if(UT<0)UT+=24;
    const d=new Date(Date.UTC(noon.getUTCFullYear(),noon.getUTCMonth(),noon.getUTCDate(),0,Math.round(UT*60)));
    const p=localDateTimeParts(d.toISOString()); return p?.time||null;
  }
  return {state:"calculated",sunrise:calc(true),sunset:calc(false),sourceUrl:"https://gml.noaa.gov/grad/solcalc/",fetchedAt:new Date().toISOString()};
}

function stripHtml(html){ return String(html||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); }

async function fetchNps(){
  return cachedSource("nps",10*60*1000,async()=>{
    const text=stripHtml(await fetchText(SOURCE_URLS.npsClosures));
    const keywords=["Newfound Gap Road","US 441","Little River Road","Sugarlands","Kuwohi","road closure","temporarily closed","weather"];
    const hits=[];
    for(const k of keywords){
      const i=text.toLowerCase().indexOf(k.toLowerCase());
      if(i>=0) hits.push(text.slice(Math.max(0,i-110),Math.min(text.length,i+260)));
    }
    const joined=hits.join(" ");
    const newfoundClosed=/(Newfound Gap Road|US 441)[^.!?]{0,90}(?:is|—|-|:)\s*(?:temporarily\s+)?closed\b/i.test(joined);
    return {state:"live",fetchedAt:new Date().toISOString(),sourceUrl:SOURCE_URLS.npsClosures,newfoundGapClosed:newfoundClosed,summary:safe(hits[0]||"Official park closure page fetched; no Gatlinburg-specific closure phrase was extracted.",280)};
  });
}

function parseTodayOpen(text){
  const clean=stripHtml(text);
  if(/we are closed|closed today/i.test(clean)) return "closed";
  if(/we are open|open today|today'?s hours/i.test(clean)) return "open";
  return "unknown";
}
async function fetchAttractionStates(input){
  const defs=[
    ["skypark",SOURCE_URLS.skyparkStatus],
    ["anakeesta",SOURCE_URLS.anakeesta],
    ["ober-mountain",SOURCE_URLS.ober],
    ["ripley-aquarium",SOURCE_URLS.ripley]
  ];
  const today=localDate();
  if(input.date!==today){
    return Object.fromEntries(defs.map(([id,url])=>[id,{id,state:"published",fetchedAt:null,sourceUrl:url,openState:"unverified",note:"Future-date operating hours are not treated as confirmed open; verify the official calendar before committing."}]));
  }
  const rows=await Promise.all(defs.map(async([id,url])=>cachedSource(`attraction:${id}`,15*60*1000,async()=>{
    const text=await fetchText(url); const todayState=parseTodayOpen(text);
    return {id,state:"live",fetchedAt:new Date().toISOString(),sourceUrl:url,openState:todayState,note:todayState==="unknown"?"Official page checked, but no unambiguous open/closed phrase was extracted.":"Official page checked for current open/closed language."};
  })));
  const out={}; rows.forEach(r=>out[r.id]=r); return out;
}

function weatherFacts(weather,sun){
  const hazard=(weather.alerts||[]).find(a=>/Blizzard Warning|Ice Storm Warning|Winter Storm Warning|Flash Flood Warning|High Wind Warning/i.test(a.event));
  const badOutdoor=(weather.precipMax||0)>=70 || (weather.windMax||0)>=25;
  const visibilityQuality=usableState(weather.state) ? ((weather.cloudCover==null?0.65:clamp(1-weather.cloudCover/125)) * ((weather.visibilityMeters==null||weather.visibilityMeters>=12000)?1:clamp(weather.visibilityMeters/12000))) : 0.5;
  return {hazard,badOutdoor,visibilityQuality,sunset:sun.sunset,sunrise:sun.sunrise};
}

function attractionStateFor(cand,ctx){
  if(ctx.attractions?.[cand.id]) return ctx.attractions[cand.id];
  if(cand.id==="ober-snow-tubing") return ctx.attractions?.["ober-mountain"]||null;
  if(cand.id==="indoor-ripleys") return ctx.attractions?.["ripley-aquarium"]||null;
  return null;
}

function hardGate(cand,input,ctx){
  const reasons=[];
  if(cand.season && !dateInRange(input.date,cand.season[0],cand.season[1])) return {valid:false,reasons:["outside seasonal window"]};
  if(cand.exactDate && cand.exactDate!==input.date) return {valid:false,reasons:["date-specific event not happening"]};
  if(cand.exactStart && minutes(input.end)<minutes(cand.exactStart)+30) return {valid:false,reasons:["visit ends before event is usable"]};
  const attraction=attractionStateFor(cand,ctx);
  if(attraction?.openState==="closed") return {valid:false,reasons:["official attraction page currently reports closed"]};
  if(cand.officialClosureSensitive && cand.id==="newfound-gap" && ctx.nps?.newfoundGapClosed) return {valid:false,reasons:["official NPS closure affects Newfound Gap Road"]};
  if(ctx.weatherFacts?.hazard && cand.weatherSensitivity==="very-high") return {valid:false,reasons:[`weather alert: ${ctx.weatherFacts.hazard.event}`]};
  const start=minutes(input.start), end=minutes(input.end), sunset=minutes(ctx.sun?.sunset);
  if(end-start < Math.min(cand.durationMinutes,90)) return {valid:false,reasons:["not enough usable time"]};
  if(cand.bestTime==="day" && sunset!==null && start>sunset+15) return {valid:false,reasons:["arrival is after the useful daylight window"]};
  if(cand.bestTime==="before-sunset" && sunset!==null && start>sunset-20) return {valid:false,reasons:["arrival is too late for the intended pre-sunset experience"]};
  if(cand.snowDependent && input.mustSnow && usableState(ctx.weather?.state) && !ctx.weather?.snowSignal){ reasons.push("no downtown snow signal; mountain snow still requires Ober verification"); }
  if(attraction?.openState==="unverified") reasons.push("future-date hours require official verification");
  return {valid:true,reasons};
}

function personaWeights(input){
  const base={child:0.8,couple:0.8,first:0.8,christmas:0.8,snow:0.6,cost:0.4,weather:0.7,walk:0.45,crowd:0.45};
  if(input.persona==="family") Object.assign(base,{child:1.5,first:1.0,walk:0.8,weather:0.85});
  if(input.persona==="couple") Object.assign(base,{couple:1.6,christmas:1.05,weather:0.7});
  if(input.persona==="christmas") Object.assign(base,{christmas:1.8,couple:0.9});
  if(input.persona==="snow") Object.assign(base,{snow:2.1,weather:1.0});
  if(input.persona==="budget") Object.assign(base,{cost:2.1,christmas:1.0});
  if(input.persona==="food-lights") Object.assign(base,{christmas:1.45,couple:1.1});
  if(input.persona==="attractions") Object.assign(base,{first:1.4,child:1.0});
  return base;
}
function costValue(cost){ return cost==="free"?1:cost==="$"?.8:cost==="$$"?.45:.2; }
function crowdPenaltyForCandidate(c,input,ctx){
  if(input.crowds!=="avoid") return 0;
  if(c.id==="parade"||c.id==="new-years") return 0.9;
  if(c.zone==="downtown-core" && ctx.crowd.level==="heavy") return 0.55;
  return 0.12;
}
function scoreCandidate(c,input,ctx){
  const w=personaWeights(input); const wf=ctx.weatherFacts||{};
  let score=50;
  score+=18*w.child*(c.childFit-.5)+18*w.couple*(c.coupleFit-.5)+18*w.first*(c.firstVisitFit-.5)+18*w.christmas*(c.christmasFit-.5)+18*w.snow*(c.snowFit-.5);
  score+=12*w.cost*(costValue(c.cost)-.45);
  if(input.budget==="low" && ["$$","$$$"] .includes(c.cost)) score-=22;
  if(input.mustLights && c.christmasFit<.75) score-=12;
  if(input.mustSnow && c.snowFit<.7) score-=18;
  if(input.mobility==="low-walk" || input.mobility==="stroller") score-=Math.max(0,(c.walk||.4)-.35)*32*w.walk;
  if(input.weatherPreference==="indoor" && c.category!=="indoor"&&c.category!=="food") score-=12;
  if(input.weatherPreference==="outdoor" && c.category==="indoor") score-=10;
  if(usableState(ctx.weather?.state)){
    if(wf.badOutdoor && ["high","very-high"].includes(c.weatherSensitivity)) score-=26*w.weather;
    if(c.visibilityDependent) score+=(wf.visibilityQuality-.5)*30;
    if(ctx.weather.rainStarts && c.category==="indoor") score+=8;
  }
  score-=crowdPenaltyForCandidate(c,input,ctx)*20*w.crowd;
  if(c.category==="event" && eventsForDate(input.date).some(e=>e.name===c.name)) score+=18;
  return Math.round(score*10)/10;
}

function crowdPressure(input){
  const d=new Date(`${input.date}T12:00:00-05:00`); const day=d.getUTCDay();
  if(input.date==="2026-12-04"||input.date==="2026-12-31") return {level:"heavy",label:"Heavy",reason:"Major date-specific downtown event"};
  if(day===5||day===6) return {level:"moderate-heavy",label:"Moderate → Heavy evening",reason:"Winter weekend pattern"};
  if(day===0) return {level:"moderate",label:"Moderate",reason:"Winter weekend pattern"};
  return {level:"lighter",label:"Lighter → Moderate",reason:"Weekday planning estimate"};
}

const TRAVEL={
  "downtown-core|downtown-north":10,"downtown-core|skypark":10,"downtown-core|anakeesta":10,"downtown-core|ober":25,"downtown-core|nps-sugarlands":20,"downtown-core|nps-newfound-gap":55,"downtown-core|arts-crafts":30,
  "downtown-north|skypark":15,"downtown-north|anakeesta":10,"skypark|anakeesta":15,"skypark|ober":30,"anakeesta|ober":30,"nps-sugarlands|nps-newfound-gap":40,"nps-sugarlands|downtown-core":20,"arts-crafts|downtown-core":30
};
function travelMinutes(a,b){ if(!a||!b||a===b) return 8; return TRAVEL[`${a}|${b}`]||TRAVEL[`${b}|${a}`]||20; }

function distinctById(arr){ const seen=new Set(); return arr.filter(x=>!seen.has(x.id)&&seen.add(x.id)); }
function pick(scored,pred){ return scored.find(x=>pred(x.candidate)); }

function buildBundles(scored,input,ctx){
  const valid=scored.filter(x=>x.valid).sort((a,b)=>b.score-a.score);
  const by=id=>valid.find(x=>x.candidate.id===id);
  const bundles=[];
  function add(id,label,items,why,decisive){
    const clean=distinctById(items.filter(Boolean).map(x=>x.candidate||x));
    if(clean.length<2) return;
    const avg=clean.reduce((s,c)=>s+(valid.find(v=>v.candidate.id===c.id)?.score||45),0)/clean.length;
    const zoneChanges=clean.slice(1).reduce((n,c,i)=>n+(c.zone!==clean[i].zone?1:0),0);
    bundles.push({id,label,itemIds:clean.map(c=>c.id),score:Math.round((avg-zoneChanges*2)*10)/10,why,decisiveConstraint:decisive});
  }
  const mountain=pick(valid,c=>["skypark","anakeesta"].includes(c.id));
  const lights=pick(valid,c=>["winter-magic-walk","parkway-lights","riverwalk-lights","moonshine-free-loop"].includes(c.id));
  const indoor=pick(valid,c=>["ripley-aquarium","indoor-ripleys"].includes(c.id));
  const food=pick(valid,c=>c.category==="food");
  const snow=pick(valid,c=>["ober-snow-tubing","ober-mountain"].includes(c.id));
  const park=pick(valid,c=>["newfound-gap","sugarlands"].includes(c.id));
  const event=pick(valid,c=>c.category==="event");
  const budgetLights=by("moonshine-free-loop")||lights;

  if(event) add("event-anchor","Event night",[event,food,lights||indoor],"Anchor the day around the fixed event instead of fighting its timing.","date-specific event");
  if(input.mustSnow && snow) add("snow-first","Snow-first day",[snow,food,lights||indoor],"Give the mountain snow goal the largest uninterrupted block, then return downtown.","snow priority");
  if(ctx.weather?.rainStarts && indoor) add("weather-pivot","Use the dry window first",[mountain||park,lights,food,indoor],"Use the better outdoor window first and move indoors when precipitation becomes more likely.","precipitation timing");
  if(mountain && lights) add("mountain-then-lights","Mountain before dark, lights after",[mountain,lights,food,indoor],"Spend visibility and daylight on elevation first; let darkness improve Winter Magic later.","daylight + visibility");
  if(input.budget==="low") add("mostly-free","Mostly free winter evening",[budgetLights,by("trolley-lights"),by("casual-food"),by("parkway-lights")],"Keep the winter atmosphere while avoiding ticket-heavy stops.","budget");
  if(park && lights) add("smokies-and-lights","Smokies + downtown winter",[park,food,lights],"Use daylight in the park, then return to the compact downtown light district.","daylight");
  if(indoor && lights) add("easy-winter","Lower-friction winter plan",[indoor,food,lights],"Keep walking and weather exposure manageable without giving up the seasonal evening.","weather/mobility");
  const top=valid.slice(0,5).map(x=>x.candidate);
  add("best-fit","Best-fit mix",top,"Use the highest-fit valid choices while limiting unnecessary backtracking.","overall fit");

  const unique=[]; const sig=new Set();
  for(const b of bundles.sort((a,b)=>b.score-a.score)){
    const s=b.itemIds.join("|"); if(sig.has(s)) continue; sig.add(s); unique.push(b);
  }
  return unique.slice(0,6);
}

function buildItinerary(bundle,scored,input,ctx){
  if(!bundle) return [];
  const lookup=new Map(scored.map(s=>[s.candidate.id,s.candidate]));
  let items=bundle.itemIds.map(id=>lookup.get(id)).filter(Boolean);
  const sunset=minutes(ctx.sun?.sunset);
  items.sort((a,b)=>{
    const rank=c=> c.category==="event"?3 : c.bestTime==="before-sunset"||c.bestTime==="day"?0 : c.category==="food"?2 : c.bestTime==="dark"?4 : c.category==="indoor"?5 : 1;
    return rank(a)-rank(b);
  });
  const start=minutes(input.start), end=minutes(input.end), reserve=25;
  let cursor=start; let prev=null; const out=[];
  for(const item of items){
    if(prev) cursor+=travelMinutes(prev.zone,item.zone);
    if(item.bestTime==="dark" && sunset!==null) cursor=Math.max(cursor,sunset+15);
    if(item.exactStart) cursor=Math.max(cursor,minutes(item.exactStart));
    if(item.category==="food" && cursor<17*60) cursor=Math.min(Math.max(cursor,17*60),18*60+15);
    const dwell=Math.min(item.durationMinutes, input.duration==="evening"?105:item.durationMinutes);
    if(cursor+dwell+reserve>end) continue;
    out.push({id:item.id,name:item.name,zone:item.zone,start:toHHMM(cursor),end:toHHMM(cursor+dwell),durationMinutes:dwell,officialUrl:item.officialUrl,verificationRequired:attractionStateFor(item,ctx)?.openState==="unverified"});
    cursor+=dwell; prev=item;
  }
  return out;
}

function headlineFrom(input,ctx,itinerary){
  const winter=inSeason(input.date);
  const weather=ctx.weather;
  const sun=ctx.sun;
  const first=itinerary[0];
  const temp=usableState(weather.state)&&weather.tempHigh!=null ? `${Math.round(weather.tempHigh)}° → ${Math.round(weather.tempLow)}°` : "Forecast not in range";
  const snow=usableState(weather.state) ? (weather.snowSignal?"Snow signal in forecast":"No downtown snow signal") : "Not yet verifiable";
  const vis=usableState(weather.state) ? (ctx.weatherFacts.visibilityQuality>=.72?"Good forecast signal":ctx.weatherFacts.visibilityQuality>=.48?"Mixed forecast signal":"Poor forecast signal") : "Not yet verifiable";
  const bestWindow=itinerary.length?`${formatTime(itinerary[0].start)}–${formatTime(itinerary[itinerary.length-1].end)}`:`${formatTime(input.start)}–${formatTime(input.end)}`;
  let state="PLAN THE DATE";
  if(winter && itinerary.length) state=ctx.weatherFacts.hazard?"CONDITIONS NEED A CLOSER CHECK":usableState(ctx.weather?.state)?"TODAY HAS A WORKABLE PLAN":"A SOLID WINTER PLAN";
  if(!winter && input.date<SEASON.start) state="WINTER MAGIC STARTS NOVEMBER 5";
  if(input.date>SEASON.end) state="WINTER MAGIC SEASON HAS ENDED";
  const bestMove=first?`${first.name} first. ${first.verificationRequired?"Confirm today's official hours before you commit. ":""}${first.id.includes("sky")||first.id.includes("newfound")?"Use the daylight/visibility window before downtown lights take over after dark.":"The sequence is built around your available time and current constraints."}`:"Choose a winter date and time window to build the visit.";
  return {dateLabel:dateLabel(input.date),state,bestWindow,winterMagic:winter?"In season — strongest after dark":input.date<SEASON.start?`Begins ${SEASON.start}`:`Ended ${SEASON.end}`,weather:temp,snow,mountainVisibility:vis,crowdPressure:ctx.crowd.label,bestMove,sunset:sun.sunset?formatTime(sun.sunset):"—"};
}

function deterministicNarrative(bundle,itinerary,input,ctx){
  if(!bundle||!itinerary.length) return "Choose a winter date and time window to build a grounded plan.";
  const names=itinerary.map(x=>x.name);
  let text=`Start with ${names[0]}.`;
  if(names.length>1) text+=` Then move to ${names.slice(1).join(names.length>2?", then ":" and ")}.`;
  if(ctx.weather?.rainStarts) text+=` The sequence keeps the more weather-sensitive part ahead of the higher precipitation window around ${formatTime(ctx.weather.rainStarts)}.`;
  else if(ctx.sun?.sunset && itinerary.some(x=>/Magic|lights|Parkway/i.test(x.name))) text+=` The lights land after the ${formatTime(ctx.sun.sunset)} sunset instead of consuming the better daylight.`;
  return text;
}

async function anthropicWrite(bundle,itinerary,input,ctx){
  const fallback=deterministicNarrative(bundle,itinerary,input,ctx);
  if(!process.env.ANTHROPIC_API_KEY) return {mode:"deterministic",text:fallback,reason:"writer key unavailable"};
  const facts={persona:input.persona,date:input.date,start:input.start,end:input.end,selected:itinerary.map(x=>({name:x.name,start:x.start,end:x.end,verificationRequired:x.verificationRequired})),weather:usableState(ctx.weather?.state)?{tempHigh:ctx.weather.tempHigh,tempLow:ctx.weather.tempLow,precipMax:ctx.weather.precipMax,rainStarts:ctx.weather.rainStarts,snowSignal:ctx.weather.snowSignal}: {state:ctx.weather?.state},sunset:ctx.sun?.sunset,crowd:ctx.crowd.label,decision:bundle.why};
  const system="You write concise destination decision copy from sealed facts. Do not add attractions, hours, prices, events, weather, closures, travel times, ticket availability, or safety claims. Write 2-3 short sentences. Explain sequence and tradeoff. No promotional travel prose. Avoid: whether you're, nestled in, something for everyone, magical memories, embark on, vibrant tapestry, perfect blend.";
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),3800);
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:controller.signal,headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:WRITER_MODEL,max_tokens:220,temperature:0.25,system,messages:[{role:"user",content:`Sealed facts:\n${JSON.stringify(facts)}\nWrite the user-facing plan explanation.`}]})});
    const data=await res.json().catch(()=>null); if(!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const text=safe((data?.content||[]).find(x=>x.type==="text")?.text,650); if(!text) throw new Error("empty writer output");
    return {mode:"anthropic-haiku",model:WRITER_MODEL,text};
  }catch(error){ return {mode:"deterministic",text:fallback,reason:safe(error?.message||error)}; }
  finally{clearTimeout(timer);}
}

function publicConditions(input,ctx){
  const rows=[];
  const w=ctx.weather;
  rows.push({label:"Weather",value:usableState(w.state)?`${Math.round(w.tempHigh)}° / ${Math.round(w.tempLow)}° · precip up to ${Math.round(w.precipMax||0)}%`:"Forecast unavailable for this date",state:w.state,sourceUrl:w.sourceUrl||"https://www.weather.gov/"});
  rows.push({label:"Snow",value:usableState(w.state)?(w.snowSignal?"Snow appears in the NWS forecast signal":"No downtown snow signal in the current NWS forecast"):"Not yet verifiable",state:w.state,sourceUrl:w.sourceUrl||"https://www.weather.gov/"});
  rows.push({label:"Smokies access",value:ctx.nps?.newfoundGapClosed?"Official closure text affects Newfound Gap Road":(["live","cached"].includes(ctx.nps?.state)?"No Newfound Gap closure phrase extracted — recheck official status before driving":ctx.nps?.state==="stale"?"Stale closure snapshot — recheck the official NPS page":"Official closure feed unavailable"),state:ctx.nps?.state||"unavailable",sourceUrl:SOURCE_URLS.npsClosures});
  rows.push({label:"Daylight",value:`Sunset ${ctx.sun.sunset?formatTime(ctx.sun.sunset):"unavailable"}`,state:ctx.sun.state,sourceUrl:ctx.sun.sourceUrl});
  return rows;
}

function whatCouldChange(input,ctx){
  const arr=["Attraction hours and ticket availability","Mountain visibility and cloud cover","NPS road or weather closures","Rain or snow timing"];
  if(input.date==="2026-12-04"||input.date==="2026-12-31") arr.unshift("Event access and downtown crowd/traffic controls");
  if(!usableState(ctx.weather?.state)) arr.unshift("Weather is outside the current forecast window");
  return arr.slice(0,5);
}

function sourceFreshness(ctx){
  const rows=[
    {name:"NWS Gatlinburg forecast",state:ctx.weather?.state||"unavailable",updatedAt:ctx.weather?.fetchedAt||null,url:ctx.weather?.sourceUrl||"https://www.weather.gov/"},
    {name:"Great Smoky Mountains closures",state:ctx.nps?.state||"unavailable",updatedAt:ctx.nps?.fetchedAt||null,url:SOURCE_URLS.npsClosures},
    {name:"Winter Magic dates",state:"published",updatedAt:"2026-09-23T00:00:00Z",url:SOURCE_URLS.winterMagic},
    {name:"Seasonal event calendar",state:"published",updatedAt:"2026-09-23T00:00:00Z",url:SOURCE_URLS.events},
    {name:"Solar timing",state:ctx.sun.state,updatedAt:ctx.sun.fetchedAt,url:ctx.sun.sourceUrl}
  ];
  Object.values(ctx.attractions||{}).forEach(a=>rows.push({name:`${CANDIDATES.find(c=>c.id===a.id)?.name||a.id} status`,state:a.state,updatedAt:a.fetchedAt,url:a.sourceUrl,note:a.note}));
  return rows;
}

async function buildDecision(rawQuery={}){
  const input=normalizeInput(rawQuery);
  const [weather,nps,attractions]=await Promise.all([fetchWeather(input),fetchNps(),fetchAttractionStates(input)]);
  const sun=sunriseSunsetApprox(input.date);
  const crowd=crowdPressure(input);
  const ctx={weather,nps,attractions,sun,crowd}; ctx.weatherFacts=weatherFacts(weather,sun);
  const scored=CANDIDATES.map(candidate=>{const gate=hardGate(candidate,input,ctx);return {candidate,valid:gate.valid,gateReasons:gate.reasons,score:gate.valid?scoreCandidate(candidate,input,ctx):null};});
  const valid=scored.filter(x=>x.valid);
  const bundles=buildBundles(scored,input,ctx);
  let chosen=bundles[0]||null; let jev={mode:"deterministic",choiceId:chosen?.id||null,confidence:0,reason:"No JEV candidates"};
  if(bundles.length){
    const options=Object.fromEntries(bundles.map(b=>[b.id,{label:b.label,itemIds:b.itemIds,deterministicScore:b.score,why:b.why,decisiveConstraint:b.decisiveConstraint}]));
    jev=await decideClosedSet({
      task:"Choose the strongest feasible Gatlinburg winter itinerary bundle for this visitor. Choose only one supplied bundle. Prioritize persona fit, current-condition fit, realistic sequencing, seasonal uniqueness, geographic efficiency, weather timing and low friction. Penalize backtracking, crowd mismatch, weather exposure, cost mismatch and any verification uncertainty. Do not invent facts or options.",
      options,
      context:{input,weather:usableState(weather.state)?{tempHigh:weather.tempHigh,tempLow:weather.tempLow,precipMax:weather.precipMax,rainStarts:weather.rainStarts,snowSignal:weather.snowSignal}: {state:weather.state},sunset:sun.sunset,crowd:crowd.label,nps:{state:nps.state,newfoundGapClosed:Boolean(nps.newfoundGapClosed)}},
      constraints:["Hard-gated candidates have already been removed.","Never treat an unverified future attraction schedule as confirmed open.","Official closure data outranks preference.","Do not make driving or weather safety guarantees."],
      evidence:valid.map(v=>({id:v.candidate.id,name:v.candidate.name,score:v.score,gateNotes:v.gateReasons,cost:v.candidate.cost,zone:v.candidate.zone})),
      fallbackId:bundles[0].id,minConfidence:.55
    });
    chosen=bundles.find(b=>b.id===jev.choiceId)||bundles[0];
  }
  const itinerary=buildItinerary(chosen,scored,input,ctx);
  const writer=await anthropicWrite(chosen,itinerary,input,ctx);
  const alternatives=bundles.filter(b=>b.id!==chosen?.id).slice(0,3).map(b=>({id:b.id,label:b.label,why:b.why,score:b.score,items:b.itemIds.map(id=>CANDIDATES.find(c=>c.id===id)?.name).filter(Boolean)}));
  return {
    ok:true,generatedAt:new Date().toISOString(),destination:DESTINATION,input,
    mode:inSeason(input.date)?"winter-season":input.date<SEASON.start?"preseason":"postseason",
    season:SEASON,
    headline:headlineFrom(input,ctx,itinerary),
    decision:{bundleId:chosen?.id||null,label:chosen?.label||"No feasible bundle",summary:writer.text,why:chosen?.why||"No grounded bundle fit the selected window.",decisiveConstraint:chosen?.decisiveConstraint||null,jev:{mode:jev.mode,confidence:jev.confidence||0,model:jev.model||null},writer:{mode:writer.mode,model:writer.model||null}},
    itinerary,
    alternatives,
    conditions:publicConditions(input,ctx),
    events:eventsForDate(input.date),
    map:itinerary.map(x=>{const c=CANDIDATES.find(c=>c.id===x.id);return {id:x.id,name:x.name,lat:c?.lat,lon:c?.lon,zone:x.zone,start:x.start};}),
    whatCouldChange:whatCouldChange(input,ctx),
    sources:sourceFreshness(ctx),
    diagnostics:{candidateUniverse:CANDIDATES.length,validCandidates:valid.length,bundleCount:bundles.length,jevFallback:jev.mode!=="shared-harness-jev",writerFallback:writer.mode!=="anthropic-haiku",degradedSources:sourceFreshness(ctx).filter(s=>["stale","degraded","unavailable"].includes(s.state)).map(s=>s.name)}
  };
}

async function handler(req,res){
  res.setHeader("X-Robots-Tag","noindex");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");
  try{
    if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
    const data=await buildDecision(req.query||{});
    return res.status(200).json(data);
  }catch(error){
    return res.status(500).json({ok:false,error:"Gatlinburg winter planner failed",detail:safe(error?.message||error,220),generatedAt:new Date().toISOString()});
  }
}

module.exports=handler;
module.exports.buildDecision=buildDecision;
module.exports._test={DESTINATION,SEASON,FIXED_EVENTS,CANDIDATES,normalizeInput,inSeason,eventsForDate,usableState,attractionStateFor,hardGate,scoreCandidate,crowdPressure,buildBundles,buildItinerary,travelMinutes,sunriseSunsetApprox,weatherFacts,dateLabel,formatTime};
