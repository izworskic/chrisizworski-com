/* Winter Trails weather lens.
 * Weather is an independent regional reading, NEVER an opening, grooming,
 * trailhead/parking or route-safety determination. Weather appears on demand.
 */
const HOUR=3600000;
const cleanStamp=(value,now,maxAge)=>{
 const t=Date.parse(value||'');
 return Number.isFinite(t)&&t<=now+HOUR&&now-t>=0&&now-t<=maxAge;
};
const amount=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function interpretAreaEvidence(data,trailId,date,now=Date.now()){
 if(!data||data.status!=='area-weather-context-not-trip-clearance'||
  data.trailId!==trailId||data.tripDate!==date||
  !Number.isFinite(data.referencePoint?.lat)||!Number.isFinite(data.referencePoint?.lon)||
  data.referencePoint.lat<41||data.referencePoint.lat>49||
  data.referencePoint.lon< -91||data.referencePoint.lon> -82)
  return {valid:false,reason:'Weather response did not match the selected trail area and outing date.'};
 const snow=data.snow||{},forecast=data.forecast||{},alerts=data.alerts||{};
 const sDate=validDate(snow.validDate)?Date.parse(snow.validDate+'T12:00:00Z'):NaN;
 const knownSnow=snow.status==='modeled'&&amount(snow.depthInches,0,800)!==null&&
  Number.isFinite(sDate)&&sDate<=now+HOUR&&now-sDate<=72*HOUR;
 const knownForecast=forecast.status==='forecast'&&cleanStamp(forecast.updatedAt,now,12*HOUR)&&
  amount(forecast.tempMinF,-100,150)!==null&&amount(forecast.tempMaxF,-100,150)!==null&&
  forecast.tempMinF<=forecast.tempMaxF&&
  /^https:\/\/api\.weather\.gov\/gridpoints\/[a-z]{3}\/\d+,\d+\/forecast\/hourly$/i.test(forecast.sourceUrl||'');
 const knownAlerts=alerts.status==='checked'&&cleanStamp(alerts.checkedAt,now,30*60*1000)&&
  Array.isArray(alerts.events);
 return {
  valid:true,tripDate:date,checkedAt:cleanStamp(data.checkedAt,now,30*60*1000)?data.checkedAt:null,
  snow:knownSnow?{known:true,inches:snow.depthInches,date:snow.validDate}:{known:false},
  forecast:knownForecast?{
   known:true,low:forecast.tempMinF,high:forecast.tempMaxF,
   wind:amount(forecast.windMph,0,160),chill:amount(forecast.windChillF,-150,150),
   freezeThaw:forecast.freezeThaw===true,rain:forecast.rainOrFreezingRain===true,
   issued:forecast.updatedAt,sourceUrl:forecast.sourceUrl
  }:{known:false},
  alerts:knownAlerts?{known:true,events:alerts.events.filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,140)),
   checkedAt:alerts.checkedAt}:{known:false}
 };
}

function mount(){
 const $=id=>document.getElementById(id);
 const root=$('trl-weather-lens'),select=$('trl-weather-trail'),
  date=$('trl-weather-date'),check=$('trl-weather-check'),report=$('trl-weather-report');
 if(!root||!select||!date||!check||!report)return;
 const cards=[...document.querySelectorAll('.wf-story')];
 const byId=new Map(cards.map(card=>[card.id,card]));
 let controller=null,sequence=0;
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const p=(txt,cls)=>{const e=document.createElement('p');if(cls)e.className=cls;e.textContent=txt;return e};
 const t=(tag,txt,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt;return e};
 const addLink=(parent,url,txt)=>{
  const a=t('a',txt);a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
 };
 const official=(card)=>{
  try {
   const url=new URL(card?.dataset.evidence||'');
   if(url.protocol!=='https:'||url.username||url.password)return null;
   if(url.hostname==='www.nps.gov'||url.hostname==='nps.gov'||url.hostname==='www.michigan.gov'||
      url.hostname==='www2.dnr.state.mi.us')return url.href;
  }catch{}
  return null;
 };
 const areaLabel=(card)=>card?.querySelector('h3')?.textContent?.trim()||'Selected winter trail area';
 const day=(offset=0)=>{
  const parts=new Intl.DateTimeFormat('en-US',{
   timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'
  }).formatToParts(new Date());
  const v=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const d=new Date(Date.UTC(+v.year,+v.month-1,+v.day+offset,12));
  return {iso:d.toISOString().slice(0,10),weekday:v.weekday};
 };
 const today=day(),saturdayOffset=(6-['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(today.weekday)+7)%7;
 date.min=today.iso;date.max=day(6).iso;
 date.value=day(Math.min(saturdayOffset,6)).iso;
 for(const card of cards){
  const option=document.createElement('option');option.value=card.id;option.textContent=areaLabel(card);select.append(option);
  const links=card.querySelector('.wf-links');
  if(links){
   const b=t('button','Check this area’s snow + forecast','trl-weather-entry');
   b.type='button';b.setAttribute('aria-label','Check modeled snow and NWS weather for '+areaLabel(card));
   b.addEventListener('click',()=>openFor(card.id,true));
   links.append(b);
  }
 }
 select.disabled=false;date.disabled=false;check.hidden=false;

 const alertPanel=(evidence)=>{
  const box=document.createElement('div');box.className='trl-weather-alerts';
  if(!evidence.alerts.known){
   box.append(t('strong','Weather alerts could not be verified'),p('The NWS alert check is unavailable or too old. Review the official warnings before leaving.'));
  }else if(evidence.alerts.events.length){
   box.append(t('strong','NWS alerts in this area'));
   const ul=document.createElement('ul');
   for(const event of evidence.alerts.events)ul.append(t('li',event));
   box.append(ul,p('These were active when checked. Confirm their effective times and travel relevance in the original NWS notice.'));
  }else{
   box.append(t('strong','No active alerts in the checked NWS feed'),
    p('Checked at '+new Date(evidence.alerts.checkedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})+'. New alerts can be issued before your outing.'));
  }
  addLink(box,'https://www.weather.gov/alerts','Review official NWS warnings');
  return box;
 };
 function result(evidence,card){
  const wrap=document.createElement('div');wrap.className='trl-weather-reading';
  wrap.append(t('h3',areaLabel(card)));
  const note=evidence.checkedAt?'Sources queried '+new Date(evidence.checkedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'})+
   ' · Outing '+evidence.tripDate:'Outing '+evidence.tripDate+' · Source request age unavailable';
  wrap.append(p(note,'trl-weather-issued'));
  const grid=document.createElement('div');grid.className='trl-weather-metrics';
  const snow=document.createElement('section');snow.className='trl-weather-metric';
  snow.append(t('span','NOAA modeled snow depth','trl-weather-metric-title'));
  snow.append(t('strong',evidence.snow.known?evidence.snow.inches.toFixed(1)+' in':'Unknown','trl-weather-value'));
  snow.append(p(evidence.snow.known?'1-km grid cell · '+evidence.snow.date+' · not a trail measurement':'No usable recent NOAA snow-depth grid value'));
  grid.append(snow);
  const forecast=document.createElement('section');forecast.className='trl-weather-metric';
  forecast.append(t('span','NWS 10 AM–4 PM forecast','trl-weather-metric-title'));
  forecast.append(t('strong',evidence.forecast.known?Math.round(evidence.forecast.low)+'–'+Math.round(evidence.forecast.high)+'°F':'Unknown','trl-weather-value'));
  const weatherInfo=evidence.forecast.known?
   'Highest wind '+(evidence.forecast.wind===null?'unknown':Math.round(evidence.forecast.wind)+' mph')+
   (evidence.forecast.chill===null?'':' · lowest wind chill '+Math.round(evidence.forecast.chill)+'°F')+
   (evidence.forecast.freezeThaw?' · freeze/thaw possible':'')+
   (evidence.forecast.rain?' · rain or freezing rain in forecast':''):
   'No fresh NWS hourly daytime forecast for this outing';
  forecast.append(p(weatherInfo));
  grid.append(forecast);wrap.append(grid,alertPanel(evidence));
  const links=document.createElement('div');links.className='trl-weather-links';
  addLink(links,'https://www.nohrsc.noaa.gov/nsa/','NOAA source');
  if(evidence.forecast.known)addLink(links,evidence.forecast.sourceUrl,'NWS hourly forecast');
  const manager=official(card);if(manager)addLink(links,manager,'Official trail manager / rules');
  wrap.append(links,p('Before setting out, check winter access, the plowed parking lot and trail-specific grooming with the manager. This weather reading cannot verify them.','trl-weather-boundary'));
  return wrap;
 }
 async function request(){
  const id=select.value,out=date.value,card=byId.get(id);
  if(!card || !validDate(out)||out<date.min||out>date.max){
   report.replaceChildren(p('Choose a documented trail area and an outing date in the next six days.'));
   return;
  }
  if(controller)controller.abort();
  const activeController=new AbortController();controller=activeController;
  const ticket=++sequence,signal=activeController.signal;
  report.replaceChildren(p('Checking NOAA modeled snow, NWS daytime forecast and active alerts for '+areaLabel(card)+'…'));
  check.disabled=true;
  const timeout=setTimeout(()=>activeController.abort(),18000);
  try{
   const response=await fetch('/api/winter-hike-lab?'+new URLSearchParams({
    mode:'field-weather',trail:id,date:out
   }),{credentials:'same-origin',signal});
   if(!response.ok)throw Error('Weather service unavailable');
   const data=await response.json();
   if(ticket!==sequence)return;
   const evidence=interpretAreaEvidence(data,id,out);
   if(!evidence.valid || Math.abs(Number(data.referencePoint.lat)-Number(card.dataset.lat))>0.000001 ||
    Math.abs(Number(data.referencePoint.lon)-Number(card.dataset.lng))>0.000001)
    throw Error('Weather response inconsistent with selected trail area');
   report.replaceChildren(result(evidence,card));
  }catch(error){
   if(ticket!==sequence)return;
   report.replaceChildren(
    t('strong','Weather could not be verified'),
    p('The official sources could not provide a trustworthy reading for this outing. Check NOAA, NWS and the trail manager directly; unknown does not mean clear or safe.')
   );
  }finally{
   clearTimeout(timeout);
   if(ticket===sequence){check.disabled=false;controller=null}
  }
 }
 function openFor(id,load=false){
  if(!byId.has(id))return;
  select.value=id;root.open=true;
  root.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});
  if(load)request();
  else select.focus({preventScroll:true});
 }
 document.addEventListener('winter-trails:check-weather',event=>{
  openFor(event.detail?.id,true);
 });
 check.addEventListener('click',request);
 select.addEventListener('change',()=>{
  if(controller)controller.abort();sequence++;controller=null;check.disabled=false;
  report.replaceChildren(p('Selected '+areaLabel(byId.get(select.value))+'. Check weather for the chosen date to see current source evidence.'));
 });
 date.addEventListener('change',()=>{
  if(controller)controller.abort();sequence++;controller=null;check.disabled=false;
  report.replaceChildren(p('Outing date changed. Check weather again for the new day.'));
 });
}

if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
