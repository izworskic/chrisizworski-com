/* Garden growing-season notebook: lazy history, explicit weather lookup, on-device state. */
(function(){
'use strict';
const root=document.getElementById('growing-season');if(!root)return;
const get=id=>document.getElementById(id),H=window.GardenHarvest,R=window.GardenHistory;
if(!H||!R)return;
const places={'bay-city':'Bay City',detroit:'Detroit','grand-rapids':'Grand Rapids',kalamazoo:'Kalamazoo','traverse-city':'Traverse City',marquette:'Marquette',houghton:'Houghton'};
const stage={'direct-seed':'direct sowing','transplant-3-5-leaves':'transplant with 3 to 5 leaves','transplant-2-leaves':'transplant with 2 leaves','transplant-2-4-leaves':'transplant with 2 to 4 leaves','transplant-4-7-leaves':'transplant with 4 to 7 leaves'};
const label=m=>m.variety+' ('+m.crop.toLowerCase()+', '+stage[m.biofix]+(m.id.endsWith('-green')?', green harvest':m.id.endsWith('-ripe')?', ripe harvest':'')+')';
const norm=s=>String(s||'').trim().toLowerCase(),findPlace=s=>Object.keys(places).find(k=>norm(places[k])===norm(s)),findModel=s=>Object.values(H.models).find(m=>norm(label(m))===norm(s)||norm(m.id)===norm(s));
const day=86400000,iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fmt=(s,year=false)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const dateAdd=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*day).toISOString().slice(0,10);
const key='fvfGrowingSeasonV1';let saved=null,archivePromise=null,version=0,weatherVersion=0,active=null;
try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
function option(list,value){const e=document.createElement('option');e.value=value;list.appendChild(e);}
Object.values(places).forEach(v=>option(get('gs-towns'),v));Object.values(H.models).forEach(m=>option(get('gs-crops'),label(m)));
const now=new Date(),today=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Detroit'}).format(now);
const year=Number(today.slice(0,4))+(today.slice(5)>'05-25'?1:0);
get('gs-place').value=places[saved?.siteId]||'Bay City';
get('gs-crop').value=typeof saved?.crop==='string'?saved.crop:label(H.models['big-beef']);
get('gs-date').value=iso(saved?.date)?saved.date:year+'-05-25';
get('gs-packet').value=Number.isInteger(saved?.packetDays)&&saved.packetDays>0&&saved.packetDays<=365?saved.packetDays:'';
get('gs-form').hidden=false;
function resetWeather(){weatherVersion++;get('gs-weather-result').replaceChildren();get('gs-weather-status').textContent='Check the forecast when you are ready. No current reading has been loaded.';get('gs-weather').disabled=true;}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function historyData(){if(!archivePromise)archivePromise=fetch('/assets/garden-tools/garden-daymet-2021-2025.json').then(r=>{if(!r.ok)throw Error('Archive');return r.json()}).catch(e=>{archivePromise=null;throw e});return archivePromise;}
function input(){const siteId=findPlace(get('gs-place').value),crop=get('gs-crop').value.trim().slice(0,120),model=findModel(crop),date=get('gs-date').value,raw=get('gs-packet').value,packetDays=raw===''?null:Number(raw);
 if(!siteId||!crop||!iso(date)||date<'2020-01-01'||date>'2100-12-31'||(packetDays!==null&&(!Number.isInteger(packetDays)||packetDays<1||packetDays>365)))return null;
 return {siteId,crop,model,date,packetDays};}
function paintHistory(result,s){
 const area=get('gs-history'),dates=result.seasons.filter(x=>x.heatCrossingDate).map(x=>x.heatCrossingDate.slice(5)).sort();
 const headline=result.allReached?fmt('2025-'+dates[0])+' to '+fmt('2025-'+dates[dates.length-1]):'Not reached in every historical season';
 area.appendChild(node('p',headline,'gs-range'));
 area.appendChild(node('p','Five historical heat-threshold dates for '+s.model.variety+'. These are not observed harvests or a prediction for '+s.date.slice(0,4)+'.','gs-muted'));
 const max=Math.max(1,...result.seasons.map(x=>x.elapsedDays||x.daysEvaluated),s.packetDays||0);
 const list=node('ol',undefined,'gs-history-list');
 for(const row of result.seasons){
  const li=node('li'),line=node('div',undefined,'gs-row-head');line.append(node('strong',String(row.year)),node('span',row.heatCrossingDate?fmt(row.heatCrossingDate)+' · '+row.elapsedDays+' days':'Threshold not reached'));li.appendChild(line);
  const track=node('div',undefined,'gs-track');track.setAttribute('aria-hidden','true');const bar=node('span',undefined,'gs-bar'+(row.heatCrossingDate?'':' gs-unreached'));bar.style.width=Math.min(100,100*(row.elapsedDays??row.daysEvaluated)/max)+'%';track.appendChild(bar);
  if(s.packetDays){const marker=node('i');marker.style.left=Math.min(100,100*s.packetDays/max)+'%';track.appendChild(marker);}
  li.appendChild(track);list.appendChild(li);
 }
 area.appendChild(list);area.appendChild(node('p',s.packetDays?'Gold marker: your packet days. Bar length: elapsed days from planting.':'Bar length: elapsed days from planting to the heat threshold, or available days if not reached.','gs-muted'));
}
async function run(save){
 const v=++version;resetWeather();active=null;const area=get('gs-history');area.replaceChildren();
 const s=input();if(!s){get('gs-status').textContent='Choose one of the seven reference towns, enter a crop and a valid planting date. Packet days must be 1 to 365.';return;}
 active=s;get('gs-weather').disabled=false;
 if(save){try{localStorage.setItem(key,JSON.stringify({siteId:s.siteId,crop:s.crop,date:s.date,packetDays:s.packetDays}));get('gs-save-status').textContent='Saved on this device.'}catch{get('gs-save-status').textContent='Browser storage unavailable; this plan is not saved.'}}
 get('gs-status').textContent=places[s.siteId]+' · planted or planned '+fmt(s.date,true);
 if(s.packetDays)area.appendChild(node('p','Packet reference: '+fmt(dateAdd(s.date,s.packetDays),true),'gs-packet'));
 if(!s.model){area.appendChild(node('p','No exact published heat model matches this crop and starting stage. Use your packet reference and watch the plants. No other variety has been substituted.'));return;}
 if(s.date.slice(5)==='02-29'){area.appendChild(node('p','The five-year comparison cannot use February 29 in non-leap years. Choose another planting date.'));return;}
 area.appendChild(node('p','Reading five years of regional temperatures…','gs-loading'));
 try{const data=await historyData();if(v!==version)return;const result=R.replay(R.unpack(data,s.siteId),{modelId:s.model.id,biofix:s.model.biofix,monthDay:s.date.slice(5),packetDays:s.packetDays});area.querySelector('.gs-loading')?.remove();paintHistory(result,s);}
 catch{if(v!==version)return;area.querySelector('.gs-loading')?.remove();area.appendChild(node('p','Historical temperatures are unavailable. Your planting and packet references remain above.'));}
}
get('gs-form').addEventListener('submit',e=>{e.preventDefault();run(true)});
get('gs-form').addEventListener('input',()=>{version++;resetWeather();active=null;get('gs-history').replaceChildren();get('gs-status').textContent='Update your season to see results for these changes.';get('gs-save-status').textContent='Unsaved changes.'});
get('gs-clear').addEventListener('click',()=>{try{localStorage.removeItem(key)}catch{}get('gs-place').value='Bay City';get('gs-crop').value=label(H.models['big-beef']);get('gs-date').value=year+'-05-25';get('gs-packet').value='';get('gs-save-status').textContent='Saved plan cleared.';run(false)});
get('gs-weather').addEventListener('click',async()=>{
 if(!active)return;const s=active,v=++weatherVersion,area=get('gs-weather-result'),status=get('gs-weather-status');area.replaceChildren();status.textContent='Checking the National Weather Service forecast for '+places[s.siteId]+'…';get('gs-weather').disabled=true;
 try{
  const res=await fetch('/api/leafcutter-release-weather?mode=garden-evidence&site='+encodeURIComponent(s.siteId));
  if(!res.ok)throw Error('Weather');const data=await res.json();if(v!==weatherVersion)return;
  const t=Date.parse(data.issuedAt),age=Date.now()-t;
  if(data.schema!=='garden-weather-evidence-v1'||data.siteId!==s.siteId||!['AVAILABLE','PARTIAL'].includes(data.status)||!Number.isFinite(t)||age<0||age>18*3600000||!Array.isArray(data.nights)||data.provider!=='National Weather Service')throw Error('Unverified');
  const nights=data.nights.filter(n=>iso(n.date)&&n.coverage==='complete'&&Number.isFinite(n.lowF)&&n.lowF>=-80&&n.lowF<=140).slice(0,7);
  status.textContent='NWS regional forecast for '+places[s.siteId]+' · issued '+new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:data.zone,timeZoneName:'short'}).format(new Date(t))+'.';
  if(!nights.length){area.appendChild(node('p','No complete overnight forecast available. Check the local forecast before acting.'));return;}
  const cold=nights.reduce((a,b)=>a.lowF<=b.lowF?a:b);
  area.appendChild(node('p','Coldest complete night: '+Math.round(cold.lowF)+'°F, '+fmt(cold.date),'gs-range'));
  const list=node('ul',undefined,'gs-night-list');
  for(const n of nights){const li=node('li');li.append(node('span',fmt(n.date)),node('strong',Math.round(n.lowF)+'°F'),node('small',n.lowF<=32?'At or below freezing':n.lowF<=36?'Watch for local frost':'Regional forecast only'));list.appendChild(li);}
  area.appendChild(list);area.appendChild(node('p','Even above freezing, plant surfaces can cool below the regional air forecast. Readings cover 6 p.m. to 9 a.m. local time; not your garden sensor.','gs-muted'));
 }catch{if(v===weatherVersion)status.textContent='The current forecast is unavailable or stale. Check the official forecast and your own garden before acting.';}
 finally{if(v===weatherVersion)get('gs-weather').disabled=false;}
});
let started=false;function open(){if(root.open&&!started){started=true;run(false);}}
root.addEventListener('toggle',open);if(location.hash==='#growing-season')root.open=true;window.addEventListener('hashchange',()=>{if(location.hash==='#growing-season')root.open=true;});open();
})();
