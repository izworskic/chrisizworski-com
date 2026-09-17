const ROAD_URL='https://www.nps.gov/romo/planyourvisit/road_status.htm';
const NWS='https://api.weather.gov';
const ALPINE={lat:40.441031,lon:-105.754520,elevationFt:11796,name:'Alpine Visitor Center'};

function textify(html=''){
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ').trim();
}
function roadStatus(text){
  const t=String(text);
  const roadLead='Trail Ridge Road(?:\\s*\\([^)]*\\))?\\s+is\\s+';
  const open=new RegExp(`${roadLead}Open to Through Travel`,'i').test(t);
  const closedSeason=new RegExp(`${roadLead}Closed for the Season`,'i').test(t);
  const closed=new RegExp(`${roadLead}(?:Closed|Not Open) to Through Travel`,'i').test(t);
  const unknown=!open&&!closedSeason&&!closed;
  let label='Status not parsed from current NPS page',level='unknown';
  if(open){label='Open to through travel';level='open';}
  if(closedSeason){label='Closed for the season';level='closed';}
  else if(closed){label='Closed to through travel';level='closed';}
  const timed=t.match(/Timed Entry Reservations? (?:are|is) required[^.]*\./i)?.[0]||null;
  const statusLine=t.match(/For updates, call the recorded Trail Ridge Road Status Line[^.]*\./i)?.[0]||null;
  return {level,label,timedEntry:timed,statusLine,sourceTextMatched:!unknown};
}
function maxWind(period){
  const nums=String(period?.windSpeed||'').match(/\d+/g)?.map(Number)||[];
  return nums.length?Math.max(...nums):0;
}
function weatherAssessment(periods,alerts){
  const slice=(periods||[]).slice(0,12);
  const alertNames=(alerts||[]).map(a=>a?.properties?.event).filter(Boolean);
  const warning=alertNames.some(x=>/warning/i.test(x));
  const watch=alertNames.some(x=>/watch|advisory/i.test(x));
  const severe=slice.some(p=>/snow|freezing|thunder|ice|blizzard/i.test(`${p.shortForecast||''} ${p.detailedForecast||''}`)||maxWind(p)>=40);
  const caution=slice.some(p=>Number(p?.probabilityOfPrecipitation?.value||0)>=30||maxWind(p)>=25||Number(p?.temperature)<=35);
  if(warning||severe)return {level:'high',label:'High-alpine weather may disrupt travel',detail:'NWS guidance includes a warning-level signal, wintry/thunder weather, or very strong wind in the next 12 hours. Official NPS road status remains the controlling source.',alerts:alertNames};
  if(watch||caution)return {level:'caution',label:'Use extra caution in the alpine zone',detail:'The next 12 hours include colder, wetter, or windier periods that can change road conditions quickly. Check NPS status again before climbing.',alerts:alertNames};
  return {level:'workable',label:'No major high-alpine weather signal in the next 12 hours',detail:'NWS hourly guidance looks comparatively workable, but mountain conditions can change faster than the forecast and the NPS road status controls.',alerts:alertNames};
}
async function nws(){
  const headers={'User-Agent':'ChrisIzworskiOutdoorTools/1.0 (chrisizworski.com)','Accept':'application/geo+json'};
  const pointRes=await fetch(`${NWS}/points/${ALPINE.lat},${ALPINE.lon}`,{headers,signal:AbortSignal.timeout(10000)});
  if(!pointRes.ok)throw new Error(`NWS points ${pointRes.status}`);
  const point=await pointRes.json();
  const hourlyUrl=point?.properties?.forecastHourly;
  const [hourlyRes,alertsRes]=await Promise.all([
    fetch(hourlyUrl,{headers,signal:AbortSignal.timeout(10000)}),
    fetch(`${NWS}/alerts/active?point=${ALPINE.lat},${ALPINE.lon}`,{headers,signal:AbortSignal.timeout(10000)})
  ]);
  if(!hourlyRes.ok)throw new Error(`NWS hourly ${hourlyRes.status}`);
  const hourly=await hourlyRes.json();
  const alerts=alertsRes.ok?await alertsRes.json():{features:[]};
  const periods=(hourly?.properties?.periods||[]).slice(0,12);
  return {periods,alerts:alerts.features||[],assessment:weatherAssessment(periods,alerts.features||[])};
}

module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=900');
  try{
    const npsRes=await fetch(ROAD_URL,{headers:{'User-Agent':'ChrisIzworskiOutdoorTools/1.0 (chrisizworski.com)','Accept':'text/html'},signal:AbortSignal.timeout(12000)});
    if(!npsRes.ok)throw new Error(`NPS road status ${npsRes.status}`);
    const html=await npsRes.text();
    const status=roadStatus(textify(html));
    let weather=null;
    try{weather=await nws();}catch(error){weather={periods:[],alerts:[],assessment:{level:'unknown',label:'Alpine weather temporarily unavailable',detail:'Use the official NPS road status and NWS forecast before travel.'},error:String(error?.message||error)};}
    res.status(200).json({ok:true,generatedAt:new Date().toISOString(),road:status,alpine:{...ALPINE,weather},sources:[{name:'Rocky Mountain National Park - Park Roads',url:ROAD_URL,role:'Official current road status'},{name:'National Weather Service',url:'https://www.weather.gov/bou/',role:'Hourly alpine weather and alerts'}],limits:['NPS road status is authoritative; the weather assessment never overrides it.','Temporary closures can happen faster than this page refreshes.','Weather at 11,796 feet can differ sharply from Estes Park and Grand Lake.']});
  }catch(error){
    res.status(502).json({ok:false,error:'Trail Ridge Road status is temporarily unavailable.',detail:String(error?.message||error),source:ROAD_URL});
  }
};

module.exports._test={textify,roadStatus,weatherAssessment,maxWind};
