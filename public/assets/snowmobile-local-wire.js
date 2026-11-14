/* Local snowmobile club reports: a read-only source desk.
 * Does not change the official DNR closure check or the Rust/JS route score.
 * The report timestamp (not fetch time) controls freshness. */
(function(){
'use strict';
const el=document.getElementById('clubWire');if(!el)return;
const region=el.getAttribute('data-region');
if(!region||!/^[a-z-]+$/.test(region))return;
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function safeUrl(url){
 try{const u=new URL(url);return u.protocol==='https:'&&['misorva.org','www.keweenawsnowmobileclub.com'].includes(u.hostname)?u.href:null;}catch{return null;}
}
function fmtDay(iso){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)))return 'date not verified';
 const t=Date.parse(iso+'T12:00:00Z');return Number.isFinite(t)?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(t):'date not verified';
}
function fmtChecked(iso){
 const t=Date.parse(iso);return Number.isFinite(t)?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(t):'time unavailable';
}
const statusCopy={
 RECENT:'Recently dated local report',
 AGING:'Aging local report — verify directly',
 ARCHIVED:'Archived report — not current conditions',
 DATE_CONFLICT:'Report dates disagree — not current evidence',
 UNVERIFIED_DATE:'Date unverified — do not use as current conditions',
 UNAVAILABLE:'Source could not be checked'
};
function entry(r){
 const status=statusCopy[r.state]||'Source status unavailable';
 const url=safeUrl(r.url);
 const historic=r.state==='ARCHIVED'||r.state==='DATE_CONFLICT'||r.state==='AGING';
 const condition=r.currentCondition&&r.state==='RECENT'&&window.SNOWMOBILE_WIRE_SEASON_ACTIVE===true?
  '<p class="club-wire-condition">Local source reports: '+esc(r.currentCondition)+'. Applies only to the named club area, not a route-wide verdict.</p>':'';
 const oldCondition=historic&&r.archivedCondition?'<p class="club-wire-small">Archived source condition field: '+esc(r.archivedCondition)+' — <strong>not a current rating</strong>.</p>':'';
 const age=Number.isInteger(r.reportAgeDays)?' · '+r.reportAgeDays+' days old':'';
 const source=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener" data-source-name="'+esc(r.name)+'">Read the original club report</a>':'';
 const staleTime=r.reportedDate?fmtDay(r.reportedDate)+age:'No trustworthy report date';
 const groom=r.groomedDate?'<p class="club-wire-small">Source grooming field dated '+fmtDay(r.groomedDate)+'; not a live groomer position.</p>':'';
 return '<article class="club-wire-card club-wire-'+esc(r.state||'UNAVAILABLE')+'"><div class="club-wire-head"><strong>'+esc(r.name)+'</strong><span>'+esc(status)+'</span></div>'+
   '<p class="club-wire-small">Covers: '+esc(r.area)+'</p><p class="club-wire-age"><strong>Source reported:</strong> '+esc(staleTime)+'</p>'+
   (r.state==='DATE_CONFLICT'?'<p class="club-wire-small">The source header is newer than a dated narrative. Both require manual confirmation.</p>':'')+
   condition+oldCondition+groom+'<div class="club-wire-actions">'+source+'</div></article>';
}
function fallback(){
 el.innerHTML='<h3>Club report source desk</h3><p class="club-wire-alert">Club report timestamps could not be verified. No current local trail condition is being claimed. Use the dated local club links below and the Michigan DNR closure map before riding.</p>';
}
async function load(){
 el.innerHTML='<h3>Local club report dates</h3><p class="club-wire-small">Checking the source’s own report date, not just when this page was refreshed…</p>';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),11500);
 try{
  const response=await fetch('/api/snowmobile-club-wire?region='+encodeURIComponent(region),{signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Local reports unavailable');
  const body=await response.json();
  if(!Array.isArray(body?.reports)||body.region!==region||!body.reports.length)throw Error('Unexpected local report feed');
  window.SNOWMOBILE_WIRE_SEASON_ACTIVE=body.seasonActive===true;
  const good=body.reports.filter(r=>r.state==='RECENT'||r.state==='AGING').length;
  const archived=body.reports.filter(r=>r.state==='ARCHIVED'||r.state==='DATE_CONFLICT').length;
  const fail=body.reports.filter(r=>r.state==='UNAVAILABLE'||r.state==='UNVERIFIED_DATE').length;
  const intro=body.seasonActive?'DNR trail season is underway. Check the exact local report and legal closures before riding.':'Pre-season: Michigan designated trails do not open until December 1. These reports are historical context, not permission to ride.';
  const counts=good+' recent/aging, '+archived+' archived/conflicting, '+fail+' unavailable/undated.';
  el.innerHTML='<h3>Local club report dates</h3><p class="club-wire-small">'+esc(intro)+'</p>'+
    '<p class="club-wire-summary">'+esc(counts)+'</p><div class="club-wire-grid">'+body.reports.map(entry).join('')+'</div>'+
    '<p class="club-wire-foot">Source checked '+esc(fmtChecked(body.sourceCheckedAt))+'; <strong>this is not the club report date</strong>. Third-party reports may be incomplete or outdated. No local club status overrides Michigan DNR trail closures, proves grooming today, or changes this region’s ride score. <a href="https://www.michigan.gov/dnr/things-to-do/snowmobiling/trail-reports" target="_blank" rel="noopener">DNR report-source guidance</a>.</p>';
  try{if(typeof window.gtag==='function')window.gtag('event','snowmobile_club_wire_loaded',{region,good,archived,unavailable:fail});}catch{}
 }catch{fallback();}
 finally{clearTimeout(timer);}
}
load();
})();
