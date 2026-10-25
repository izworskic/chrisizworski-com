'use strict';
/**
 * Multi-year snow history: NOAA NCEI measured STATION snow depth,
 * paired to historical NASA MODIS imagery (not a derived snow index).
 * No access/plowing claims. No requests until the user presses Compare.
 */
(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const memo=new Map();let controller=null,serial=0;
 const month={'01-15':'Jan 15','02-15':'Feb 15','03-15':'Mar 15'};
 const doc='https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation';
 function render(root,route){
  if(!root||!route?.id)return;
  if(controller)controller.abort();serial++;
  root.innerHTML='<div class="history-head"><div><p class="eyebrow">Four winters · one nearby reporting station</p><h3>How deep was the snow?</h3></div></div>'+
   '<p class="history-intro">Compare real NOAA daily snow-depth <strong>station observations</strong> for the same week in four winters, then load each year’s historical NASA satellite image. No estimates for unreported dates.</p>'+
   '<div class="history-actions"><label for="history-anchor">Compare week of</label><select id="history-anchor">'+
     Object.entries(month).map(([v,n])=>'<option value="'+v+'"'+(v==='02-15'?' selected':'')+'>'+n+'</option>').join('')+
   '</select><button type="button" class="action-primary" id="history-compare">Compare 4 winters</button></div>'+
   '<div id="history-results" role="status" aria-live="polite"><p class="muted">Choose a week and compare archived station snow-depth measurements. Nothing is inferred from satellite colors.</p></div>'+
   '<p class="history-source">Source: <a href="'+doc+'" target="_blank" rel="noopener">NOAA NCEI GHCN-Daily (SNWD)</a>. NASA MODIS images are a separate dated view. Station observations do not verify this trail, any parking lot, or road access.</p>';
  $('history-compare')?.addEventListener('click',()=>load(root,route));
 }
 async function load(root,route){
  const anchor=$('history-anchor')?.value;
  if(!Object.prototype.hasOwnProperty.call(month,anchor))return;
  const out=$('history-results'),btn=$('history-compare');
  if(!out||!btn)return;
  const key=route.id+'|'+anchor,hit=memo.get(key),token=++serial;
  if(controller)controller.abort();
  controller=new AbortController();
  btn.disabled=true;out.textContent='Reading four historical NOAA station observation windows…';
  try{
   let data;
   if(hit && Date.now()-hit.t<86400000)data=hit.data;
   else {
    const qs=new URLSearchParams({mode:'history',route:route.id,anchor});
    const r=await fetch('/api/winter-hike-lab?'+qs.toString(),
      {headers:{Accept:'application/json'},signal:controller.signal});
    if(!r.ok)throw Error('NOAA historical station service returned '+r.status);
    data=await r.json();
    if(data?.routeId!==route.id||data?.anchor!==anchor||!Array.isArray(data.years))
     throw Error('Unexpected source response');
    if(memo.size>20)memo.clear();
    memo.set(key,{t:Date.now(),data});
   }
   if(token!==serial||!root.isConnected)return;
   out.innerHTML=historyMarkup(data);
   out.querySelectorAll('[data-modis-day]').forEach(button=>button.addEventListener('click',()=>{
    const day=button.getAttribute('data-modis-day');
    const ok=window.WinterHikeSatelliteUI?.goToDate(day,'snowCover');
    if(!ok)button.textContent='Satellite date unavailable';
   }));
  }catch(err){
   if(token!==serial)return;
   out.textContent=err?.name==='AbortError'?'': 'NOAA station observations unavailable for this request. No history values substituted; use the NOAA source link below.';
  }finally{if(token===serial)btn.disabled=false}
 }
 function days(center) {
  const t=Date.parse(center+'T12:00:00Z');
  return Number.isFinite(t)?Array.from({length:7},(_,i)=>new Date(t+(i-3)*86400000).toISOString().slice(0,10)):[];
 }
 function historyMarkup(data){
  const yrs=Array.isArray(data.years)?data.years.slice(0,4):[];
  const station=data.station,observed=yrs.flatMap(y=>Array.isArray(y.days)?y.days:[]);
  const valid=observed.map(r=>Number(r.inches)).filter(n=>Number.isFinite(n)&&n>=0&&n<=250);
  const max=Math.max(1,...valid);
  const topper=station?'<p class="history-station"><strong>'+esc(station.name)+'</strong> · '+esc(station.miles)+' miles from the trail-area reference · '+esc(station.coverageWinters)+' of '+yrs.length+' winters represented</p>':
   '<p class="history-station">No qualifying NOAA snow-depth reporting station within 40 miles returned measurements for these four weeks. Historical satellite images can still be explored.</p>';
  const rows=yrs.map(y=>{
   const series=new Map((y.days||[]).map(d=>[d.date,d.inches]));
   const daily=days(y.center);
   const marks=daily.map(d=>{
    const v=series.get(d),ok=typeof v==='number'&&Number.isFinite(v);
    const n=ok?Math.min(100,Math.round(v/max*100)):0;
    const label=ok?Number(v).toFixed(v%1?1:0)+' in':'No report';
    return '<div class="history-day" title="'+esc(d)+' · '+esc(label)+'" aria-label="'+esc(d)+' · '+esc(label)+'">'+
     '<div class="history-stick"'+(ok?'':' data-missing="true"')+'>'+
      (ok?'<div class="history-bar" style="height:'+Math.max(v===0?0:6,n)+'%"></div>':'<span class="history-no-report">—</span>')+
     '</div><small>'+esc(d.slice(8))+'</small><span class="history-number">'+esc(ok?label:'—')+'</span></div>';
   }).join('');
   const status=y.status==='source-unavailable'?'NOAA source unavailable':
    y.reportedDays?'Reported on '+y.reportedDays+' of 7 days':'No SNWD reports at selected station';
   const peak=y.peakObservedIn===null||y.peakObservedIn===undefined?'No measured peak':'Highest reported '+y.peakObservedIn+' in';
   const date=esc(y.center);
   return '<div class="history-year"><div class="history-year-heading"><strong>'+esc(y.year)+'</strong>'+
    '<span>'+esc(status)+'</span></div>'+
    '<div class="history-observed-bars" role="img" aria-label="NOAA station snow depth for seven days centered '+date+'">'+marks+'</div>'+
    '<div class="history-foot"><span>'+esc(peak)+' (not a trail measurement)</span>'+
    '<button type="button" class="history-map-day" data-modis-day="'+date+'">View '+date+' in NASA imagery</button></div></div>';
  }).join('');
  return '<div class="history-dataset">'+topper+
   '<p class="history-chart-caption">NOAA reported daily snow depth (inches). The vertical scale is shared across all four winters; gaps indicate missing observations, not zero snow. Calendar day shown beneath each bar.</p>'+
   rows+'<p class="history-disclaimer">'+esc(data.caveat||'Station readings are not trail readings; no parking inference.')+'</p></div>';
 }
 window.WinterHikeHistory={render,historyMarkup};
})();
