/* Existing local club report API provides dated evidence. A town link is not a
 * town-specific surface observation; never borrow a regional score or NWS snow. */
(function(){
 'use strict';
 const region=window.SNOWMOBILE_REGION;
 const cards=[...document.querySelectorAll('[data-town-evidence]')];
 if(!region||!cards.length)return;
 const dateLabel=iso=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return 'undated';
   const d=new Date(iso+'T12:00:00Z');
   return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d) : 'undated';
 };
 const track=(event,params)=>{try{window.gtag?.('event',event,params);}catch{}};
 const unknown='No current dated trail-surface evidence verified here. Check the original club report, the exact coverage, and DNR closures before riding.';
 function render(data){
   if(data?.region!==region||!Array.isArray(data.reports))return;
   for(const card of cards){
     const host=card.querySelector('[data-town-live]');
     if(!host)continue;
     const club=card.getAttribute('data-town-club');
     const source=club ? data.reports.find(r=>r.name===club) : null;
     if(!source){host.textContent=unknown+' A town-specific reporting club has not been matched in the existing monitored sources.';continue;}
     const sourceDate=source.reportedAt?dateLabel(source.reportedAt):'not verified';
     const state=source.state;
     if(state==='DATE_CONFLICT'){
       host.textContent='The '+club+' report header and narrative dates conflict. No current trail condition or grooming is verified; read the source directly.';
     }else if(state==='RECENT'&&source.condition&&source.reportedAt){
       host.textContent=club+' reported '+source.condition+' on '+sourceDate+' for its local area only. This does not establish conditions on every nearby mapped segment; verify DNR closures and the exact club route.';
     }else if(state==='RECENT'&&source.reportedAt){
       host.textContent=club+' has a dated posting from '+sourceDate+', but no current trail-surface condition has been verified for these nearby segments. Check the club and DNR closure information.';
     }else if(state==='AGING'){
       host.textContent=club+' last reported on '+sourceDate+' (4–7 days old). Conditions can change; no current riding or grooming claim is made. Verify the source and DNR closures.';
     }else if(state==='STALE'){
       host.textContent=club+' last reported on '+sourceDate+' (stale). This cannot describe today’s conditions. '+unknown;
     }else{
       host.textContent=club+' has no verified current dated condition report ('+sourceDate+'). '+unknown;
     }
   }
   track('snowmobile_town_evidence_loaded',{region,town_count:cards.length,report_count:data.reports.length});
 }
 window.addEventListener('snowmobile:local-reports',e=>render(e.detail));
 // Legacy Grayling–Gaylord has no standalone local report desk to fetch this API.
 if(!document.getElementById('localClubDesk')){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),13000);
   fetch('/api/snowmobile-local-reports?region='+encodeURIComponent(region),{signal:controller.signal})
     .then(r=>{if(!r.ok)throw Error('unavailable');return r.json();})
     .then(render).catch(()=>{}).finally(()=>clearTimeout(timer));
 }
})();
