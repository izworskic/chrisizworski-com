const LAT = 47.66556;
const LON = -122.39722;
const TZ = 'America/Los_Angeles';
const NOAA_STATION = '9447130';
const WDFW = 'https://wdfw.wa.gov/fishing/reports/counts/lake-washington';
const USACE = 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/';
const CLOSURES = `${USACE}Closures/`;
const LEVEL_PAGE = 'https://water.usace.army.mil/overview/nws/locations/lwsc';
const A2W_LEVEL = 'https://water.usace.army.mil/cda/reporting/providers/nws/locations/lwsc';
const CWMS_TSID = 'LWSC.Elev-Lake.Ave.1Hour.1Hour.IRIDIUM-REV';
const OPEN_WATERS = 'https://ais.openwaters.io/v1/vessels';
const AIS_BBOX = '47.63,-122.45,47.70,-122.32';
const UA = 'BallardLocksLive/2.0 (+https://chrisizworski.com/ballard-locks/)';

async function get(url, type = 'json', timeout = 7000, headers = {}) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*', ...headers }, signal: c.signal });
    if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
    return type === 'text' ? r.text() : r.json();
  } finally { clearTimeout(timer); }
}

function strip(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:tr|p|h[1-6]|div|table|li)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
}

function num(v) {
  if (v == null || !String(v).trim()) return null;
  const x = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(x) ? x : null;
}

function pacificParts(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).map(x => [x.type, x.value]));
  return { year:+parts.year, month:+parts.month, day:+parts.day, hour:+(parts.hour === '24' ? 0 : parts.hour), minute:+parts.minute };
}

function local(date) {
  return new Intl.DateTimeFormat('en-US', { timeZone:TZ, month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' }).format(date);
}
function ymd(p) { return `${p.year}${String(p.month).padStart(2,'0')}${String(p.day).padStart(2,'0')}`; }
function ageDays(md, nowParts) {
  const m = /^(\d{1,2})\/(\d{1,2})/.exec(md || '');
  if (!m) return null;
  const a = Date.UTC(nowParts.year, nowParts.month-1, nowParts.day, 12);
  const b = Date.UTC(nowParts.year, +m[1]-1, +m[2], 12);
  return Math.max(0, Math.round((a-b)/86400000));
}

function speciesSection(page, species) {
  const wanted = String(species).toLowerCase();
  const heading = new RegExp(`(?:^|\\n)\\s*daily\\s+${wanted}\\s+counts\\s*(?:\\n|$)`, 'i').exec(page);
  if (!heading) return null;
  const after = page.slice(heading.index + heading[0].length);
  const year = /(?:^|\n)\s*2026\s+daily\s+counts\s*(?:\n|$)/i.exec(after);
  if (!year) return null;
  const tail = after.slice(year.index);
  const boundaries = [];
  const start = year[0].length;
  const older = /(?:^|\n)\s*2025\s+daily\s+counts\s*(?:\n|$)/i.exec(tail.slice(start));
  if (older) boundaries.push(start + older.index);
  const nextSpecies = /(?:^|\n)\s*daily\s+(sockeye|chinook|coho)\s+counts\s*(?:\n|$)/ig;
  nextSpecies.lastIndex = start;
  let m;
  while ((m = nextSpecies.exec(tail))) if (m[1].toLowerCase() !== wanted) { boundaries.push(m.index); break; }
  const end = boundaries.length ? Math.min(...boundaries) : Math.min(tail.length, 30000);
  return tail.slice(0, end);
}

function seasonFor(species, month) {
  const m = month;
  const ranges = {
    Sockeye: { active:[6,7], edge:[8], note:'Sockeye passage is concentrated in early summer.' },
    Chinook: { active:[7,8,9], edge:[6,10], note:'Chinook are primarily a summer into early-fall signal.' },
    Coho: { active:[8,9,10], edge:[7,11], note:'Coho generally build later, into early fall.' },
  };
  const r = ranges[species] || { active:[], edge:[], note:'' };
  return { status:r.active.includes(m)?'IN SEASON':r.edge.includes(m)?'SEASON EDGE':'OFFSEASON', note:r.note };
}

function parseSpecies(page, species, nowParts) {
  const slice = speciesSection(page, species);
  if (!slice) return null;
  const rows = [];
  const re = /(?:^|\n)\s*(\d{1,2}\/\d{1,2}(?:-\d{1,2}\/\d{1,2})?)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)/gm;
  let m;
  while ((m = re.exec(slice))) {
    const daily = num(m[2]), total = num(m[3]);
    if (daily !== null && total !== null) rows.push({ date:m[1], daily, total });
  }
  if (!rows.length) return null;
  const latest = rows.at(-1), recent = rows.slice(-7), previous = rows.slice(-14,-7);
  const avg7 = recent.reduce((s,r)=>s+r.daily,0) / recent.length;
  const prev7 = previous.length ? previous.reduce((s,r)=>s+r.daily,0) / previous.length : null;
  const trend = prev7 == null || prev7 === 0 ? 'steady' : avg7 > prev7*1.2 ? 'rising' : avg7 < prev7*0.8 ? 'falling' : 'steady';
  return { species, latest, ageDays:ageDays(latest.date, nowParts), avg7:Math.round(avg7*10)/10, trend, season:seasonFor(species, nowParts.month) };
}

async function fish(nowParts) {
  try {
    const page = strip(await get(WDFW, 'text'));
    const species = ['Sockeye','Chinook','Coho'].map(s=>parseSpecies(page,s,nowParts)).filter(Boolean);
    if (species.length !== 3) throw new Error(`Expected 3 species tables, parsed ${species.length}`);
    return { ok:true, cadence:'daily', species, source:'Washington Department of Fish & Wildlife', url:WDFW };
  } catch (e) { return { ok:false, source:'Washington Department of Fish & Wildlife', url:WDFW, error:e.message }; }
}

async function tides(now) {
  const begin = ymd(pacificParts(now));
  const end = ymd(pacificParts(new Date(now.getTime()+3*86400000)));
  const base='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const common=`application=ballard-locks-live&station=${NOAA_STATION}&datum=MLLW&time_zone=gmt&units=english&format=json`;
  try {
    const pred = await get(`${base}?product=predictions&begin_date=${begin}&end_date=${end}&interval=hilo&${common}`);
    const predictions=(pred.predictions||[]).map(p=>({type:p.type==='H'?'High':'Low',valueFt:+p.v,at:`${p.t.replace(' ','T')}:00Z`})).filter(p=>Number.isFinite(p.valueFt)&&new Date(p.at)>=new Date(now.getTime()-15*60000)).slice(0,4);
    return { ok:true, station:NOAA_STATION, predictions, source:'NOAA Tides & Currents', url:`https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}`, decisionRole:'context-only' };
  } catch(e) { return { ok:false, station:NOAA_STATION, source:'NOAA Tides & Currents', url:`https://tidesandcurrents.noaa.gov/stationhome.html?id=${NOAA_STATION}`, error:e.message, decisionRole:'context-only' }; }
}

async function weather() {
  try {
    const point = await get(`https://api.weather.gov/points/${LAT},${LON}`);
    const data = await get(point?.properties?.forecastHourly);
    const p = data?.properties?.periods?.[0];
    if (!p) throw new Error('NWS hourly period missing');
    return { ok:true, temperatureF:p.temperature, windSpeed:p.windSpeed, windDirection:p.windDirection, precipitationProbability:p.probabilityOfPrecipitation?.value??null, shortForecast:p.shortForecast, validFrom:p.startTime, source:'National Weather Service', url:`https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}` };
  } catch(e) { return { ok:false, source:'National Weather Service', url:`https://forecast.weather.gov/MapClick.php?lat=${LAT}&lon=${LON}`, error:e.message }; }
}

async function lakeLevel() {
  try {
    const data = await get(A2W_LEVEL, 'json', 8000, {accept:'application/json'});
    const locations=Array.isArray(data)?data:[data];
    for (const loc of locations) {
      const rows=Array.isArray(loc?.timeseries)?loc.timeseries:[];
      const row=rows.find(x=>x?.tsid===CWMS_TSID)||rows.find(x=>x?.label==='Elevation'&&x?.unit==='ft');
      const valueFt=Number(row?.latest_value), observedAt=Date.parse(String(row?.latest_time||''));
      if (Number.isFinite(valueFt)&&Number.isFinite(observedAt)&&valueFt>=18&&valueFt<=24) {
        return {ok:true,valueFt,observedAt:new Date(observedAt).toISOString(),targetRangeFt:[20,22],source:'USACE Access to Water',url:LEVEL_PAGE};
      }
    }
    throw new Error('No usable current elevation');
  } catch(e) { return {ok:false,targetRangeFt:[20,22],source:'USACE Access to Water',url:LEVEL_PAGE,error:e.message}; }
}

const plannedClosures=[
 ['Large lock','2026-11-02T00:00:00-08:00','2026-11-21T00:00:00-08:00'],
 ['Small lock','2026-12-07T00:00:00-08:00','2027-01-19T00:00:00-08:00'],
 ['Small lock','2027-03-01T00:00:00-08:00','2027-03-31T00:00:00-07:00'],
 ['Large lock','2027-11-01T00:00:00-07:00','2027-11-13T00:00:00-08:00'],
].map(x=>({chamber:x[0],start:x[1],end:x[2]}));
function locks(now) {
  const active=plannedClosures.filter(x=>now>=new Date(x.start)&&now<new Date(x.end));
  return {largeOpen:!active.some(x=>x.chamber==='Large lock'),smallOpen:!active.some(x=>x.chamber==='Small lock'),activeClosures:active,source:'USACE published projected closures',url:CLOSURES,caveat:'Published maintenance windows do not guarantee real-time chamber availability.'};
}
function access(p) {
  const mins=p.hour*60+p.minute;
  return {groundsOpen:mins>=420&&mins<1260,fishLadderOpen:mins>=420&&mins<1245,groundsHours:'7:00 AM–9:00 PM',fishLadderHours:'7:00 AM–8:45 PM',vesselTraffic:'24/7',source:'U.S. Army Corps of Engineers',url:USACE};
}
function parking(now) {
  const verified = new Date('2026-09-28T12:00:00Z');
  const fresh = (now-verified)/86400000 <= 90;
  return fresh ? {summary:'North-side city lot · $2/hour · 3-hour maximum',rate:'$2/hour',maxHours:3,verifiedOn:'2026-09-28',source:'USACE visitor information',verifyPostedSigns:true} : {summary:'North-side city parking available — check posted rate and time limit',rate:null,maxHours:null,verifiedOn:'2026-09-28',source:'USACE visitor information',verifyPostedSigns:true};
}

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function haversineMiles(lat1,lon1,lat2,lon2){const R=3958.8,toRad=x=>x*Math.PI/180;const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function direction(cog){if(!Number.isFinite(cog))return 'direction unknown';const dirs=['northbound','northeast','eastbound','southeast','southbound','southwest','westbound','northwest'];return dirs[Math.round((((cog%360)+360)%360)/45)%8];}
function zone(lon,lat){if(lon<-122.405)return 'West approach / Shilshole';if(lon>-122.389)return 'Lake-side canal';if(lat<47.662)return 'South / fish-ladder side';return 'Salmon Bay / Locks';}
function sanitizeVessel(f){if(f?.type!=='Feature'||f?.geometry?.type!=='Point')return null;const [lon,lat]=f.geometry.coordinates||[];if(!Number.isFinite(+lon)||!Number.isFinite(+lat))return null;const p=f.properties||{};const name=String(p.name||'').trim();const sog=finite(p.sog),cog=finite(p.cog);return {name:name||'AIS vessel',mmsi:String(p.mmsi||f.id||'').replace(/\D/g,'').slice(0,9)||null,lat:+lat,lon:+lon,sog,cog,distanceMiles:Math.round(haversineMiles(LAT,LON,+lat,+lon)*10)/10,direction:direction(cog),zone:zone(+lon,+lat),moving:sog!=null?sog>=0.5:null};}
async function vessels(){
  try{
    const raw=await get(`${OPEN_WATERS}?bbox=${encodeURIComponent(AIS_BBOX)}`,'json',7000,{accept:'application/geo+json,application/json'});
    const list=(raw?.features||[]).map(sanitizeVessel).filter(Boolean).filter(v=>v.distanceMiles<=6).sort((a,b)=>a.distanceMiles-b.distanceMiles);
    const named=list.filter(v=>v.name!=='AIS vessel');
    const moving=named.filter(v=>v.moving!==false);
    const highlights=(moving.length?moving:named).slice(0,5);
    const signal=highlights.length>=3?'ACTIVE':highlights.length>=1?'MODERATE':'QUIET';
    return {ok:true,signal,count:list.length,namedCount:named.length,highlights,source:'Open Waters AIS',url:'https://openwaters.io/ais/',caveat:'AIS does not represent every recreational boat and does not guarantee a lock transit.'};
  }catch(e){return {ok:false,signal:'UNKNOWN',count:null,highlights:[],source:'Open Waters AIS',url:'https://openwaters.io/ais/',error:e.message,caveat:'AIS does not represent every recreational boat and does not guarantee a lock transit.'};}
}

function windMph(s){const m=String(s||'').match(/\d+/);return m?+m[0]:null;}
function salmonSignal(f){
  if(!f?.ok)return {label:'UNKNOWN',points:6,detail:'Current WDFW count feed unavailable'};
  const eligible=f.species.filter(s=>s.season.status!=='OFFSEASON'&&(s.ageDays??99)<=7);
  if(!eligible.length)return {label:'OFFSEASON',points:4,detail:'No fresh in-season species count is available'};
  const best=[...eligible].sort((a,b)=>b.latest.daily-a.latest.daily)[0];
  const x=best.latest.daily;
  const points=x>=500?25:x>=200?22:x>=75?18:x>=20?13:x>0?9:5;
  return {label:x>=200?'STRONG':x>=50?'MODERATE':x>0?'LOW':'QUIET',points,detail:`${best.species}: ${best.latest.daily.toLocaleString()} on ${best.latest.date}`,species:best.species};
}
function vesselSignal(v){if(!v?.ok)return {label:'UNKNOWN',points:6};return {label:v.signal,points:v.signal==='ACTIVE'?25:v.signal==='MODERATE'?17:8};}
function score({f,w,a,l,v}){
  const salmon=salmonSignal(f), vessel=vesselSignal(v);
  let total=salmon.points+vessel.points;
  const reasons=[`${vessel.label.toLowerCase()} trackable vessel activity`,`${salmon.label.toLowerCase()} salmon signal`];
  if(w.ok){const pop=w.precipitationProbability??0,wind=windMph(w.windSpeed);total+=pop<=20?10:pop<=40?7:pop<=70?3:0;total+=wind==null?3:wind<=10?6:wind<=18?4:wind<=25?2:0;total+=w.temperatureF>=45&&w.temperatureF<=82?4:2;reasons.push(pop<=20?'dry weather favored':`${pop}% precipitation chance`);}else total+=8;
  total+=a.groundsOpen?12:1;if(a.fishLadderOpen)total+=5;
  total+=l.largeOpen&&l.smallOpen?8:(l.largeOpen||l.smallOpen?4:0);
  total=Math.max(0,Math.min(100,total));
  return {score:total,label:total>=82?'Excellent time to visit':total>=70?'Good time to visit':total>=55?'Worth a visit':total>=40?'Mixed window':'Low-value window',confidence:[f.ok,w.ok,v.ok].filter(Boolean).length===3?'High':[f.ok,w.ok,v.ok].filter(Boolean).length===2?'Moderate':'Low',reasons:reasons.slice(0,4),salmon,vessel};
}
function bestFirstStop({visit,a,l,v}){
  if(a.fishLadderOpen&&visit.salmon.points>=18)return {name:'Fish Ladder Viewing Room',why:`${visit.salmon.detail}. Start with the migration while the viewing room is open.`,route:'fish'};
  if((l.largeOpen||l.smallOpen)&&v?.ok&&['ACTIVE','MODERATE'].includes(v.signal))return {name:'Lock walls',why:`${v.namedCount||v.count||0} trackable vessel${(v.namedCount||v.count||0)===1?' is':'s are'} in the nearby AIS picture. Check the map and lock walls first.`,route:'locks'};
  if(a.groundsOpen)return {name:'Visitor Center + lock walls',why:'Grounds are open. Get oriented, then use the vessel map and fish signal to choose the next stop.',route:'visitor'};
  return {name:'Plan the next open window',why:`Visitor grounds are currently closed; vessel traffic continues ${a.vesselTraffic}.`,route:'closed'};
}

async function build(now=new Date()){
  const p=pacificParts(now),a=access(p),l=locks(now);
  const [f,t,w,level,v]=await Promise.all([fish(p),tides(now),weather(),lakeLevel(),vessels()]);
  const visit=score({f,w,a,l,v});
  return {generatedAt:now.toISOString(),localTime:local(now),location:{name:'Hiram M. Chittenden Locks (Ballard Locks)',city:'Seattle',state:'WA',lat:LAT,lon:LON},visit:{...visit,bestFirstStop:bestFirstStop({visit,a,l,v})},fish:f,tides:t,weather:w,lakeLevel:level,vessels:v,access:a,locks:l,parking:parking(now),routes:[{minutes:20,label:'Locks essentials'},{minutes:45,label:'Full grounds'},{minutes:75,label:'Locks + Ballard'}]};
}

async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed');}
  try{const body=await build();res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=600');res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(JSON.stringify(body));}
  catch(e){res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'Ballard Locks data unavailable',detail:e.message}));}
}

module.exports=handler;
module.exports._test={pacificParts,seasonFor,parseSpecies,sanitizeVessel,haversineMiles,salmonSignal,vesselSignal,score,bestFirstStop,parking,build};
