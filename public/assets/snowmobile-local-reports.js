/* Source-dated local groomer desk, deliberately outside ride-score/routing. */
(function(){
 'use strict';
 const el=document.getElementById('localClubDesk');
 if(!el)return;
 const region=window.SNOWMOBILE_REGION;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateLabel=iso=>{
   if(!/^\d{4}-\d\d-\d\d$/.test(iso||''))return 'Not dated';
   const d=new Date(iso+'T12:00:00Z');
   return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d):'Not dated';
 };
 const track=(name,params={})=>{try{window.gtag?.('event',name,params)}catch{}};
 const cards=reports=>reports.map(r=>{
   const recent=r.state==='RECENT',aging=r.state==='AGING',stale=r.state==='STALE',conflict=r.state==='DATE_CONFLICT',available=r.state!=='UNAVAILABLE';
   const status=conflict?'Report header and narrative dates disagree — verify directly':recent?'Published within 3 days':aging?'Published 4–7 days ago':stale?'Old report — do not use as current conditions':r.state==='UNDATED'?'No dated report verified':'Source could not be checked';
   const groom=r.groomingFreshness==='RECENT'?'Groomed within 3 days ('+dateLabel(r.lastGroomedAt)+')':
     r.groomingFreshness==='AGING'?'Last grooming report '+dateLabel(r.lastGroomedAt)+' (aging)':
     r.lastGroomedAt?'Last grooming listed '+dateLabel(r.lastGroomedAt)+' — not current':'No current dated grooming evidence';
   const condition=r.condition&&recent?'<p class="club-wire-condition">Club condition: <strong>'+esc(r.condition)+'</strong> (local report only; verify DNR restrictions)</p>':'';
   const conflictDetail=conflict?'<p class="club-wire-groom"><strong>Older narrative date:</strong> '+(r.narrativeAt?dateLabel(r.narrativeAt):'unknown')+'. The source header and first dated groomer note do not agree. No current condition or grooming claim is accepted.</p>':'';
   return '<article class="club-wire-card"><div class="club-wire-header"><strong>'+esc(r.name)+'</strong>'+
      '<span class="club-wire-state '+(recent?'club-wire-recent':aging?'club-wire-aging':'club-wire-old')+'">'+esc(status)+'</span></div>'+
      '<p class="club-wire-scope">'+esc(r.scope)+'</p><p class="club-wire-date">Last club report: '+(r.reportedAt?dateLabel(r.reportedAt):'not verified')+'</p>'+
      (available?'<p class="club-wire-groom">'+esc(groom)+'</p>':'<p class="club-wire-groom">The club page could not be retrieved. Check the source directly.</p>')+conflictDetail+condition+
      '<a href="'+esc(r.url)+'" target="_blank" rel="noopener" data-club-wire="'+esc(r.name)+'">Read the club report</a></article>';
 }).join('');
 async function load(){
  const status=document.getElementById('localClubStatus'),list=document.getElementById('localClubReports');
  if(!status||!list)return;
  if(!region){status.textContent='Local club sources unavailable.';return;}
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),13000);
  try{
   const response=await fetch('/api/snowmobile-local-reports?region='+encodeURIComponent(region),{signal:ctrl.signal});
   const data=await response.json();
   if(!response.ok||data.region!==region||!Array.isArray(data.reports))throw Error('source desk unavailable');
   list.innerHTML=cards(data.reports);
   const current=Number(data.totals?.recent)||0,conflicts=Number(data.totals?.conflicts)||0,checked=data.checkedAt?
     new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'}).format(new Date(data.checkedAt)):'time unavailable';
   status.innerHTML=(current===0?'<strong>No recent club condition report verified in these monitored sources.</strong> ':'' )+
     esc(data.totals?.available||0)+' of '+esc(data.totals?.monitored||data.reports.length)+' local report pages retrieved · sources checked '+esc(checked)+
     '. A source-check time is not a trail observation date.'+(conflicts?' <strong>'+conflicts+' report header/narrative date conflict'+(conflicts===1?'':'s')+' requires manual review.</strong>':'');
   track('snowmobile_club_desk_loaded',{region,monitored:data.reports.length,recent:current});
  }catch{
   status.innerHTML='Local club postings could not be checked. Verify conditions directly in the <a href="https://misorva.org/trail-report/" target="_blank" rel="noopener">MISORVA groomer directory</a>'+ (region==='keweenaw-copper-country'?' or the <a href="https://www.keweenawsnowmobileclub.com/trail-conditions/" target="_blank" rel="noopener">Keweenaw Snowmobile Club trail conditions</a>':'') +' and the <a href="https://www.michigan.gov/dnr/things-to-do/snowmobiling/where" target="_blank" rel="noopener">Michigan DNR official map</a>. No local surface evidence has been inferred.';
   list.innerHTML='';track('snowmobile_club_desk_error',{region});
  }finally{clearTimeout(timeout)}
 }
 el.addEventListener('click',event=>{
  const a=event.target?.closest?.('[data-club-wire]');if(a)track('snowmobile_local_report_open',{region,club:a.getAttribute('data-club-wire')});
 });
 load();
})();
