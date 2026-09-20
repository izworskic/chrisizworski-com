const GT='https://www.geysertimes.org/api/v5/predictions_latest/old+faithful;castle;daisy;grand;riverside;great+fountain?iso=1';
const NPS='https://www.nps.gov/yell/planyourvisit/geyser-activity.htm';
const GEYSERS=['Old Faithful','Castle','Daisy','Grand','Riverside','Great Fountain'];

function millis(value){
  if(value==null||value==='')return NaN;
  if(typeof value==='number')return value<1e12?value*1000:value;
  if(/^\d+(?:\.\d+)?$/.test(String(value))) {const n=Number(value);return n<1e12?n*1000:n;}
  return new Date(value).getTime();
}
function iso(value){const m=millis(value);return Number.isFinite(m)?new Date(m).toISOString():null;}
function officialScore(p){
  const source=`${p?.userName||''} ${p?.comment||''}`;
  return /national park service|\bnps\b|yellowstone/i.test(source)?2:/geysertimes/i.test(source)?1:0;
}
function normalize(p){
  return {geyserID:p.geyserID??null,geyserName:p.geyserName||null,userID:p.userID??null,source:p.userName||'GeyserTimes contributor',prediction:iso(p.prediction),windowOpen:iso(p.windowOpen),windowClose:iso(p.windowClose),expiration:iso(p.expiration),timestamp:iso(p.timestamp),lastReportTime:iso(p.lastReportTime),forecastNumber:Number(p.eruptionForecastNumber||1),probability:p.probability??null,method:p.method||null,comment:p.comment||null,sourcePriority:officialScore(p)};
}
function selectCurrent(predictions,now=Date.now()){
  const by=new Map();
  for(const p of predictions.map(normalize)){
    if(!p.geyserName)continue;
    const predicted=millis(p.prediction);
    const open=millis(p.windowOpen);
    const close=millis(p.windowClose);
    const expiration=millis(p.expiration);
    const usableWindow=Number.isFinite(predicted)&&Number.isFinite(open)&&Number.isFinite(close)&&open<=predicted&&predicted<=close;
    if(!usableWindow)continue;
    if(open>close||close<now-5*60*1000)continue;
    if(Number.isFinite(expiration)&&expiration<now)continue;
    if(p.forecastNumber>1)continue;
    const key=p.geyserName.toLowerCase();
    const cur=by.get(key);
    if(!cur||p.sourcePriority>cur.sourcePriority||(p.sourcePriority===cur.sourcePriority&&millis(p.timestamp)>millis(cur.timestamp)))by.set(key,p);
  }
  return GEYSERS.map(name=>by.get(name.toLowerCase())||{geyserName:name,available:false}).map(p=>p.available===false?p:{...p,available:true});
}
function soonest(items,now=Date.now()){
  return items.filter(x=>x.available).map(x=>({...x,_t:millis(x.windowOpen||x.prediction)})).filter(x=>Number.isFinite(x._t)&&millis(x.windowClose||x.prediction)>=now-5*60*1000).sort((a,b)=>a._t-b._t)[0]||null;
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=65, stale-while-revalidate=180');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{
    const response=await fetch(GT,{headers:{'User-Agent':'ChrisIzworskiOutdoorTools/1.0 (chrisizworski.com)','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`GeyserTimes ${response.status}`);
    const data=await response.json();
    if(data.status&&String(data.status).toLowerCase()!=='success')throw new Error(`GeyserTimes status ${data.status}`);
    const raw=Array.isArray(data.predictions)?data.predictions:[];
    const predictions=selectCurrent(raw);
    const next=soonest(predictions);
    res.status(200).json({ok:true,generatedAt:new Date().toISOString(),next:next?Object.fromEntries(Object.entries(next).filter(([k])=>k!=='_t')):null,predictions,source:{name:'GeyserTimes',url:'https://geysertimes.org/',api:GT,attribution:'Contains information from GeyserTimes, which is made available under the Open Database License (ODbL).'},nps:{name:'Yellowstone National Park - Current Geyser Activity',url:NPS,note:'Yellowstone NPS directs visitors to current geyser predictions and notes that predictions are estimates for natural features.'},limits:['Geysers are natural features without a schedule; a prediction is a window, not an appointment.','Prediction availability changes with observation quality and visitor-center operations.','This tool republishes current prediction records; it does not calculate its own eruption model.']});
  }catch(error){
    res.status(502).json({ok:false,error:'Yellowstone geyser predictions are temporarily unavailable.',detail:String(error?.message||error),source:'https://geysertimes.org/',nps:NPS});
  }
};

module.exports._test={millis,iso,officialScore,normalize,selectCurrent,soonest};
