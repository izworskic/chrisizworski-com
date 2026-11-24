(function(){'use strict';
const $=id=>document.getElementById(id),root=document.querySelector('[data-ski-page]');
if(!root)return;
const slug=root.getAttribute('data-resort');
document.documentElement.classList.add('ski-js');
const state={data:null,origin:'detroit',region:'all',openOnly:false,planOnly:false};
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
function reportStamp(x){
 if(/^\d{4}-\d{2}-\d{2}$/.test(x||''))return new Date(x+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',year:'numeric'})+' (date only; time not published)';
 const time=Date.parse(x||'');
 return Number.isFinite(time)?new Date(time).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Date not published';
}
function operatingLabel(r){
 const status=r.official?.status,official=r.official||{};
 if(status==='OPEN_PER_OPERATOR')return 'Open per operator';
 if(status==='CLOSED_PER_OPERATOR')return 'Closed per operator';
 if(status==='STALE_REPORT')return 'Outdated operator report';
 if(status==='NOT_CONNECTED')return 'No connected lift report';
 if(official.reason==='UNDATED_OPERATOR_REPORT'&&official.lifts?.open===0)return '0 lifts listed · undated';
 if(official.reason==='UNDATED_OPERATOR_REPORT'&&official.lifts?.open>0)return 'Lift count undated';
 if(official.reason==='UNRECOGNIZED_REPORT_FORMAT')return 'No readable lift report';
 if(['SOURCE_HTTP_ERROR','SOURCE_UNAVAILABLE'].includes(official.reason))return 'Report unavailable';
 return 'Current status not confirmed';
}
function evidenceNote(r){
 const official=r.official||{};
 if(official.status==='NOT_CONNECTED')return 'No approved operator lift-report connection';
 if(official.status==='STALE_REPORT')return 'The operator report is older than 36 hours';
 if(official.reason==='UNDATED_OPERATOR_REPORT'){
  if(official.lifts?.open>0)return 'Lift numbers have no dated report and cannot confirm current operations';
  return 'Operator lift counts have no published report date';
 }
 if(official.reason==='UNRECOGNIZED_REPORT_FORMAT')return 'This operator page does not expose a usable lift count and dated report';
 if(official.reason==='SOURCE_HTTP_ERROR'||official.reason==='SOURCE_UNAVAILABLE')return 'The operator page could not be read on this check';
 return 'A current operating status could not be established';
}
function operatorOpeningPlans(){
 // Reuse the operator-sourced, build-time opening table; no separate list of guessed dates.
 const plans=new Map();
 for(const tr of document.querySelectorAll('.ski-opening-evidence tbody tr')){
  const name=tr.querySelector('th')?.textContent.trim(),value=tr.querySelector('td')?.textContent.trim();
  if(name&&value&&!value.startsWith('Not announced'))plans.set(name,value);
 }
 return plans;
}
function operatingBoard(data){
 const count=$('ski-open-count'),host=$('ski-operating-list'),coverage=$('ski-source-coverage'),filter=$('ski-open-filter'),planFilter=$('ski-plan-filter'),result=$('ski-filter-result');
 if(!host||!count)return;
 const hills=data.resorts.filter(r=>r.kind==='downhill'&&(state.region==='all'||r.region===state.region));
 const open=hills.filter(r=>r.official?.status==='OPEN_PER_OPERATOR');
 const closed=hills.filter(r=>r.official?.status==='CLOSED_PER_OPERATOR');
 const dated=hills.filter(r=>['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR'].includes(r.official?.status));
 const undatedZero=hills.filter(r=>r.official?.status==='UNVERIFIED'&&r.official?.reason==='UNDATED_OPERATOR_REPORT'&&r.official?.lifts?.open===0);
 const connected=hills.filter(r=>r.official?.status!=='NOT_CONNECTED');
 const plans=operatorOpeningPlans();
 const when=new Date(data.generatedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const area=$('region')?.selectedOptions?.[0]?.textContent||'All Michigan';
 count.textContent=open.length+' confirmed open · '+closed.length+' confirmed closed from current dated operator reports'+(state.region==='all'?'':' in '+area)+'. Checked '+when+'.';
 if(coverage)coverage.textContent=dated.length+' current dated reports · '+undatedZero.length+' undated zero-lift listings · '+connected.length+' operator report links checked out of '+hills.length+' downhill areas. No report date means no verified status.';
 if(filter){filter.setAttribute('aria-pressed',String(state.openOnly));filter.textContent=state.openOnly?'Open now · Show all':'Open now';}
 if(planFilter){planFilter.setAttribute('aria-pressed',String(state.planOnly));planFilter.textContent=state.planOnly?'Opening plans · Show all':'Opening plans';}
 host.replaceChildren();
 if(!state.openOnly&&!state.planOnly&&plans.size){
  const upcoming=hills.map(r=>{
   const detail=plans.get(r.name);if(!detail)return null;
   const at=Date.parse(detail.split(' · ')[0]);
   return Number.isFinite(at)?{name:r.name,detail,at}:null;
  }).filter(Boolean).filter(p=>p.at>=Date.parse(data.generatedAt.slice(0,10)+'T00:00:00Z')).sort((a,b)=>a.at-b.at);
  const summary=node('p','ski-next-opening');
  if(upcoming.length)summary.append(document.createTextNode('Next operator-announced opening target: '+upcoming[0].name+' · '+upcoming[0].detail+'. '));
  else summary.append(document.createTextNode(plans.size+' operator opening plans are listed below. '));
  const see=node('a',null,'Compare opening dates and original sources');
  see.href='#ski-opening-heading';add(summary,see);add(host,summary);
 }
 const visible=hills.filter(r=>state.planOnly?plans.has(r.name):!state.openOnly||r.official?.status==='OPEN_PER_OPERATOR')
 .sort((a,b)=>state.planOnly?
  (Date.parse(plans.get(a.name)?.split(' · ')[0]||'')||Infinity)-(Date.parse(plans.get(b.name)?.split(' · ')[0]||'')||Infinity)||a.name.localeCompare(b.name):
  ({'OPEN_PER_OPERATOR':0,'CLOSED_PER_OPERATOR':1,'STALE_REPORT':2,'UNVERIFIED':3,'NOT_CONNECTED':4}[a.official?.status]??3)-({'OPEN_PER_OPERATOR':0,'CLOSED_PER_OPERATOR':1,'STALE_REPORT':2,'UNVERIFIED':3,'NOT_CONNECTED':4}[b.official?.status]??3)||a.name.localeCompare(b.name));
 if(result)result.textContent=state.openOnly?
  visible.length+' resorts with confirmed open lifts. A dated operator report is required.':
  state.planOnly?visible.length+' resorts with operator-announced opening plans in '+area+'. These are not confirmed openings.':
  hills.length+' downhill resorts shown in '+area+'. Current dated confirmations appear first.';
 if(!visible.length)add(host,node('p','ski-open-empty',state.planOnly?'No published operator opening plans for this area. Clear “Opening plans” to check all resort sources.':'No current dated report confirms lifts running here. That does not establish every hill is closed. Clear “Open now” to inspect other evidence.'));
 function reportRow(r){
  const row=node('div','ski-operation-row'),head=node('div','ski-operation-heading');
  const title=node('strong'),link=node('a',null,r.name);link.href='/michigan-ski-hills/'+r.slug+'/';add(title,link);
  const status=node('span','ski-evidence-status '+(r.official?.status==='OPEN_PER_OPERATOR'?'evidence-open':r.official?.status==='CLOSED_PER_OPERATOR'?'evidence-closed':'evidence-uncertain'),operatingLabel(r));
  add(head,title,status);
  const info=node('p','small'),lifts=r.official?.lifts,trail=r.official?.trails;
  const confirmed=['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR'].includes(r.official?.status);
  const liftText=confirmed&&lifts?.open!=null?lifts.open+' of '+(lifts.total??'?')+' lifts confirmed by the dated report':
   lifts?.open===0?lifts.open+' of '+(lifts.total??'?')+' lifts listed (undated, not independently confirmed)':
   lifts?.open>0?'A lift count is shown, but it is undated and cannot confirm an opening':
   'No usable current lift count';
  const runsText=confirmed&&trail?.open!=null?' · '+trail.open+' of '+(trail.total??'?')+' runs':'';
  info.textContent=liftText+runsText+' · Operator report: '+reportStamp(r.official?.reportUpdatedAt)+' · Checked: '+reportStamp(r.official?.checkedAt);
  const source=r.official?.url||r.snow;
  add(row,head,info,node('p','small',evidenceNote(r)),external(r.official?.status==='NOT_CONNECTED'?'Visit resort website':'Read operator report',source));
  if(plans.has(r.name))add(row,node('p','ski-operator-plan','2026–27 opening plan: '+plans.get(r.name)+' · not evidence of lifts running'));
  if(r.official?.operatorStatusText)add(row,node('p','small','Operator note (may be stale): '+r.official.operatorStatusText));
  return row;
 }
 const confirmedRows=state.planOnly?visible:visible.filter(r=>['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR'].includes(r.official?.status));
 const otherRows=state.planOnly?[]:visible.filter(r=>!['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR'].includes(r.official?.status));
 confirmedRows.forEach(r=>add(host,reportRow(r)));
 if(otherRows.length){
  const details=node('details','ski-unconfirmed');
  const summary=node('summary',null,otherRows.length+' resorts without a current dated status · inspect operator evidence');
  add(details,summary);otherRows.forEach(r=>add(details,reportRow(r)));add(host,details);
 }
 if(!dated.length&&!state.openOnly&&!state.planOnly)add(host,node('p','event','No dated operator reports were verified in this snapshot. Undated lift counts and opening targets are useful planning clues, not confirmations of current operations.'));
}
function status(r){
 const a=r.weather?.alerts||[];
 if(r.kind==='nordic')return 'Nordic only — excluded from downhill ranking';
 if(r.official?.status==='OPEN_PER_OPERATOR')return 'Open per operator · '+r.official.lifts.open+' of '+r.official.lifts.total+' lifts · report '+reportStamp(r.official.reportUpdatedAt)+' · verify before travel';
 if(r.official?.status==='CLOSED_PER_OPERATOR')return 'Closed per operator · zero lifts on a dated current report';
 if(r.official?.status==='STALE_REPORT')return 'Stale operator report · not evidence of current lift operation';
 if(r.official?.status==='UNVERIFIED')return 'No confirmed open-lift report · '+evidenceNote(r)+'; check the operator before leaving';
 if(r.official?.status==='NOT_CONNECTED')return 'No approved operating report connection · verify directly with the resort';
 if(r.ranking?.verdict==='OFF_SEASON_PLANNING')return 'Off-season · 2026–27 planning only';
 if(a.some(x=>/Warning/i.test(x.event)))return 'Winter warning · verify safe travel and lift openings';
 if(!r.weather||r.weather.weatherCoverage!=='NWS_GRID_RECEIVED')return 'Forecast unavailable · verify official sources';
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
 if(r.official?.status==='OPEN_PER_OPERATOR')arr.push(['Dated official open-lift report','neutral']);
 if(r.official?.status==='STALE_REPORT')arr.push(['Stale report','neutral']);
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
 ['Current operating lifts',r.official?.lifts?.open!=null?r.official.lifts.open+'/'+(r.official.lifts.total??'?')+' ('+operatingLabel(r)+')':'Not verified'],
 ['Current open trails',r.official?.trails?.open!=null?r.official.trails.open+'/'+(r.official.trails.total??'?')+' ('+operatingLabel(r)+')':'Not verified']
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
 if(detail)add(body,node('p','note','Official report status: '+operatingLabel(r)+'. Operator report: '+reportStamp(r.official?.reportUpdatedAt)+'. Source fetched: '+reportStamp(r.official?.checkedAt)+'. The page fetch time is not the resort update time; future operation is never guaranteed.'));
 if(detail){const links=node('div','source-links');add(links,external('Official snow / resort report ↗',r.official?.url||r.snow),
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
 const info=state.data,stamp=$('updated'),plans=operatorOpeningPlans();
 if(stamp)stamp.textContent='NWS and storm-report snapshot '+new Date(info.generatedAt).toLocaleString('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'})+' ET · Published prices dated October 2026 · Drive times estimated.';
 warnings(info);
 operatingBoard(info);
 const target=$('resort-list');if(target){
   const filtered=sortResorts(info.resorts.filter(r=>(state.region==='all'||r.region===state.region)&&(state.planOnly?plans.has(r.name):!state.openOnly||r.official?.status==='OPEN_PER_OPERATOR')));
   target.replaceChildren();filtered.forEach((r,i)=>add(target,card(r,i)));
   if(!filtered.length)add(target,node('p','event',state.planOnly?'No resort in this area has an operator-announced opening date. Clear the filter to see other hills.':'No resorts here have verified operating lifts. Clear “Open now” to inspect other sources.'));
   if($('count'))$('count').textContent=filtered.length+' destinations · '+filtered.filter(x=>x.kind==='downhill').length+' downhill hills'+(state.planOnly?' with published opening plans':state.openOnly?' with confirmed lifts':'')+'. The index ranks planning conditions, not lift operations.';
 }
 if(!slug)document.dispatchEvent(new CustomEvent('michigan-ski:filters',{detail:{region:state.region,openOnly:state.openOnly,planOnly:state.planOnly}}));
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
   if($('updated'))$('updated').textContent='Live conditions unavailable. No operating status can be verified. The static resort directory and operator opening-date sources remain available.';
   if($('ski-open-count'))$('ski-open-count').textContent='Live operator reports unavailable · no open or closed claims can be made.';
   if($('ski-filter-result'))$('ski-filter-result').textContent='Live lift reports are unavailable. The operator opening-date table remains below.';
   document.dispatchEvent(new CustomEvent('michigan-ski:error'));
   if($('ski-operating-list'))$('ski-operating-list').textContent='Report feed unavailable. Use the operator links in the opening-date table and destination directory below.';
   if($('hill-live'))$('hill-live').append(node('p','event','Live conditions could not be verified. Use the official resort and NWS links below.'));
 }finally{clearTimeout(tm);}
}
if($('origin'))$('origin').addEventListener('change',render);
if($('region'))$('region').addEventListener('change',render);
if($('ski-open-filter'))$('ski-open-filter').addEventListener('click',()=>{
 state.openOnly=!state.openOnly;state.planOnly=false;if(state.data)render();
});
if($('ski-plan-filter'))$('ski-plan-filter').addEventListener('click',()=>{
 state.planOnly=!state.planOnly;state.openOnly=false;if(state.data)render();
});
load();
})();
