(function(){
'use strict';
var form=document.getElementById('plan-form'),body=document.getElementById('result-body'),status=document.getElementById('status'),button=document.getElementById('go');
function todayEastern(){var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now()+3600000));var o={};parts.forEach(function(p){o[p.type]=p.value;});return{date:o.year+'-'+o.month+'-'+o.day,hour:Number(o.hour)};}
var t=todayEastern();document.getElementById('date').value=t.date;document.getElementById('time').value=String(t.hour).padStart(2,'0')+':00';
function emit(name){try{if(typeof window.gtag==='function')window.gtag('event',name,{page_id:'niagara-falls-today'});if(typeof window.va==='function')window.va('event',{name:name});}catch(e){}}
function safe(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function link(url,label){return '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+' ↗</a>';}
function explain(reason){
 return {PUBLISHED_CLOSED:'Operator-published closure for this date',HOURS_NOT_VERIFIED:'Date-specific operator hours cannot be verified',ACCESS_ROUTE_UNVERIFIED:'Full step-free accessibility cannot be confirmed',OVER_BUDGET:'Would exceed your admission budget',PRICE_NOT_VERIFIED:'Cost cannot be verified against your budget',BORDER_NOT_PLANNED:'On the other side of the international border',LOWER_FIT_OR_TIME:'Less suitable for your available time or priorities'}[reason]||reason;
}
function mediaFor(id){var root=window.NiagaraFallsMedia;return root&&root.stops&&root.stops[id]||null;}
function stopMedia(id){
 var m=mediaFor(id);
 if(!m)return '';
 return '<figure class="stop-visual"><img loading="lazy" decoding="async" src="'+safe(m.src)+'" alt="'+safe(m.alt)+'" width="960" height="640"><figcaption>Place-specific photograph: <a href="'+safe(m.page)+'" target="_blank" rel="noopener">'+safe(m.author)+'</a> · <a href="'+safe(m.licenseUrl)+'" target="_blank" rel="noopener">'+safe(m.license)+'</a> · cropped; illustrative, not live</figcaption></figure>';
}
function bindFilms(){
 document.querySelectorAll('.film-launch[data-video-id]').forEach(function(button){
  button.addEventListener('click',function(){
   var id=button.getAttribute('data-video-id');
   if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;
   var iframe=document.createElement('iframe');
   iframe.title=button.getAttribute('aria-label');
   iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
   iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
   iframe.setAttribute('allowfullscreen','');
   iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
   button.replaceWith(iframe);
   emit('niagara_experience_video_play');
  },{once:true});
 });
}
function draw(r){
 var stops=r.stops||[],first=stops[0],currency=r.side==='US'?'USD':'CAD';
 var admission=r.costs[0],unknownPrices=!admission.prices_complete;
 var totalLabel=currency+' '+Number(admission.known_admission_total).toFixed(2)+(unknownPrices?' + unknown':'');
 var out='<div class="result-content"><div class="verdict"><span class="label">'+safe(r.confidence)+' CONFIDENCE · '+safe(r.status.replace(/_/g,' '))+'</span><h3>'+safe(r.verdict)+'</h3><p>Published schedules are not live opening confirmations. No invented queues, weather or border delays.</p></div>';
 if(first)out+='<div class="first"><div><small>YOUR FIRST ACTION</small><b>'+safe(first.name)+'</b><small>Arrive approximately '+safe(first.arrival)+' Eastern · '+safe(r.visit_local_date)+'</small></div><a class="action" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(first.location)+'" target="_blank" rel="noopener">Open directions ↗</a></div>';
 out+='<div class="stats"><div class="stat"><strong>'+stops.length+'</strong><span>Planned stops</span></div><div class="stat"><strong>'+safe(r.timeline.contingency_minutes)+' min</strong><span>Time buffer</span></div><div class="stat"><strong>'+safe(totalLabel)+'</strong><span>'+(unknownPrices?'Known subtotal · more due':'Known admission subtotal')+'</span></div></div>';
 out+='<div class="sectitle">Your route · Eastern local time</div>';
 if(stops.length)stops.forEach(function(s,i){out+='<article class="stop"><div class="when">'+safe(s.arrival)+'–'+safe(s.departure)+' · stop '+(i+1)+'</div><h4>'+safe(s.name)+'</h4>'+stopMedia(s.id)+(mediaFor(s.id)?'<p class="stop-story">'+safe(mediaFor(s.id).experience)+'</p><p class="stop-field-note"><strong>What to notice:</strong> '+safe(mediaFor(s.id).notice)+'</p><p class="stop-field-note"><strong>Field tip:</strong> '+safe(mediaFor(s.id).tip)+'</p>':'<p>'+safe(s.description)+'</p>')+'<div class="meta">'+safe(s.transfer_minutes)+' min estimated transfer · '+safe(s.dwell_minutes)+' min conservative visit · '+(s.type==='paid'?'Paid admission':'Free viewpoint')+'</div><p><span class="flag">'+safe(s.schedule.status.replace(/_/g,' '))+'</span> '+safe(s.schedule.lastAdmission?'Last published ticket cutoff '+s.schedule.lastAdmission:(s.schedule.open&&s.schedule.close?'Published hours '+s.schedule.open+'–'+s.schedule.close+'; confirm admission':'Check park access notices'))+'</p>'+link(s.official_url,'Official attraction information')+'</article>';});
 else out+='<p>There is no safe confirmed stop for this request. Check official park advisories.</p>';
 if(r.schedule_feed){
  var sf=r.schedule_feed;
  out+='<div class="caveat"><strong>Niagara Parks date-specific calendar:</strong> '+safe(sf.status.replace(/_/g,' '))+'. '+(sf.checked_at?'Published hours retrieved '+safe(new Date(sf.checked_at).toLocaleString('en-US',{timeZone:'America/Toronto',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+' Eastern. ':'No current source check available. ')+safe(sf.caveat||'')+' '+link(sf.source_url,'Official hours by date')+'</div>';
 }
 if(r.weather){
  var w=r.weather;
  out+='<div class="caveat"><strong>Official regional weather:</strong> '+safe(w.status.replace(/_/g,' '))+'. '+safe(w.caveat||'')+' '+link(w.authority_url,'Check official weather');
  if(w.alerts&&w.alerts.length){
   out+='<ul class="excluded">';
   w.alerts.slice(0,4).forEach(function(a){out+='<li><strong>'+safe(a.headline)+'</strong> · '+safe(a.severity)+'</li>';});
   out+='</ul>';
  }
  out+='</div>';
 }
 out+='<div class="caveat"><strong>Admission and travel limits:</strong> '+safe(r.unknowns.join(' '))+' Parking and applicable taxes are not included in the subtotal. '+(unknownPrices?'<strong>Some selected attractions have unknown admission prices; do not treat this subtotal as your trip total.</strong>':'')+'</div>';
 if(r.excluded.length){out+='<p class="sectitle">What to skip, and why</p><ul class="excluded">';r.excluded.slice(0,4).forEach(function(x){out+='<li><strong>'+safe(x.name)+':</strong> '+safe(explain(x.reason))+' '+link(x.source,'check source')+'</li>';});out+='</ul>';}
 if(r.alternatives.length){out+='<details class="source-details"><summary>Other feasible sequences</summary><ul>';r.alternatives.forEach(function(a){out+='<li>'+safe(a.label)+'</li>';});out+='</ul></details>';}
 out+='<details class="source-details"><summary>Published source status and limitations</summary><p>'+safe(r.what_changed)+'</p><ul>';r.source_health.forEach(function(x){out+='<li>'+safe(x.entity_id)+' — '+safe(x.status)+': '+safe(x.basis)+' ('+safe(x.reviewed)+') '+link(x.source,'operator')+'</li>';});out+='</ul></details>';
 if(r.visit_local_date==='2026-10-12'&&stops.length){out+='<p class="caveat">Tonight: Niagara Parks schedules a 10:00 p.m. fireworks show, <strong>weather permitting</strong>. It is not a verified live event. '+link('https://www.niagaraparks.com/events/event/niagara-falls-fireworks-series','Official fireworks details')+'</p>';}
 out+='<div class="small-links">'+link(r.links_to_official.border,'Bridge status')+link(r.links_to_official.rainbow,'Rainbow timing')+link(r.side==='US'?r.links_to_official.us:r.links_to_official.ca,'Official operating updates')+'</div></div>';
 body.innerHTML=out;body.setAttribute('aria-busy','false');status.textContent='One same-side visit plan; details and alternatives below.';emit(stops.length?'niagara_plan_success':'niagara_plan_no_feasible');
}
async function submit(ev){if(ev)ev.preventDefault();button.disabled=true;body.setAttribute('aria-busy','true');status.textContent='Calculating a conservative route…';emit('niagara_plan_submit');
 var d=new FormData(form);var data={visit_date:d.get('visit_date'),arrival_local:d.get('arrival_local'),duration_minutes:d.get('custom_minutes')?Number(d.get('custom_minutes')):Number(d.get('duration_minutes')),starting_side:d.get('starting_side'),priority:d.get('priority'),adults:Number(d.get('adults')),youth:Number(d.get('youth')),budget:d.get('budget')===''?null:Number(d.get('budget')),step_free:d.has('step_free'),low_walking:d.has('low_walking')};
 try{var response=await fetch('/api/niagara-falls-today',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});var result=await response.json();if(!response.ok)throw new Error(result.error||'Service unavailable');draw(result);}catch(e){body.innerHTML='<div class="result-content"><div class="caveat"><strong>Planner currently unavailable.</strong> '+safe(e.message)+' No opening claim can be made. Check the <a href="https://www.niagarafallsstatepark.com/" target="_blank" rel="noopener">U.S. operator</a> or <a href="https://www.niagaraparks.com/hours-of-operations/" target="_blank" rel="noopener">Canadian hours</a>.</div></div>';body.setAttribute('aria-busy','false');status.textContent='Source check needed.';emit('niagara_source_degraded');}finally{button.disabled=false;}
}
form.addEventListener('submit',submit);
document.querySelectorAll('input[name=duration_minutes],input[name=starting_side]').forEach(function(el){el.addEventListener('change',function(){emit('niagara_replan');submit();});});
bindFilms();emit('niagara_planner_view');submit();
})();
