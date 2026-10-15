(function(){'use strict';
const $=id=>document.getElementById(id),root=document.querySelector('[data-ski-page]');
if(!root)return;
const slug=root.getAttribute('data-resort');
const state={data:null,origin:'detroit',region:'all'};
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function add(parent,...children){children.forEach(x=>x&&parent.appendChild(x));return parent;}
function external(label,url){const a=node('a',null,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function fmt(x,unit=''){return Number.isFinite(x)?Number(x).toFixed(1).replace(/\.0$/,'')+unit:'Not verified';}
function minutes(n){if(!Number.isFinite(n))return 'Unknown';return Math.floor(n/60)?Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m':n+'m';}
function latest(r,h){const w=r.weather||{},p=h===24?w.report24:w.report48;
 return p?fmt(p.inches,'" reported"')+' · '+p.distanceMiles+' mi away':'No nearby report';}
function score(r){if(r.kind==='nordic')return null;
 const old=r.ranking?.components?.travelValue??0;
 const newTravel=Math.max(0,Math.round(27-(r.driveMinutes?.[state.origin]||999)/30));
 const s=r.ranking?.score;
 return Number.isFinite(s)?Math.max(0,Math.min(100,s-old+newTravel)):null;}
function status(r){
 const a=r.weather?.alerts||[];
 if(r.kind==='nordic')return 'Nordic only — excluded from downhill ranking';
 if(r.ranking?.verdict==='OFF_SEASON_PLANNING')return 'Off-season · 2026–27 planning only';
 if(a.some(x=>/Warning/i.test(x.event)))return 'Winter warning · verify safe travel and lift openings';
 if(!r.weather||r.weather.weatherCoverage!=='NWS_GRID_RECEIVED')return 'Forecast unavailable · verify official sources';
 if(r.official?.status==='PUBLISHED_OFFICIAL_REPORT')return r.official.lifts.open===0?
 'Official report currently shows no operating lifts · future ski day unconfirmed':
 'Official page reports '+r.official.lifts.open+' of '+r.official.lifts.total+' lifts currently · confirm weekend operation';
 return 'Provisional comparison · verify lifts, snow base and ticket';
}
function chipsFor(r){
 const w=r.weather||{},arr=[];
 if(w.alerts?.some(a=>a.isLakeEffect))arr.push(['Official lake-effect alert','lake']);
 if(w.lakeEffectWind?.status==='WIND_ALIGNED')arr.push(['Wind favors lake-effect area · not confirmed snow','lake']);
 if(w.alerts?.some(a=>/Warning/i.test(a.event)))arr.push(['Active winter warning','alert']);
 if(r.kind==='nordic')arr.push(['Nordic / XC','neutral']);
 if(r.ranking?.verdict==='OFF_SEASON_PLANNING')arr.push(['Off season','neutral']);
 if(w.forecastSnowInches!==null&&Number.isFinite(w.forecastSnowInches))arr.push([fmt(w.forecastSnowInches,'"″')+' forecast weekend snow','lake']);
 if(w.weatherCoverage!=='NWS_GRID_RECEIVED')arr.push(['NWS grid unavailable','neutral']);
 if(r.official?.status==='PUBLISHED_OFFICIAL_REPORT')arr.push(['Official hill report checked','neutral']);
 return arr;
}
function ticket(r){
 const price=r.adultDayPrice2026;
 if(!price?.sat)return r.priceNote||'See current pricing';
 return '$'+price.sat+' Sat / $'+(price.sun||price.sat)+' Sun';
}
function card(r,index,detail=false){
 const box=node('article','hill'),num=node('div','rank',r.kind==='nordic'?'XC':score(r)===null?'–':(index+1)),body=node('div');
 const name=node('h3'),a=node('a',null,r.name);
 a.href='/michigan-ski-hills/'+r.slug+'/';add(name,a);
 add(body,name,node('p','subtitle',r.location+' · '+r.region.replaceAll('-',' ') ));
 const chips=node('div','chips');chipsFor(r).forEach(([s,c])=>add(chips,node('span','chip '+c,s)));add(body,chips);
 const metrics=node('div','metrics');
 const data=[
 ['Decision index',score(r)===null?'Not ranked':score(r)+'/100*'],
 ['Sat forecast snow',fmt(r.weather?.skiDays?.saturday?.snowInches,'″')],
 ['Sat NWS temperature',Number.isFinite(r.weather?.skiDays?.saturday?.lowF)?r.weather.skiDays.saturday.lowF+'–'+r.weather.skiDays.saturday.highF+'°F':'Unavailable'],
 ['Sun forecast snow',fmt(r.weather?.skiDays?.sunday?.snowInches,'″')],
 ['Sun NWS temperature',Number.isFinite(r.weather?.skiDays?.sunday?.lowF)?r.weather.skiDays.sunday.lowF+'–'+r.weather.skiDays.sunday.highF+'°F':'Unavailable'],
 ['Nearby NWS report filed in 24h',r.weather?.report24?fmt(r.weather.report24.inches,'″ report'):'No nearby report'],
 ['Drive · '+(state.origin==='detroit'?'Detroit':'Grand Rapids'),minutes(r.driveMinutes?.[state.origin])],
 ['Adult lift ticket',ticket(r)],['Official base depth',Number.isFinite(r.weather?.baseDepthInches)?fmt(r.weather.baseDepthInches,'″ reported'):'Not verified'],
 ['Lake-effect',r.weather?.alerts?.some(x=>x.isLakeEffect)?'Official alert':
   r.weather?.lakeEffectWind?.status==='WIND_ALIGNED'?'Favorable wind only':
   r.weather?.lakeEffectWind?.status==='NOT_ALIGNED'?'Wind not aligned':'Unverified'],
 ['Current operating lifts',r.official?.status==='PUBLISHED_OFFICIAL_REPORT'?r.official.lifts.open+'/'+r.official.lifts.total+' (as posted)':'Not verified'],
 ['Current open trails',r.official?.status==='PUBLISHED_OFFICIAL_REPORT'?r.official.trails.open+'/'+r.official.trails.total+' (as posted)':'Not verified']
 ];
 const keep=data.filter(([label])=>label==='Sat forecast snow'||label==='Sun forecast snow'||label.startsWith('Drive ·')||label==='Adult lift ticket');
 const other=data.filter(([label])=>!keep.some(([name])=>name===label));
 const metric=(parent,label,value)=>{const m=node('div','metric');add(m,node('small',null,label),node('strong','mono',value));add(parent,m);};
 if(detail){data.forEach(([label,value])=>metric(metrics,label,value));add(body,metrics);}
 else{
   keep.forEach(([label,value])=>metric(metrics,label,value));add(body,metrics);
   const more=node('details','hill-extra'),summary=node('summary',null,'Conditions, operating evidence and source checks');
   const expanded=node('div','metrics');other.forEach(([label,value])=>metric(expanded,label,value));
   add(more,summary,expanded);add(body,more);
 }
 add(body,node('p','verdict',status(r)),node('p','source-line',r.note));
 const preferred=r.weather?.skiDays?.moreSnowForecast;
 if(preferred==='SATURDAY'||preferred==='SUNDAY')add(body,node('p','note','NWS forecasts more snow in the '+(preferred==='SATURDAY'?'Friday-to-Saturday':'Saturday-to-Sunday')+' 24-hour window. This is not a ski-surface or road-safety recommendation.'));
 if(detail&&r.official?.status==='PUBLISHED_OFFICIAL_REPORT')add(body,node('p','note','Official mountain page checked '+new Date(r.official.checkedAt).toLocaleString('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'})+' ET. This is a site snapshot, not confirmation lifts will be open on your weekend.'));
 if(detail){const links=node('div','source-links');add(links,external('Official snow / resort report ↗',r.snow),
 external('Official tickets ↗',r.tickets));add(body,links);}
 add(box,num,body);return box;
}
function warnings(data){
 const target=$('lake-watch');if(!target)return;target.replaceChildren();
 const health=data.health||{},alerted=data.resorts.filter(r=>r.weather?.alerts?.some(a=>a.isLakeEffect));
 const aligned=data.resorts.filter(r=>r.weather?.lakeEffectWind?.status==='WIND_ALIGNED');
 const reported=data.resorts.filter(r=>r.weather?.report24)
   .sort((a,b)=>(b.weather.report24.inches||0)-(a.weather.report24.inches||0)).slice(0,5);
 const lanes=node('div','insights');
 const current=node('article');add(current,node('h3',null,'01 / Lake-effect warnings'));
 if(health.nwsAlerts!=='RECEIVED')add(current,node('p',null,'NWS alerts unavailable — cannot verify active lake-effect warnings.'));
 else if(!alerted.length)add(current,node('p',null,'No matching NWS lake-effect warning or alert for these 18 ski points in this snapshot.'));
 else add(current,node('p',null,alerted.length+' hills match lake-effect alert zones: '+alerted.map(r=>r.name).join(', ')+'.'));
 add(current,node('p','small','An active warning may mean dangerous winter travel. It does not establish fresh powder.'));
 const obs=node('article');add(obs,node('h3',null,'02 / Snow reported nearby'));
 if(!reported.length)add(obs,node('p',null,'No NWS storm reports filed within 35 miles of monitored hills in the past 24 hours.'));
 else for(const r of reported)add(obs,node('p','small',r.name+': '+fmt(r.weather.report24.inches,'″')+' reported '+r.weather.report24.distanceMiles+' mi away. Report interval varies.'));
 const steering=node('article');add(steering,node('h3',null,'03 / Where winds favor a snowbelt'));
 if(!aligned.length)add(steering,node('p',null,'No favorable wind-sector matches confirmed from current NWS grid data.'));
 else add(steering,node('p',null,aligned.map(r=>r.name).join(', ')+'.'));
 add(steering,node('p','small','Wind-sector climatology, not a current snowband observation. Forecast snowfall is calculated separately.'));
 const cold=node('article');add(cold,node('h3',null,'04 / Early-season snowmaking cold-air watch'));
 const candidates=data.resorts.filter(r=>r.kind==='downhill'&&r.weather?.snowmaking?.status==='COLD_AIR_WINDOW')
   .sort((a,b)=>(b.weather.snowmaking.hours||0)-(a.weather.snowmaking.hours||0)).slice(0,5);
 if(candidates.length)for(const r of candidates)add(cold,node('p','small',r.name+': approximately '+r.weather.snowmaking.hours+' forecast hours at or below 28°F in the coming seven days.'));
 else add(cold,node('p','small','No qualifying eight-hour cold-air window is identified from the available NWS temperature grids. Missing grid data remains unknown.'));
 add(cold,node('p','small','Air-temperature opportunity only. Humidity, wet-bulb temperature, resort snowmaking plans and open lifts are NOT verified.'));
 add(lanes,current,obs,steering,cold);add(target,lanes);
}
function sortResorts(arr){
 return arr.slice().sort((a,b)=>(score(b)??-1)-(score(a)??-1)||a.name.localeCompare(b.name));
}
function render(){
 if(!state.data)return;
 if($('origin'))state.origin=$('origin').value;
 if($('region'))state.region=$('region').value;
 const info=state.data,stamp=$('updated');
 if(stamp)stamp.textContent='NWS and storm-report snapshot '+new Date(info.generatedAt).toLocaleString('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'})+' ET · Published prices dated October 2026 · Drive times estimated.';
 warnings(info);
 const target=$('resort-list');if(target){
   const filtered=sortResorts(info.resorts.filter(r=>state.region==='all'||r.region===state.region));
   target.replaceChildren();filtered.forEach((r,i)=>add(target,card(r,i)));
   if($('count'))$('count').textContent=filtered.length+' destinations · '+filtered.filter(x=>x.kind==='downhill').length+' downhill hills. Ranked for the selected origin; missing data receives no positive points.';
 }
 const one=$('hill-live');
 if(one){one.replaceChildren();const r=info.resorts.find(x=>x.slug===slug);
   if(r){add(one,card(r,0,true));const comments=node('p','note','* Index is a provisional conditions-and-value comparison, not a confirmed go/no-go. Base depth, operating lifts and resort-specific 24/48h snowfall remain unverified. NWS point forecasts use approximate resort coordinates.');
     add(one,comments);
     for(const alert of r.weather.alerts){const ev=node('div','event');add(ev,node('strong',null,alert.event+' · '+(alert.headline||'Official weather warning')),node('p','small','This alert matched the resort forecast/county zone or warning polygon.'));add(ev,external('Open official alert ↗',alert.url));add(one,ev);}
     const source=node('div','insights');
     const old=node('article');add(old,node('h3',null,'Reported snowfall ≠ forecast'));
     const rpt=r.weather.report48;
     add(old,node('p',null,rpt?fmt(rpt.inches,'″')+' was reported '+rpt.distanceMiles+' miles from the resort at '+new Date(rpt.reportedAt).toLocaleString()+'.':'No NWS local storm report within 35 miles over 48 hours.'));
     if(rpt)add(old,node('p','small','Reporting window unspecified. '+rpt.remark));
     const upcoming=node('article');add(upcoming,node('h3',null,'Weekend snowfall forecast'),
       node('p',null,fmt(r.weather.forecastSnowInches,'″')+' from the NWS digital forecast grid, not a measured resort total.'),
       node('p','small','Snow predictions and alert zones can shift quickly. Resort and road authorities make operational decisions.'));
     add(source,old,upcoming);add(one,source);
   }else add(one,node('p','event','Hill not found in the current live response.'));
 }
}
async function load(){
 if($('updated'))$('updated').textContent='Checking NWS forecasts and reported snow…';
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),45000);
 try{
   const res=await fetch('/api/michigan-ski',{signal:ctl.signal,cache:'default'});
   if(!res.ok)throw Error('The live report is temporarily unavailable');
   const data=await res.json();if(!data.ok||!Array.isArray(data.resorts)||data.resorts.length!==18)throw Error('Incomplete report');
   state.data=data;render();document.dispatchEvent(new CustomEvent('michigan-ski:data',{detail:data}));
 }catch(e){
   if($('updated'))$('updated').textContent='Live conditions unavailable. The static resort directory and official source links below are still usable; no conditions are verified.';
   if($('hill-live'))$('hill-live').append(node('p','event','Live conditions could not be verified. Use the official resort and NWS links below.'));
 }finally{clearTimeout(tm);}
}
for(const id of ['origin','region'])if($(id))$(id).addEventListener('change',render);
load();
})();
