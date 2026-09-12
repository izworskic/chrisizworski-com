const THUNDER={lat:44.321011,lon:-68.189330,tz:'America/New_York'};
const BAR_HARBOR='8413320';
const NDBC='44034';
const MODEL_VERSION='thunder-model-v1';
const COOPS='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NWS='https://api.weather.gov';
const NDBC_URL=`https://www.ndbc.noaa.gov/data/realtime2/${NDBC}.txt`;
const NPS_ALERTS='https://developer.nps.gov/api/v1/alerts?parkCode=acad&limit=50';

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const round=(n,d=0)=>n==null?null:Number(n.toFixed(d));
const isoMinute=s=>s?new Date(String(s).replace(' ','T')+'Z'):null;
const ageMinutes=d=>d instanceof Date&&!Number.isNaN(d)?Math.max(0,(Date.now()-d.getTime())/60000):null;
const circular=(a,b)=>{let d=Math.abs(a-b)%360;return d>180?360-d:d};

function tideFit(minutesToHigh){
  if(!Number.isFinite(minutesToHigh))return null;
  if(minutesToHigh>240||minutesToHigh<-150)return 5;
  const peak=-90;
  const sigma=72;
  return clamp(100*Math.exp(-0.5*Math.pow((minutesToHigh-peak)/sigma,2)));
}
function waveForcing(heightM,periodS){
  if(!Number.isFinite(heightM)||!Number.isFinite(periodS))return null;
  const energy=Math.max(0,heightM*heightM*periodS);
  return clamp(((energy-1.5)/34)*100);
}
function directionFit(deg){
  if(!Number.isFinite(deg))return null;
  // Provisional broad ESE exposure fit. NPS preserves an 1867 description that
  // the favorable wind should be "south of east"; this is intentionally broad.
  const d=circular(deg,120);
  return clamp(20+80*Math.exp(-0.5*Math.pow(d/55,2)));
}
function waterLevelContext(residualFt){
  if(!Number.isFinite(residualFt))return null;
  return clamp(50+residualFt*28);
}
function windContext(speedMs,directionDeg){
  if(!Number.isFinite(speedMs))return null;
  const speed=clamp((speedMs/12)*100);
  if(!Number.isFinite(directionDeg))return 35+speed*0.35;
  const fit=directionFit(directionDeg);
  return clamp(0.55*fit+0.45*speed);
}
function band(score){
  if(score==null)return 'Unavailable';
  if(score<20)return 'Quiet';if(score<40)return 'Limited';if(score<60)return 'Fair';
  if(score<75)return 'Good';if(score<90)return 'Strong';return 'Exceptional';
}
function computePotential(input={}){
  const parts={
    tide:tideFit(input.minutesToHigh),
    waves:waveForcing(input.waveHeightM,input.wavePeriodS),
    direction:directionFit(input.waveDirectionDeg),
    water:waterLevelContext(input.waterResidualFt),
    wind:windContext(input.windSpeedMs,input.windDirectionDeg)
  };
  if(parts.tide==null||parts.waves==null)return {score:null,band:'Unavailable',components:parts};
  const weights={tide:35,waves:35,direction:15,water:10,wind:5};
  let total=0,denom=0;
  for(const [key,w] of Object.entries(weights)){
    if(parts[key]!=null){total+=parts[key]*w;denom+=w;}
  }
  const score=denom?Math.round(total/denom):null;
  return {score,band:band(score),components:Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,round(v)]))};
}
function confidence({waveAgeMin,waveDirectionDeg,waterAgeMin,forecastHorizonHours=0,npsVerified=true,hasForecastWave=true}={}){
  let score=100;
  if(waveAgeMin==null)score-=45;else if(waveAgeMin>180)score-=40;else if(waveAgeMin>90)score-=22;else if(waveAgeMin>45)score-=8;
  if(!Number.isFinite(waveDirectionDeg))score-=12;
  if(waterAgeMin==null)score-=10;else if(waterAgeMin>90)score-=10;
  if(forecastHorizonHours>6&&!hasForecastWave)score-=30;
  if(forecastHorizonHours>36)score-=15;else if(forecastHorizonHours>18)score-=8;
  if(!npsVerified)score-=8;
  score=clamp(score);
  return {score:Math.round(score),label:score>=80?'High':score>=60?'Moderate':score>=35?'Low':'Insufficient'};
}
function classifySafety({npsAlerts=[],nwsAlerts=[],npsVerified=false}={}){
  const npsText=npsAlerts.map(a=>`${a.category||''} ${a.title||''} ${a.description||''}`).join(' ').toLowerCase();
  const relevant=/thunder hole|ocean path|park loop road|sand beach/.test(npsText);
  const closed=relevant&&/closure|closed|do not enter|prohibited/.test(npsText);
  if(closed)return {status:'CLOSED',reason:'An official Acadia alert indicates a relevant closure. Follow NPS directions.'};
  const hazard=nwsAlerts.find(a=>/high surf|hurricane|tropical storm|coastal flood|storm warning|gale warning/.test(String(a.event||'').toLowerCase()));
  if(hazard)return {status:'HAZARDOUS CONDITIONS',reason:`${hazard.event||'Hazardous coastal weather'} is active. Keep well back from surf and obey NPS closures.`};
  return {status:npsVerified?'OPEN / VERIFY ONSITE':'ACCESS NOT VERIFIED',reason:npsVerified?'No relevant NPS closure was returned by the alerts feed. Posted signs remain authoritative.':'NPS alert status could not be verified automatically. Check posted signs and current NPS conditions.'};
}
function visitStatus({potential,safety,minutesToBest=0}={}){
  if(safety?.status==='CLOSED'||safety?.status==='HAZARDOUS CONDITIONS')return safety.status;
  if(potential==null)return 'INSUFFICIENT DATA';
  if(minutesToBest>45&&potential<75)return 'GOOD WINDOW APPROACHING';
  if(potential>=70)return 'GO NOW';
  if(potential>=50)return 'WAIT';
  return 'BETTER LATER';
}
function explanation(potential,components,minutesToHigh){
  if(potential==null)return 'Live tide and wave observations are both required before the model will issue a Thunder Potential score.';
  const bits=[];
  if(components.tide>=70)bits.push('the tide is in the preferred pre-high window');
  else if(minutesToHigh>0)bits.push('the preferred tidal stage is still ahead');
  else bits.push('the best tidal stage has passed');
  if(components.waves>=70)bits.push('offshore wave energy is strong');
  else if(components.waves<40)bits.push('offshore wave energy is limiting the effect');
  else bits.push('offshore wave energy is moderate');
  if(components.direction!=null&&components.direction>=70)bits.push('wave direction is favorable');
  return bits.length?bits[0][0].toUpperCase()+bits[0].slice(1)+(bits.length>1?', '+bits.slice(1).join(', '):'')+'.':'Current tide and wave conditions are mixed.';
}

async function getJson(url,headers={}){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'ThunderHoleLive/1.0 (https://chrisizworski.com/national-tools/thunder-hole-live/)',...headers},signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.json();
}
async function getText(url){
  const r=await fetch(url,{headers:{accept:'text/plain','user-agent':'ThunderHoleLive/1.0 (https://chrisizworski.com/national-tools/thunder-hole-live/)'},signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw new Error(`${new URL(url).hostname} returned ${r.status}`);return r.text();
}
function ymd(d){return d.toISOString().slice(0,10).replaceAll('-','')}
function coopsUrl(product,params={}){
  const q=new URLSearchParams({product,application:'ThunderHoleLive',station:BAR_HARBOR,time_zone:'gmt',units:'english',format:'json',...params});
  return `${COOPS}?${q}`;
}
function parseNdbc(text){
  const lines=String(text||'').split(/\r?\n/).filter(Boolean);
  const head=lines.find(l=>l.startsWith('#YY'))?.replace(/^#/,'').trim().split(/\s+/)||[];
  const rows=lines.filter(l=>/^\d{4}\s+\d{2}\s+\d{2}/.test(l));
  const parsed=rows.map(line=>{const vals=line.trim().split(/\s+/);const o={};head.forEach((h,i)=>o[h]=vals[i]);const d=new Date(Date.UTC(+o.YY,+o.MM-1,+o.DD,+o.hh,+o.mm));return {...o,date:d};});
  const wave=parsed.find(o=>o.WVHT&&o.WVHT!=='MM'&&o.DPD&&o.DPD!=='MM')||null;
  const wind=parsed.find(o=>o.WSPD&&o.WSPD!=='MM')||null;
  return {wave:wave?{observedAt:wave.date.toISOString(),heightM:num(wave.WVHT),periodS:num(wave.DPD),directionDeg:num(wave.MWD),ageMin:ageMinutes(wave.date)}:null,wind:wind?{observedAt:wind.date.toISOString(),speedMs:num(wind.WSPD),directionDeg:num(wind.WDIR),gustMs:num(wind.GST),ageMin:ageMinutes(wind.date)}:null};
}
function parseHilo(json){return (json?.predictions||[]).map(x=>({time:isoMinute(x.t)?.toISOString()||null,type:x.type,heightFt:num(x.v)})).filter(x=>x.time)}
function nearestContinuous(json,when=new Date()){
  const rows=(json?.predictions||[]).map(x=>({date:isoMinute(x.t),heightFt:num(x.v)})).filter(x=>x.date&&x.heightFt!=null);
  return rows.sort((a,b)=>Math.abs(a.date-when)-Math.abs(b.date-when))[0]||null;
}
function nextHigh(hilo,when=new Date()){
  return hilo.map(x=>({...x,date:new Date(x.time)})).filter(x=>x.type==='H'&&x.date>=when).sort((a,b)=>a.date-b.date)[0]||null;
}
function parseNwsAlert(f={}){const p=f.properties||{};return {event:p.event||null,severity:p.severity||null,headline:p.headline||null,effective:p.effective||null,expires:p.expires||null};}
function gridSeries(prop){
  const unit=prop?.uom||prop?.unitCode||null;
  return (prop?.values||[]).map(v=>({time:new Date(String(v.validTime||'').split('/')[0]),value:num(v.value),unit})).filter(v=>!Number.isNaN(v.time)&&v.value!=null);
}
function sampleSeries(series,time){if(!series?.length)return null;return series.reduce((best,x)=>Math.abs(x.time-time)<Math.abs(best.time-time)?x:best,series[0]);}
function normalizeMeters(value,unit){if(value==null)return null;const u=String(unit||'').toLowerCase();if(u.includes('ft'))return value*0.3048;return value;}

async function loadNws(){
  const point=await getJson(`${NWS}/points/${THUNDER.lat.toFixed(4)},${THUNDER.lon.toFixed(4)}`);
  const p=point.properties||{};
  const [hourly,alerts]=await Promise.all([
    p.forecastHourly?getJson(p.forecastHourly).catch(()=>null):null,
    getJson(`${NWS}/alerts/active?point=${THUNDER.lat.toFixed(4)},${THUNDER.lon.toFixed(4)}`).catch(()=>({features:[]}))
  ]);
  let marine=null;
  try{
    const mpoint=await getJson(`${NWS}/points/44.3000,-68.1500`);
    if(mpoint?.properties?.forecastGridData)marine=await getJson(mpoint.properties.forecastGridData);
  }catch{}
  return {hourly:(hourly?.properties?.periods||[]).slice(0,72),alerts:(alerts.features||[]).map(parseNwsAlert),marine};
}
async function loadNps(){
  const key=process.env.NPS_API_KEY;
  if(!key)return {verified:false,alerts:[],note:'NPS_API_KEY is not configured; access is not automatically verified.'};
  try{const j=await getJson(NPS_ALERTS,{'x-api-key':key});return {verified:true,alerts:(j.data||[]).map(a=>({category:a.category||null,title:a.title||null,description:a.description||null,url:a.url||null})),note:null};}
  catch(e){return {verified:false,alerts:[],note:String(e.message||e)};}
}
function marineAt(marine,time){
  if(!marine)return null;
  const p=marine.properties||{};
  const height=sampleSeries(gridSeries(p.waveHeight||p.primarySwellHeight),time);
  const period=sampleSeries(gridSeries(p.wavePeriod||p.primarySwellPeriod),time);
  const dir=sampleSeries(gridSeries(p.primarySwellDirection),time);
  if(!height||!period)return null;
  return {heightM:normalizeMeters(height.value,height.unit),periodS:period.value,directionDeg:dir?.value??null};
}
function candidateWindows({hilo,marine,currentWave,waterResidualFt,currentWind,npsVerified}){
  const now=new Date();const highs=hilo.filter(x=>x.type==='H').map(x=>new Date(x.time)).filter(d=>d>new Date(now-3*3600000)&&d<new Date(now.getTime()+72*3600000));
  const out=[];
  for(const high of highs){
    let best=null;
    for(const offset of [-150,-120,-90,-60,-30,0]){
      const t=new Date(high.getTime()+offset*60000);const horizon=(t-now)/3600000;
      if(horizon<-2)continue;
      let w=horizon<=2&&currentWave?currentWave:marineAt(marine,t);
      if(!w)continue;
      const model=computePotential({minutesToHigh:offset,waveHeightM:w.heightM,wavePeriodS:w.periodS,waveDirectionDeg:w.directionDeg,waterResidualFt,windSpeedMs:currentWind?.speedMs,windDirectionDeg:currentWind?.directionDeg});
      const conf=confidence({waveAgeMin:horizon<=2?currentWave?.ageMin:null,waveDirectionDeg:w.directionDeg,waterAgeMin:null,forecastHorizonHours:Math.max(0,horizon),npsVerified,hasForecastWave:!!marineAt(marine,t)});
      const row={time:t.toISOString(),highTide:high.toISOString(),score:model.score,band:model.band,confidence:conf.label,components:model.components};
      if(model.score!=null&&(!best||model.score>best.score))best=row;
    }
    if(best)out.push(best);
  }
  return out.sort((a,b)=>new Date(a.time)-new Date(b.time)).slice(0,6);
}

module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}
  const now=new Date();const end=new Date(now.getTime()+4*86400000);const begin=new Date(now.getTime()-86400000);
  const sources={};
  const tasks=await Promise.allSettled([
    getJson(coopsUrl('predictions',{begin_date:ymd(begin),end_date:ymd(end),datum:'MLLW',interval:'hilo'})),
    getJson(coopsUrl('predictions',{begin_date:ymd(begin),end_date:ymd(end),datum:'MLLW',interval:'6'})),
    getJson(coopsUrl('water_level',{date:'latest',datum:'MLLW'})),
    getText(NDBC_URL),loadNws(),loadNps()
  ]);
  const [hiloR,contR,waterR,ndbcR,nwsR,npsR]=tasks;
  const hilo=hiloR.status==='fulfilled'?parseHilo(hiloR.value):[];
  const currentPred=contR.status==='fulfilled'?nearestContinuous(contR.value,now):null;
  const waterRaw=waterR.status==='fulfilled'?(waterR.value?.data||[])[0]:null;
  const waterDate=waterRaw?.t?isoMinute(waterRaw.t):null;
  const waterObservedFt=num(waterRaw?.v);
  const residual=waterObservedFt!=null&&currentPred?.heightFt!=null?waterObservedFt-currentPred.heightFt:null;
  const ndbc=ndbcR.status==='fulfilled'?parseNdbc(ndbcR.value):{wave:null,wind:null};
  const nws=nwsR.status==='fulfilled'?nwsR.value:{hourly:[],alerts:[],marine:null};
  const nps=npsR.status==='fulfilled'?npsR.value:{verified:false,alerts:[],note:'NPS status unavailable'};
  const high=nextHigh(hilo,now);const minutesToHigh=high?Math.round((high.date-now)/60000):null;
  const current=computePotential({minutesToHigh,waveHeightM:ndbc.wave?.heightM,wavePeriodS:ndbc.wave?.periodS,waveDirectionDeg:ndbc.wave?.directionDeg,waterResidualFt:residual,windSpeedMs:ndbc.wind?.speedMs,windDirectionDeg:ndbc.wind?.directionDeg});
  const safety=classifySafety({npsAlerts:nps.alerts,nwsAlerts:nws.alerts,npsVerified:nps.verified});
  const windows=candidateWindows({hilo,marine:nws.marine,currentWave:ndbc.wave,waterResidualFt:residual,currentWind:ndbc.wind,npsVerified:nps.verified});
  const nextBest=windows.filter(w=>new Date(w.time)>=now).sort((a,b)=>(b.score||0)-(a.score||0))[0]||null;
  const minutesToBest=nextBest?Math.round((new Date(nextBest.time)-now)/60000):0;
  const conf=confidence({waveAgeMin:ndbc.wave?.ageMin,waveDirectionDeg:ndbc.wave?.directionDeg,waterAgeMin:ageMinutes(waterDate),forecastHorizonHours:0,npsVerified:nps.verified,hasForecastWave:!!nws.marine});
  const visit=visitStatus({potential:current.score,safety,minutesToBest});
  sources.tide={name:'NOAA CO-OPS Bar Harbor',station:BAR_HARBOR,status:hilo.length?'ok':'unavailable',observed_at:waterDate?.toISOString()||null};
  sources.waves={name:'NDBC Eastern Maine Shelf',station:NDBC,status:ndbc.wave?'ok':'unavailable',observed_at:ndbc.wave?.observedAt||null};
  sources.weather={name:'National Weather Service',status:nwsR.status==='fulfilled'?'ok':'unavailable'};
  sources.park={name:'National Park Service Acadia alerts',status:nps.verified?'ok':'unverified'};
  const body={
    location:{name:'Thunder Hole, Acadia National Park, Maine',latitude:THUNDER.lat,longitude:THUNDER.lon,timezone:THUNDER.tz},
    retrieved_at:new Date().toISOString(),model_version:MODEL_VERSION,
    decision:{thunder_potential:current.score,band:current.band,visit_status:visit,confidence:conf.label,confidence_score:conf.score,explanation:explanation(current.score,current.components,minutesToHigh),safety},
    tide:{station:BAR_HARBOR,next_high_time:high?.time||null,next_high_height_ft:high?.heightFt??null,minutes_to_high:minutesToHigh,observed_level_ft:waterObservedFt,predicted_level_ft:currentPred?.heightFt??null,residual_ft:round(residual,2)},
    waves:ndbc.wave?{station:NDBC,height_m:ndbc.wave.heightM,height_ft:round(ndbc.wave.heightM*3.28084,1),dominant_period_s:ndbc.wave.periodS,direction_deg:ndbc.wave.directionDeg,observed_at:ndbc.wave.observedAt,age_minutes:round(ndbc.wave.ageMin)}:null,
    wind:ndbc.wind?{speed_m_s:ndbc.wind.speedMs,speed_mph:round(ndbc.wind.speedMs*2.23694),direction_deg:ndbc.wind.directionDeg,gust_mph:ndbc.wind.gustMs==null?null:round(ndbc.wind.gustMs*2.23694),observed_at:ndbc.wind.observedAt}:null,
    components:current.components,upcoming_windows:windows,
    weather:{hourly:nws.hourly.slice(0,12).map(p=>({time:p.startTime,temp_f:p.temperature,wind:p.windSpeed,wind_direction:p.windDirection,forecast:p.shortForecast,precip_probability:p.probabilityOfPrecipitation?.value??null})),alerts:nws.alerts},
    access:{verified:nps.verified,alerts:nps.alerts,note:nps.note,official_conditions_url:'https://www.nps.gov/acad/planyourvisit/conditions.htm'},
    sources,
    methodology:{score_is_probability:false,nps_timing_prior:'NPS recommends 1–2 hours before high tide for the best chance of hearing Thunder Hole roar.',direction_note:'Directional fit is deliberately broad and provisional; NPS preserves a historical description favoring wind south of east.',safety_note:'Thunder Potential describes physical spectacle conditions. Visit Status independently gates closures and hazards.'}
  };
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).json(body);
};

module.exports._test={tideFit,waveForcing,directionFit,waterLevelContext,windContext,computePotential,confidence,classifySafety,visitStatus,parseNdbc,band,explanation};
