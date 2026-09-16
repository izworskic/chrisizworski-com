const BIRDCAST_BASE='https://dashboard.birdcast.org/region/';
const TIGER_COUNTIES='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1';
const NWS_POINTS='https://api.weather.gov/points';
const EBIRD_BASE='https://api.ebird.org/v2';
const BIRDING_PROXY='https://michiganbirdingreport.com/api/observations';
const UA='ChrisIzworski-NationalTools/1.2 (+https://chrisizworski.com/national-tools/)';

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function clampCoord(v,min,max){const n=finite(v);return n!=null&&n>=min&&n<=max?n:null;}
function stateCode(v){const s=String(v||'').trim().toUpperCase();return /^[A-Z]{2}$/.test(s)?s:null;}
function cleanText(html=''){
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}
function numberFrom(s){const n=Number(String(s||'').replace(/,/g,''));return Number.isFinite(n)?n:null;}
function firstMatch(text,re,group=1){const m=text.match(re);return m?m[group]||null:null;}

function parseBirdCast(html,region){
  const text=cleanText(html);
  const unavailable=/Migration data are not available for this region on this night/i.test(text);
  const offSeason=/live data feed runs from March 1\s*(?:–|-)\s*June 15[\s\S]*August 1\s*(?:–|-)\s*November 15/i.test(text)&&unavailable;
  const birdsCrossedRaw=firstMatch(text,/([\d,]+)\s+Birds (?:have )?crossed(?: [^.]*)? (?:so far tonight|last night) \(est\.\)/i);
  const inFlightRaw=firstMatch(text,/([\d,]+)\s+Birds (?:now )?in flight \(est\.\)/i);
  const direction=firstMatch(text,/Direction:\s*([A-Z]{1,4})\s*\(([^)]+)\)/i,1);
  const directionName=firstMatch(text,/Direction:\s*([A-Z]{1,4})\s*\(([^)]+)\)/i,2);
  const speed=numberFrom(firstMatch(text,/Speed:\s*([\d,.]+)\s*mph/i));
  const altitude=numberFrom(firstMatch(text,/Altitude:\s*([\d,.]+)\s*ft/i));
  const recorded=firstMatch(text,/Recorded:\s*([^#]+?)(?=\s+(?:Not all birds|Here's what's|And so far|Expected nocturnal migrants|$))/i);
  const starting=firstMatch(text,/Starting:\s*([^#]+?)(?=\s+(?:Ending:|Learn more|Peak migration traffic|Live migration traffic|Not all birds|$))/i);
  const ending=firstMatch(text,/Ending:\s*([^#]+?)(?=\s+(?:Learn more|Peak migration traffic|Not all birds|$))/i);
  const live=/LIVE DATA FEED/i.test(text);
  const trafficAt=Math.max(0,text.search(/(?:Peak|Live) migration traffic/i));
  const high=/\bHigh\b/i.test(text.slice(trafficAt,trafficAt+450));
  let label=firstMatch(text,/Migration Dashboard\s+(?:Search regions\s+)?([^\d]{2,80}?)\s+(?:Tonight|Monday night|Tuesday night|Wednesday night|Thursday night|Friday night|Saturday night|Sunday night)/i);
  if(label)label=label.replace(/Search regions.*$/i,'').trim();
  return {region,regionLabel:label||null,available:!unavailable&&(birdsCrossedRaw!=null||inFlightRaw!=null),offSeason,live,high,birdsCrossed:numberFrom(birdsCrossedRaw),birdsInFlight:numberFrom(inFlightRaw),direction,directionName,speedMph:speed,altitudeFt:altitude,recorded:recorded?.trim()||null,starting:starting?.trim()||null,ending:ending?.trim()||null,sourceUrl:`${BIRDCAST_BASE}${encodeURIComponent(region)}`};
}

async function fetchJson(url,headers={}){
  const r=await fetch(url,{headers:{accept:'application/json',...headers},signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.json();
}
async function fetchText(url){
  const r=await fetch(url,{headers:{accept:'text/html','user-agent':UA},signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.text();
}

async function countyRegion(lat,lon,state){
  try{
    const p=new URLSearchParams({f:'json',where:'1=1',outFields:'STATE,COUNTY,GEOID,BASENAME,NAME',returnGeometry:'false',geometry:`${lon},${lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects'});
    const data=await fetchJson(`${TIGER_COUNTIES}/query?${p}`,{'user-agent':UA});
    const a=data?.features?.[0]?.attributes||{};
    const county=String(a.COUNTY||'').padStart(3,'0');
    if(/^\d{3}$/.test(county))return {region:`US-${state}-${county}`,countyName:String(a.BASENAME||a.NAME||'').trim()||null,countyFips:county};
  }catch{}
  return {region:`US-${state}`,countyName:null,countyFips:null};
}

async function birdCastFor(region,state){
  const attempts=[region];
  if(region!==`US-${state}`)attempts.push(`US-${state}`);
  let lastError=null;
  for(const candidate of attempts){
    try{
      const html=await fetchText(`${BIRDCAST_BASE}${encodeURIComponent(candidate)}`);
      const parsed=parseBirdCast(html,candidate);
      if(parsed.available||parsed.offSeason||candidate===attempts.at(-1))return parsed;
    }catch(e){lastError=e;}
  }
  if(lastError)throw lastError;
  return {region:`US-${state}`,available:false,offSeason:false,live:false,high:false,sourceUrl:`${BIRDCAST_BASE}${encodeURIComponent(`US-${state}`)}`};
}

function windNumber(v){const m=String(v||'').match(/\d+/);return m?Number(m[0]):null;}
function periodHour(p){const m=String(p?.startTime||'').match(/T(\d{2}):/);return m?Number(m[1]):null;}
function morningPeriods(periods=[]){const morning=periods.filter(p=>p?.isDaytime&&periodHour(p)!=null&&periodHour(p)>=5&&periodHour(p)<=11).slice(0,4);return morning.length?morning:periods.filter(p=>p?.isDaytime).slice(0,4);}
function weatherFit(periods=[]){
  if(!periods.length)return {rating:'unknown',maxPrecip:null,maxWindMph:null,summary:'Morning weather unavailable'};
  const precip=periods.map(p=>finite(p?.probabilityOfPrecipitation?.value)).filter(Number.isFinite);
  const winds=periods.map(p=>windNumber(p?.windSpeed)).filter(Number.isFinite);
  const maxPrecip=precip.length?Math.max(...precip):null;
  const maxWindMph=winds.length?Math.max(...winds):null;
  let rating='good';
  if((maxPrecip!=null&&maxPrecip>40)||(maxWindMph!=null&&maxWindMph>20))rating='poor';
  else if((maxPrecip!=null&&maxPrecip>20)||(maxWindMph!=null&&maxWindMph>15))rating='mixed';
  const summary=rating==='good'?'Morning field weather looks workable':rating==='mixed'?'Morning weather is usable but not ideal':'Rain or wind may limit morning field conditions';
  return {rating,maxPrecip,maxWindMph,summary};
}
async function nwsMorning(lat,lon){
  const point=await fetchJson(`${NWS_POINTS}/${lat.toFixed(3)},${lon.toFixed(3)}`,{'user-agent':UA});
  const url=point?.properties?.forecastHourly;
  if(!url)throw new Error('NWS hourly forecast URL unavailable');
  const hourly=await fetchJson(url,{'user-agent':UA,'accept':'application/geo+json, application/json'});
  const periods=morningPeriods(hourly?.properties?.periods||[]);
  return {periods:periods.map(p=>({startTime:p.startTime,temperature:p.temperature,temperatureUnit:p.temperatureUnit,windSpeed:p.windSpeed,windDirection:p.windDirection,precipitationProbability:finite(p?.probabilityOfPrecipitation?.value),shortForecast:p.shortForecast})),...weatherFit(periods)};
}

function summarizeEbird(observations=[]){
  const species=new Map();
  const locations=new Map();
  for(const o of observations){
    if(!o?.comName)continue;
    const speciesKey=o.speciesCode||o.comName;
    const current=species.get(speciesKey);
    if(!current||String(o.obsDt||'')>String(current.obsDt||''))species.set(speciesKey,{name:o.comName,sciName:o.sciName||null,speciesCode:o.speciesCode||null,obsDt:o.obsDt||null,location:o.locName||null,count:finite(o.howMany)});
    const locKey=o.locId||`${o.locName||''}:${o.lat||''}:${o.lng||''}`;
    if(!locKey)continue;
    if(!locations.has(locKey))locations.set(locKey,{locId:o.locId||null,name:o.locName||'Recent reporting location',lat:finite(o.lat),lon:finite(o.lng),species:new Set(),records:0,latest:o.obsDt||null});
    const loc=locations.get(locKey);loc.species.add(speciesKey);loc.records+=1;if(String(o.obsDt||'')>String(loc.latest||''))loc.latest=o.obsDt||null;
  }
  const recentSpecies=[...species.values()].sort((a,b)=>String(b.obsDt||'').localeCompare(String(a.obsDt||''))).slice(0,8);
  const topLocations=[...locations.values()].map(l=>({...l,speciesCount:l.species.size,species:undefined})).sort((a,b)=>b.speciesCount-a.speciesCount||b.records-a.records).slice(0,5);
  return {speciesCount:species.size,observationCount:observations.length,recentSpecies,topLocations};
}

async function ebirdLocal(region){
  const token=process.env.EBIRD_API_TOKEN;
  let directError=null;
  if(token){
    try{
      const url=`${EBIRD_BASE}/data/obs/${encodeURIComponent(region)}/recent?back=3&maxResults=300`;
      const observations=await fetchJson(url,{'x-ebirdapitoken':token,'user-agent':UA});
      return {available:true,region,windowDays:3,sourceMode:'direct-ebird',observationSemantics:'recent-observations',...summarizeEbird(Array.isArray(observations)?observations:[]),sourceUrl:`https://ebird.org/region/${encodeURIComponent(region)}`};
    }catch(error){directError=error;}
  }
  try{
    const params=new URLSearchParams({region,back:'3',max:'200'});
    const proxied=await fetchJson(`${BIRDING_PROXY}?${params}`,{'user-agent':UA});
    const observations=Array.isArray(proxied?.observations)?proxied.observations:[];
    return {available:true,region,windowDays:Number(proxied?.back)||3,sourceMode:'michigan-birding-report',observationSemantics:'deduped-species-records',...summarizeEbird(observations),sourceUrl:`https://ebird.org/region/${encodeURIComponent(region)}`,viaUrl:BIRDING_PROXY};
  }catch(error){
    return {available:false,reason:'temporarily-unavailable',region,speciesCount:null,observationCount:null,recentSpecies:[],topLocations:[],detail:String((directError||error)?.message||directError||error)};
  }
}

function decision(bird,weather,local={}){
  if(bird.offSeason)return {level:'off-season',headline:'BirdCast live migration feed is off-season.',detail:local.available&&local.speciesCount?`Migration radar is paused, but ${local.speciesCount} species have recent eBird records in the selected region.`:'Use recent local observations year-round and return during spring or fall for live migration radar.'};
  if(!bird.available)return {level:'unknown',headline:'Live migration evidence is unavailable for this region.',detail:local.available&&local.speciesCount?`${local.speciesCount} species still have recent local eBird records. No radar migration amount is being inferred.`:'No migration amount is being inferred.'};
  const activeLocal=local.available&&Number(local.speciesCount)>=20;
  if(bird.high&&weather.rating==='good'&&activeLocal)return {level:'strong',headline:'Strong migration, workable weather, and active local reporting.',detail:`BirdCast marks the movement high and ${local.speciesCount} species have recent local records from the past 3 days. Start with the active locations below.`};
  if(bird.high&&weather.rating==='good')return {level:'strong',headline:'Strong migration signal with workable morning weather.',detail:'That combination is worth a local habitat check this morning, but radar does not guarantee birds at a specific site.'};
  if(bird.high&&weather.rating==='poor')return {level:'weather-limited',headline:'Strong migration signal, but morning weather may limit field conditions.',detail:'Bird movement was strong; rain or wind may make viewing less productive or comfortable.'};
  if(bird.high)return {level:'strong',headline:'BirdCast marks the migration signal as high.',detail:activeLocal?`${local.speciesCount} species also have recent local records. Use the active-location list to decide where to start.`:'Use local habitat and the morning weather panel before deciding where to go.'};
  if(weather.rating==='good')return {level:'workable',headline:'Migration was detected and morning weather looks workable.',detail:activeLocal?`${local.speciesCount} species have recent local records even though BirdCast is not labeling the migration high.`:'The radar signal is real, but this page does not label it high unless BirdCast does.'};
  return {level:'mixed',headline:'Migration was detected, with mixed morning field conditions.',detail:activeLocal?`Local reporting is still active with ${local.speciesCount} species represented in recent records.`:'Check the reported movement and weather separately before choosing a site.'};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{
    const lat=clampCoord(req.query?.lat,-90,90),lon=clampCoord(req.query?.lon,-180,180),state=stateCode(req.query?.state);
    if(lat==null||lon==null||!state)return res.status(400).json({ok:false,error:'lat, lon and two-letter state are required'});
    const area=await countyRegion(lat,lon,state);
    const [birdResult,weatherResult,ebirdResult]=await Promise.allSettled([birdCastFor(area.region,state),nwsMorning(lat,lon),ebirdLocal(area.region)]);
    if(birdResult.status!=='fulfilled')throw birdResult.reason;
    const bird=birdResult.value;
    const weather=weatherResult.status==='fulfilled'?weatherResult.value:{rating:'unknown',maxPrecip:null,maxWindMph:null,summary:'NWS morning weather unavailable',periods:[]};
    const local=ebirdResult.status==='fulfilled'?ebirdResult.value:{available:false,reason:'temporarily-unavailable',region:area.region,recentSpecies:[],topLocations:[]};
    return res.status(200).json({ok:true,generatedAt:new Date().toISOString(),area,birdcast:bird,weather,localBirds:local,decision:decision(bird,weather,local),sources:{birdcast:{name:'BirdCast Migration Dashboard · Cornell Lab of Ornithology',url:bird.sourceUrl},weather:{name:'National Weather Service',url:'https://www.weather.gov/'},geography:{name:'U.S. Census Bureau TIGERweb',url:'https://tigerweb.geo.census.gov/'},ebird:{name:'eBird · Cornell Lab of Ornithology',url:local.sourceUrl||'https://ebird.org/explore',via:local.sourceMode==='michigan-birding-report'?'Michigan Birding Report server-side API':null}}});
  }catch(error){return res.status(502).json({ok:false,error:'Bird migration morning data are temporarily unavailable.',detail:String(error?.message||error)});}
};

module.exports._test={cleanText,parseBirdCast,weatherFit,decision,periodHour,morningPeriods,summarizeEbird};
