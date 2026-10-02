(()=>{
'use strict';
const API='/api/oregon-coastal-proxy';
const META={
  YAQUINA:{slug:'yaquina-head',name:'Yaquina Head',place:'Newport, Oregon'},
  HAYSTACK:{slug:'haystack-rock',name:'Haystack Rock',place:'Cannon Beach, Oregon'},
  HUG_POINT:{slug:'hug-point',name:'Hug Point',place:'Arch Cape, Oregon'},
  THORS_WELL:{slug:'thors-well',name:"Thor's Well",place:'Cape Perpetua, Oregon'}
};
const EXPERIENCE={
  YAQUINA:{
    type:'Tidepools + lighthouse headland',
    sourceLabel:'BLM visitor guide',
    sourceUrl:'https://www.blm.gov/visit/yaquina-head-outstanding-natural-area',
    scene:'Cobble Beach can become a living intertidal field of anemones, urchins, mussels, barnacles and sea stars, with harbor seals often visible on nearby rocks.',
    notice:'The lighthouse, cliffs and wildlife remain part of the outing even when an official tidepool window is not verified.'
  },
  HAYSTACK:{
    type:'Tidepools + protected marine garden',
    sourceLabel:'HRAP visitor guidance',
    sourceUrl:'https://www.haystackrockawareness.com/planning-your-visit',
    scene:'When the water drops far enough, the base of Haystack Rock opens into protected tidepools with anemones, mussels, sea stars and other intertidal life.',
    notice:'HRAP beach interpreters may be present during the program’s seasonal daytime low-tide schedule; confirm the current schedule before relying on it.'
  },
  HUG_POINT:{
    type:'Lower-tide access walk',
    sourceLabel:'Oregon State Parks visitor guide',
    sourceUrl:'https://stateparks.oregon.gov/index.cfm?do=park.profile&parkId=137',
    scene:'Lower water can turn a simple cove stop into a walk around the point toward a seasonal waterfall, sandstone caves, tidepools and the old stagecoach wheel ruts.',
    notice:'The payoff is around the point, but the route is dynamic: surf, sand and incoming water can change access quickly.'
  },
  THORS_WELL:{
    type:'Wave-energy observation',
    sourceLabel:'City of Yachats visitor context',
    sourceUrl:'https://www.yachatsoregon.org/295/Thors-Well',
    scene:'You are watching a collapsed sea-cave opening cycle with the Pacific: water fills, surges and drains through the basalt instead of producing one guaranteed “magic moment.”',
    notice:'Watch the repeated fill → surge → drain pattern. The tool keeps spectacle interpretation separate from safety and does not turn high tide alone into a viewing promise.'
  }
};
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pacificDate(d=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const g=t=>p.find(x=>x.type===t)?.value;return `${g('year')}-${g('month')}-${g('day')}`}
function plus(ymd,n){const d=new Date(`${ymd}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function kind(status){return ({OFFICIAL_WINDOW:'official',TIDEPOOL_OPPORTUNITY:'threshold',AUTHORITY_THRESHOLD_WINDOW:'threshold',CONSERVATIVE_ACCESS_OPPORTUNITY:'conservative',LOW_TIDE_OPPORTUNITY:'conservative',RESEARCH_ONLY:'research',NO_OPPORTUNITY:'no',HAZARD_VETO:'hazard',SOURCE_CONFLICT:'conflict',SOURCE_STALE:'unavailable',SOURCE_UNAVAILABLE:'unavailable'})[status]||'unavailable'}
function label(d){const s=d?.status;return s==='OFFICIAL_WINDOW'?'Official window':(s==='TIDEPOOL_OPPORTUNITY'||s==='AUTHORITY_THRESHOLD_WINDOW')?'Authority threshold met':(s==='CONSERVATIVE_ACCESS_OPPORTUNITY'||s==='LOW_TIDE_OPPORTUNITY')?'Lower-tide opportunity':s==='RESEARCH_ONLY'?'Conditions only':s==='NO_OPPORTUNITY'?'Not today':s==='HAZARD_VETO'?'Hazard override':s==='SOURCE_CONFLICT'?'Source conflict':s==='SOURCE_STALE'?'Source stale':'Source unavailable'}
function clock(min){if(!Number.isFinite(Number(min)))return null;const n=Number(min),h24=Math.floor(n/60)%24,m=n%60,h=h24%12||12;return `${h}:${String(m).padStart(2,'0')} ${h24>=12?'PM':'AM'}`}
function windowText(w){return w?`${clock(w.start_minute)}–${clock(w.end_minute)}`:null}
function officialWindowsText(d){const windows=Array.isArray(d?.windows)&&d.windows.length?d.windows:(d?.window?[d.window]:[]);return windows.map(windowText).filter(Boolean).join(' or ')||null}
function present(site){const d=site.decision||{},s=d.status;let primary='Current guidance unavailable',secondary='The engine does not have enough current authoritative information to issue this decision.';
if(s==='OFFICIAL_WINDOW'){primary=`Go ${officialWindowsText(d)||'during the published window'}`;secondary="BLM's published tidepool discovery interval controls this decision."}
else if((s==='TIDEPOOL_OPPORTUNITY'||s==='AUTHORITY_THRESHOLD_WINDOW')&&site.site==='HAYSTACK'){primary=d.low_tide_time?`Threshold met near ${d.low_tide_time}`:'Local tidepool threshold met';secondary=`The daylight low is ${Number(d.daylight_low_ft).toFixed(1)} ft MLLW, at or below HRAP's published 1.0 ft threshold.`}
else if(s==='CONSERVATIVE_ACCESS_OPPORTUNITY'||s==='LOW_TIDE_OPPORTUNITY'){primary='Target the lower-tide period';secondary=d.low_tide_time?`Lower tide is around ${d.low_tide_time}. Site geometry and surf vary, so no exact safe-until time is claimed.`:'Low tide improves access, but no defensible exact cutoff is supported.'}
else if(s==='RESEARCH_ONLY'){primary='Conditions available — spectacle window not verified';secondary="Tide and waves matter at Thor's Well, but the evidence does not support an exact production viewing formula."}
else if(s==='NO_OPPORTUNITY'&&d.reason_code==='NO_EXPOSURE'){primary='No official tidepool exposure window today';secondary='BLM publishes No Exposure for this date; the tool does not substitute a generic tide rule.'}
else if(s==='NO_OPPORTUNITY'&&d.reason_code==='DAYLIGHT_LOW_ABOVE_HRAP_THRESHOLD'){primary='Not a tidepool day here';secondary=`The daylight low is ${Number(d.daylight_low_ft).toFixed(1)} ft MLLW, above HRAP's published ≤${Number(d.threshold_ft||1).toFixed(1)} ft threshold.`}
else if(s==='NO_OPPORTUNITY'){primary='Not today';secondary='The controlling site rule does not support an opportunity today.'}
else if(s==='HAZARD_VETO'){primary='Coastal hazard active';secondary='An authoritative coastal hazard overrides the normal opportunity recommendation.'}
else if(s==='SOURCE_CONFLICT'){primary='Official information conflicts';secondary='Authoritative inputs conflict, so the engine fails closed instead of guessing.'}
else if(s==='SOURCE_STALE'){primary='Current official guidance is stale';secondary='The most recent authority source does not cover the selected date.'}
return {primary,secondary,label:label(d),kind:kind(s)}}
function experience(site,date){const d=site.decision||{},s=d.status,x=EXPERIENCE[site.site]||{};let use='Use the decision above as the planning anchor.',fallback='If the primary experience does not line up, keep the visit focused on the parts of the place that do not depend on that claim.',overview=x.scene||'';
if(site.site==='YAQUINA'){
  if(s==='OFFICIAL_WINDOW'){const w=officialWindowsText(d);use=`Anchor the tidepool portion of the visit to ${w||'the published BLM interval'} and start near the beginning of the official window rather than treating the low tide alone as the rule.`;fallback='If the shoreline feels marginal or access is restricted, shift the visit to the lighthouse, paved headland paths and wildlife viewing without extending the tidepool claim.';overview=`Official BLM timing turns Cobble Beach into the tidepool version of the visit; the lighthouse and wildlife keep the headland worthwhile outside that interval.`}
  else if(s==='NO_OPPORTUNITY'){use='Do not turn today into a tidepool mission. The controlling BLM guidance does not publish an exposure opportunity for this date.';fallback='Make it a lighthouse, headland and wildlife visit instead; those parts of Yaquina Head do not require inventing a tidepool window.';overview='Today is the headland-and-lighthouse version of Yaquina Head, not an official tidepool-window day.'}
  else if(s==='SOURCE_STALE'||s==='SOURCE_UNAVAILABLE'||s==='SOURCE_CONFLICT'){use='Treat tidepool timing as unverified. The tool will not replace missing, stale or conflicting BLM guidance with a generic tide formula.';fallback='The reliable fallback is the lighthouse, cliffs, paved walks and wildlife-viewing side of the headland.';overview='The place is still visitable, but the tidepool version is not verified from current BLM guidance.'}
}
if(site.site==='HAYSTACK'){
  if(s==='TIDEPOOL_OPPORTUNITY'||s==='AUTHORITY_THRESHOLD_WINDOW'){use=`Build the tidepool portion around ${d.low_tide_time||'the qualifying daylight low'}. HRAP recommends arriving roughly 60–90 minutes before predicted low tide to maximize exploration time.`;fallback='If surf or beach conditions make the pools unappealing, keep the outing to the beach and sea-stack view rather than stretching the threshold into a safety guarantee.';overview='This is the exposed-pools version of Haystack Rock: use the qualifying low to see the protected marine garden at the rock’s base.'}
  else if(s==='NO_OPPORTUNITY'){use='Treat today as a beach-and-sea-stack visit rather than a tidepool mission; the daylight low does not meet HRAP’s local exposure threshold.';fallback='Keep Haystack Rock as the visual centerpiece and save the intertidal exploration for a qualifying low-tide day.';overview='The rock is still the destination, but today is not the exposed-tidepool version of the experience.'}
  else if(s==='HAZARD_VETO'){use='The active coastal hazard suppresses the normal tidepool recommendation regardless of the predicted tide.';fallback='Do not use the experience layer to work around a hazard veto.';overview='A hazard overrides the normal tidepool experience today.'}
}
if(site.site==='HUG_POINT'){
  if(s==='CONSERVATIVE_ACCESS_OPPORTUNITY'||s==='LOW_TIDE_OPPORTUNITY'){use=d.low_tide_time?`Use the lower tide around ${d.low_tide_time} as the center of the outing, not as a deadline. Explore while water is lower and keep reassessing the route as the ocean changes.`:'Use the lower-tide period as the center of the outing, not as a deadline or safe-until promise.';fallback='If rounding the point looks questionable, stay in the cove. The beach and headland are still a complete stop without forcing the access route.';overview='Lower water may open the walk around the point toward the waterfall, caves, tidepools and historic road — but there is no exact cutoff.'}
  else if(s==='HAZARD_VETO'){use='The active coastal hazard overrides the normal lower-tide opportunity.';fallback='Keep the outing off the exposed access route rather than using a low tide to work around the hazard.';overview='Today is not a day to treat the point as an access opportunity.'}
}
if(site.site==='THORS_WELL'){
  const o=site.context?.marine?.observation;const observed=o&&o.wave_height_ft!=null?` Observed regional wave height is ${o.wave_height_ft} ft${o.wave_period_s!=null?` at ${o.wave_period_s} seconds`:''}.`:'';
  use=`Read the tide and wave observations as context for how energetic the coast is.${observed} The tool deliberately does not convert those inputs into an exact spectacle time.`;
  fallback='If the well is quiet, the useful outcome is understanding the coast you actually found rather than chasing an unsupported “best” minute. If conditions are hazardous, the normal spectacle interpretation is suppressed.';
  overview='This is a conditions-reading experience: watch how the Pacific cycles through the basalt, without an exact spectacle promise.';
}
return {...x,use,fallback,overview,date}}
function sourceHtml(site){return (site.sources||[]).map(s=>`<li><strong>${esc(s.agency||s.role||'Source')}</strong>${s.detail?`<br><span>${esc(s.detail)}</span>`:''}${s.url?`<br><a href="${esc(s.url)}" rel="noopener">Official source ↗</a>`:''}</li>`).join('')||'<li>Source details unavailable.</li>'}
function facts(site){const out=[];(site.context?.tides||[]).slice(0,4).forEach(t=>out.push(`<div class="fact"><span>${esc(t.type)} tide</span><strong>${esc(t.clock)} · ${Number(t.height_ft).toFixed(1)} ft</strong></div>`));const o=site.context?.marine?.observation;if(o){out.push(`<div class="fact"><span>Wave height</span><strong>${o.wave_height_ft??'—'} ft</strong></div>`,`<div class="fact"><span>Dominant period</span><strong>${o.wave_period_s??'—'} sec</strong></div>`)}return out.join('')||'<div class="fact"><span>Conditions</span><strong>Unavailable</strong></div>'}
function experiencePanel(site,date){const x=experience(site,date);return `<section class="panel experience-panel"><div class="experience-head"><div><p class="experience-kicker">On the ground</p><h2>What this becomes when you arrive</h2></div><a class="context-link" href="${esc(x.sourceUrl)}" rel="noopener">${esc(x.sourceLabel)} ↗</a></div><p class="experience-scene">${esc(x.scene)}</p><div class="experience-grid"><div class="experience-step"><span>Use today’s signal</span><p>${esc(x.use)}</p></div><div class="experience-step"><span>What to notice</span><p>${esc(x.notice)}</p></div><div class="experience-step"><span>If it doesn’t line up</span><p>${esc(x.fallback)}</p></div></div><p class="experience-boundary">Experience context explains the outing. It does not alter the decision status above.</p></section>`}
async function load(date){const r=await fetch(`${API}?date=${encodeURIComponent(date)}`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`Decision service returned ${r.status}`);return r.json()}
function bindDate(onChange){const today=pacificDate();const picker=$('#date-picker');const t=$('[data-date=today]'),tm=$('[data-date=tomorrow]');const params=new URLSearchParams(location.search);let selected=params.get('date')||today;if(picker)picker.value=selected;function set(v){selected=v;if(picker)picker.value=v;if(t)t.setAttribute('aria-pressed',String(v===today));if(tm)tm.setAttribute('aria-pressed',String(v===plus(today,1)));history.replaceState(null,'',`${location.pathname}?date=${encodeURIComponent(v)}`);onChange(v)}if(t)t.onclick=()=>set(today);if(tm)tm.onclick=()=>set(plus(today,1));if(picker)picker.onchange=()=>set(picker.value);return selected}
function renderOverview(data){const root=$('#root');const alert=$('#alert');const hazards=(data.sites||[]).filter(s=>s.decision?.status==='HAZARD_VETO');if(alert){alert.innerHTML=hazards.length?`<div class="hazard"><h2>Authoritative coastal hazard</h2><p>${hazards.map(s=>esc(s.name)).join(', ')}: normal opportunity guidance is suppressed.</p></div>`:''}root.innerHTML=`<div class="grid cards">${(data.sites||[]).map(site=>{const p=present(site),x=experience(site,data.date);return `<a class="card" data-state="${p.kind}" href="/national-tools/coastal/oregon/${META[site.site].slug}/?date=${encodeURIComponent(data.date)}"><div class="cardtop"><div><h2>${esc(site.name)}</h2><p class="place">${esc(site.place)}</p></div><span class="experience-type">${esc(x.type)}</span></div><span class="pill">${esc(p.label)}</span><div class="decision">${esc(p.primary)}</div><p class="copy">${esc(p.secondary)}</p><div class="experience-mini"><span>If you go</span><p>${esc(x.overview)}</p></div><div class="foot">${esc((site.sources||[])[0]?.agency||'View source details')} · See the visit →</div></a>`}).join('')}</div>`}
function renderDetail(data,siteKey){const site=(data.sites||[]).find(s=>s.site===siteKey);const root=$('#root');if(!site){root.innerHTML='<div class="error">This destination is not available from the decision service.</div>';return}const p=present(site),hazards=site.context?.hazards||[];root.innerHTML=`${hazards.length?`<div class="hazard"><h2>${esc(hazards[0].event||'Coastal hazard')}</h2><p>${esc(hazards[0].headline||'An authoritative hazard is active for this location.')}</p></div>`:''}<section class="panel decision-panel" data-state="${p.kind}"><span class="pill">${esc(p.label)}</span><h1 class="big">${esc(p.primary)}</h1><p class="copy">${esc(p.secondary)}</p></section>${experiencePanel(site,data.date)}<div class="grid twocol"><section class="panel"><h2 class="sectiontitle">Timing & conditions</h2><div class="grid facts">${facts(site)}</div>${site.site==='THORS_WELL'?'<div class="notice"><strong>Conditions-only model.</strong> No spectacle window is published until calibration evidence supports one.</div>':''}${site.site==='HUG_POINT'?'<div class="notice"><strong>No exact cutoff.</strong> Lower tide improves access, but surf, sand and local geometry can change conditions.</div>':''}</section><section class="panel"><h2 class="sectiontitle">Why this decision</h2><p>${esc(p.secondary)}</p><h2 class="sectiontitle" style="margin-top:18px">Decision sources</h2><ul class="sources">${sourceHtml(site)}</ul></section></div>`}
async function boot(){const view=document.body.dataset.view||'overview',site=document.body.dataset.site||null;const root=$('#root'),status=$('#status'),fresh=$('#freshness');const run=async date=>{root.innerHTML='<div class="loading">Loading Oregon coastal decision data…</div>';status.textContent='';try{const data=await load(date);if(fresh)fresh.textContent=`Updated ${new Date(data.retrieved_at||Date.now()).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;view==='detail'?renderDetail(data,site):renderOverview(data)}catch(e){root.innerHTML=`<div class="error"><strong>Decision data unavailable.</strong><br>${esc(e.message||e)}</div>`;status.textContent='The public page is online, but live decision data could not be loaded.'}};const selected=bindDate(run);if(view==='detail'){const select=$('#location-switcher');if(select){select.value=site;select.onchange=()=>{const m=META[select.value];location.href=`/national-tools/coastal/oregon/${m.slug}/?date=${encodeURIComponent($('#date-picker')?.value||selected)}`}}}run(selected)}
addEventListener('DOMContentLoaded',boot);
})();
