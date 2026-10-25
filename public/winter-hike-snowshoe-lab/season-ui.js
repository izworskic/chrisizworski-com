'use strict';
/**
 * NOAA GHCN-Daily station winter-history chart. The bars illustrate how often
 * nearby station measurements exceeded 6in, not likelihood of snowshoe access.
 */
(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let controller=null,serial=0;
 const memo=new Map();
 const statusText={
  'historically-frequent-6in-station-snow':'Frequently measured ≥6 in at station',
  'variable-or-lower-station-snow':'Variable / less persistent in observations',
  'insufficient-history':'Not enough station reports'
 };
 function render(root,route){
  if(!root||!route?.id)return;
  serial++;if(controller)controller.abort();
  root.innerHTML='<div class="season-head"><p class="eyebrow">Season-long snow history · Nov–Apr</p><h3>Which weeks have historically held snow?</h3></div>'+
   '<p class="season-intro">Compare four completed winters using daily snow depth measured at <strong>one nearby NOAA station</strong>. Inspect when at least 6 inches were repeatedly reported, and where the evidence is too incomplete to call a pattern. This is <strong>not</strong> a forecast or a trail recommendation.</p>'+
   '<button type="button" class="action-primary" id="season-compare">Analyze full winter history</button>'+
   '<div id="season-results" role="region" aria-label="Weekly winter snow-depth evidence" aria-live="polite"><p class="muted">Load observed November–April station reports. Missing reports will never be shown as snow-free days.</p></div>';
  $('season-compare')?.addEventListener('click',()=>load(root,route));
 }
 async function load(root,route){
  const out=$('season-results'),btn=$('season-compare');
  if(!out||!btn)return;
  const token=++serial,hit=memo.get(route.id);
  if(controller)controller.abort();controller=new AbortController();
  btn.disabled=true;out.textContent='Reading NOAA measurements across four completed winters…';
  try{
   let data;
   if(hit&&Date.now()-hit.saved<86400000)data=hit.data;
   else {
    const q=new URLSearchParams({mode:'season',route:route.id});
    const response=await fetch('/api/winter-hike-lab?'+q.toString(),{
     headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw Error('NOAA full-winter endpoint '+response.status);
    data=await response.json();
    if(data.routeId!==route.id||data.parkingVerified!==false||!Array.isArray(data.weeks))
     throw Error('Unexpected historical evidence response');
    if(memo.size>20)memo.clear();
    memo.set(route.id,{saved:Date.now(),data});
   }
   if(token!==serial||!root.isConnected)return;
   out.innerHTML=markup(data);
   out.querySelectorAll('[data-season-week]').forEach(node=>node.addEventListener('click',()=>{
    const n=Number(node.dataset.seasonWeek);
    const w=data.weeks.find(w=>w.week===n);
    if(!w)return;
    out.querySelectorAll('[data-season-week]').forEach(b=>b.setAttribute('aria-pressed',String(b===node)));
    const detail=out.querySelector('#season-week-detail');
    if(detail)detail.innerHTML=weekDetail(w);
    attachNASA(detail);
   }));
   attachNASA(out);
  }catch(e){
   if(token!==serial)return;
   out.textContent=e?.name==='AbortError'?'':'NOAA daily snow-depth history unavailable. No station observations were invented; the NASA imagery viewer above remains independently usable.';
  }finally{if(token===serial)btn.disabled=false}
 }
 function attachNASA(root){
  root?.querySelectorAll('[data-season-modis]').forEach(node=>node.addEventListener('click',()=>{
   const day=node.getAttribute('data-season-modis');
   const valid=window.WinterHikeSatelliteUI?.goToDate(day,'snowCover');
   if(!valid)node.textContent='NASA imagery unavailable for this date';
  }));
 }
 function weekDetail(week){
  const rows=(week.rows||[]).map(row=>{
   const observed=row.reported+' / '+row.total;
   const count=row.depthSixInDays;
   const note=row.eligible?(row.qualifies?'Frequent ≥6 in observations':'Less persistent ≥6 in observations'):'Not enough observations';
   return '<div class="season-evidence-row"><div><strong>'+esc(row.year)+'</strong> · reported '+esc(observed)+' days · '+esc(count)+' measured ≥6 in<br><span>'+esc(note)+'</span></div>'+
    '<button type="button" class="season-map-date" data-season-modis="'+esc(row.sampleDate)+'">View NASA '+esc(row.sampleDate)+'</button></div>';
  }).join('');
  return '<h4>Week '+esc(week.week)+' · '+esc(week.label.replace(' to ',' – '))+'</h4>'+
   '<p>'+esc(statusText[week.status]||'Historical evidence')+' · '+esc(week.qualifyingWinters)+' of '+esc(week.reportWinters)+' sufficiently reported winters showed sustained ≥6 in station snow.</p>'+
   rows+'<p class="season-small">NASA imagery is regional historical context. It does not directly measure this station or verify a trail, road, or parking area.</p>';
 }
 function markup(data){
  const station=data.station;
  if(!station||!data.weeks.length)
   return '<div class="season-unknown"><strong>No defensible full-season comparison</strong><p>'+esc(data.caveat||'A consistent nearby NOAA station was not found in the completed winters.')+'</p></div>';
  const weak=data.coverageWinters120Days<3;
  const sc='<p class="season-provenance"><strong>'+esc(station.name)+'</strong> · '+esc(station.miles)+
   ' miles straight-line from the trail-area reference · '+esc(data.yearsAnalyzed)+' completed winters · '+
   esc(data.totalObservedDays)+' / '+esc(data.totalPossibleDays)+' valid daily reports'+
   (weak?' · **Sparse season-long coverage**':'')+'</p>';
  const cards=data.weeks.map((w,i)=>{
   const state=w.status==='historically-frequent-6in-station-snow'?'frequent':
    w.status==='insufficient-history'?'insufficient':'variable';
   const height=state==='insufficient'?0:Math.round(w.qualifyingWinters/Math.max(1,w.reportWinters)*100);
   const label='Week '+w.week+', '+w.label+', '+(statusText[w.status]||w.status)+
    ', '+w.qualifyingWinters+' of '+w.reportWinters+' evaluable winters qualifying';
   return '<button type="button" class="season-week" data-season-week="'+esc(w.week)+'" data-snow-status="'+esc(state)+'" aria-pressed="'+String(i===0)+'" aria-label="'+esc(label)+'">'+
    '<span class="season-week-bar"><span class="season-week-fill" style="height:'+height+'%"></span></span>'+
    '<span class="season-week-label">'+esc(w.firstDay.slice(0,2)+'/'+w.firstDay.slice(3))+'</span></button>';
  }).join('');
  const best=(data.topHistoricallyCoveredWeeks||[]).map(w=>esc(w.label)+' ('+w.qualifyingWinters+'/'+w.reportWinters+' winters)');
  const recommended=best.length?
   '<p class="season-summary">Weeks with recurring ≥6 in station snow cover: <strong>'+best.join(' · ')+'</strong></p>':
   '<p class="season-summary">No week cleared the three-winter minimum evidence and recurring ≥6 in threshold. That does not establish snow-free conditions.</p>';
  const footer=(data.winterYears||[]).map(w=>'<span>'+esc(w.year)+': '+esc(w.reportedDays)+'/'+esc(w.possibleDays)+' days</span>').join('');
  return '<div class="season-report">'+sc+
   '<div class="season-legend"><span><i class="season-key frequent"></i> Frequent station snow</span>'+
    '<span><i class="season-key variable"></i> Variable/lower</span><span><i class="season-key insufficient"></i> Insufficient reports</span></div>'+
   '<div class="season-strip" role="group" aria-label="26 seven-day historical winter comparison columns">'+cards+'</div>'+
   '<p class="season-small">Select a week to see each winter’s measured days. Week labels start November 1; February 29 is excluded. Bars are observed winter counts, not chances of a successful trip.</p>'+
   recommended+'<div id="season-week-detail" class="season-week-detail">'+weekDetail(data.weeks[0])+'</div>'+
   '<div class="season-year-coverage">'+footer+'</div>'+
   '<p class="season-disclaimer">'+esc(data.caveat||'These NOAA station readings are not direct trail measurements or parking observations.')+'</p></div>';
 }
 window.WinterHikeSeason={render,markup,weekDetail};
})();
