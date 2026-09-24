const LAUNCHES='https://ll.thespacedevs.com/2.0.0/launch/upcoming/?limit=60';
const KSC='https://www.kennedyspacecenter.com/launches-and-events/';
const NWS='https://api.weather.gov';

function isSpaceCoast(launch){
  const name=String(launch?.pad?.location?.name||'').toLowerCase();
  const lat=Number(launch?.pad?.latitude),lon=Number(launch?.pad?.longitude);
  return name.includes('cape canaveral')||name.includes('kennedy space center')||(Number.isFinite(lat)&&Number.isFinite(lon)&&lat>27.9&&lat<29&&lon>-81&&lon<-80.3);
}
function isFutureLaunch(launch,now=Date.now()){
  const net=new Date(launch?.net).getTime();
  return Number.isFinite(net)&&net>now;
}
function scheduleConfidence(l){
  const status=String(l?.status?.name||'').toLowerCase();
  if(status==='go'&&!l.tbddate&&!l.tbdtime)return {level:'high',label:'Go / scheduled',detail:'Launch Library currently marks the mission Go with a specific date and time.'};
  if(status.includes('hold'))return {level:'hold',label:'Hold',detail:'The launch is currently shown on hold. Do not make a viewing decision from the prior time.'};
  if(l.tbddate)return {level:'low',label:'Date TBD',detail:'The date is still tentative. Treat this as planning context, not a trip commitment.'};
  if(l.tbdtime)return {level:'medium',label:'Time TBD',detail:'The date is listed but the launch time remains tentative.'};
  if(status==='tbd'||status==='tbc')return {level:'medium',label:String(l.status?.name||'Tentative'),detail:'The schedule is still provisional and can move.'};
  return {level:'medium',label:l?.status?.name||'Scheduled',detail:'Launch dates and times can change with little notice.'};
}
function maxWind(period){
  const values=String(period?.windSpeed||'').match(/\d+/g)?.map(Number).filter(Number.isFinite)||[];
  return values.length?Math.max(...values):null;
}
function weatherGrade(period){
  if(!period)return {level:'unknown',label:'Weather window unavailable',detail:'NWS hourly guidance does not yet cover the launch time.'};
  const text=String(period.shortForecast||'').trim();
  const lower=text.toLowerCase();
  const rawPop=period?.probabilityOfPrecipitation?.value;
  const pop=Number(rawPop);
  const wind=maxWind(period);
  const thunder=/thunder/.test(lower);
  const cloudBad=/overcast|cloudy|showers|thunder|rain/.test(lower);
  if(thunder){
    const precip=Number.isFinite(pop)?`; precipitation chance ${pop}%`:'';
    return {level:'poor',label:'Weather could limit viewing',detail:`${text||'Thunderstorms'}${precip}. This is a visibility read, not a launch-weather forecast.`};
  }
  if(!text||!Number.isFinite(pop)||!Number.isFinite(wind))return {level:'unknown',label:'Viewing weather evidence incomplete',detail:'The hourly forecast is missing precipitation, wind, or condition detail, so the tool will not grade the viewing window.'};
  if(pop>=50)return {level:'poor',label:'Weather could limit viewing',detail:`${text}; precipitation chance ${pop}%. This is a visibility read, not a launch-weather forecast.`};
  if(pop>=25||cloudBad||wind>=20)return {level:'mixed',label:'Mixed viewing weather',detail:`${text}; precipitation chance ${pop}%. Clouds or weather may reduce visibility.`};
  return {level:'good',label:'Viewing weather looks workable',detail:`${text}; precipitation chance ${pop}%. Launch operations can still scrub for other reasons.`};
}
async function nwsFor(lat,lon,when){
  const headers={'User-Agent':'ChrisIzworskiOutdoorTools/1.0 (chrisizworski.com)','Accept':'application/geo+json'};
  const p=await fetch(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`,{headers,signal:AbortSignal.timeout(10000)});
  if(!p.ok)throw new Error(`NWS points ${p.status}`);
  const point=await p.json();
  const url=point?.properties?.forecastHourly;
  if(!url)return null;
  const f=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});
  if(!f.ok)throw new Error(`NWS hourly ${f.status}`);
  const data=await f.json();
  const target=new Date(when).getTime();
  const periods=data?.properties?.periods||[];
  return periods.find(x=>target>=new Date(x.startTime).getTime()&&target<new Date(x.endTime).getTime())||null;
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{
    const response=await fetch(LAUNCHES,{headers:{'User-Agent':'ChrisIzworskiOutdoorTools/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`Launch Library ${response.status}`);
    const data=await response.json();
    const now=Date.now();
    const launches=(data.results||[]).filter(isSpaceCoast).filter(l=>isFutureLaunch(l,now)).sort((a,b)=>new Date(a.net)-new Date(b.net)).slice(0,8);
    const next=launches[0]||null;
    let weather=null;
    if(next){
      const lat=Number(next.pad?.latitude)||28.5619,lon=Number(next.pad?.longitude)||-80.5774;
      try{const period=await nwsFor(lat,lon,next.net);weather={period,assessment:weatherGrade(period)};}catch(error){weather={period:null,assessment:weatherGrade(null),error:String(error?.message||error)};}
    }
    const normalized=launches.map(l=>({id:l.id,name:l.name,net:l.net,windowStart:l.window_start,windowEnd:l.window_end,status:l.status?.name||null,tbdTime:Boolean(l.tbdtime),tbdDate:Boolean(l.tbddate),probability:l.probability??null,provider:l.launch_service_provider?.name||null,rocket:l.rocket?.configuration?.full_name||l.rocket?.configuration?.name||null,mission:l.mission?.name||null,pad:l.pad?.name||null,location:l.pad?.location?.name||null,lat:Number(l.pad?.latitude)||null,lon:Number(l.pad?.longitude)||null,scheduleConfidence:scheduleConfidence(l)}));
    res.status(200).json({ok:true,generatedAt:new Date().toISOString(),next:normalized[0]||null,upcoming:normalized,weather,nextDecision:normalized[0]?{schedule:normalized[0].scheduleConfidence,viewingWeather:weather?.assessment||weatherGrade(null)}:{schedule:{level:'none',label:'No future Space Coast launch found in current feed',detail:'Check the official Kennedy Space Center calendar for newly announced missions.'},viewingWeather:null},sources:[{name:'Launch Library 2',url:'https://ll.thespacedevs.com/'},{name:'Kennedy Space Center Visitor Complex',url:KSC,note:'Officially announced launch viewing opportunities'},{name:'National Weather Service',url:'https://www.weather.gov/mlb/',note:'Local viewing-weather guidance'}],limits:['Launch schedule confidence and viewing weather are separate signals.','A favorable visibility forecast does not mean the launch will occur.','Kennedy Space Center only publishes official publicly announced launch information; always confirm viewing access there before travel.']});
  }catch(error){
    res.status(502).json({ok:false,error:'Space Coast launch feed is temporarily unavailable.',detail:String(error?.message||error),official:KSC});
  }
};

module.exports._test={isSpaceCoast,isFutureLaunch,scheduleConfidence,weatherGrade,maxWind};
