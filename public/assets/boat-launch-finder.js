(()=>{
  'use strict';
  window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
  const PATH='/michigan-boat-launches/';
  if(location.pathname!==PATH)return;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};

  const REAL_HERO={
    image:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Lake_erie_metropark_boat_launch.JPG/1280px-Lake_erie_metropark_boat_launch.JPG',
    source:'https://commons.wikimedia.org/wiki/File:Lake_erie_metropark_boat_launch.JPG',
    license:'https://creativecommons.org/licenses/by/3.0/',
    author:'Dwight Burdette'
  };
  const hero=$('.fig.hero');
  if(hero){
    const img=$('img',hero),cap=$('figcaption',hero);
    if(img){img.src=REAL_HERO.image;img.alt='Concrete public boat-launch ramps at Lake Erie Metropark in Michigan';img.width=1280;img.height=853;img.removeAttribute('srcset');}
    if(cap)cap.innerHTML=`Lake Erie Metropark, Michigan boat launch. Real photograph by <a href="${REAL_HERO.source}" target="_blank" rel="noopener">${REAL_HERO.author} via Wikimedia Commons</a>, licensed <a href="${REAL_HERO.license}" target="_blank" rel="noopener">CC BY 3.0</a>. This guide covers 42 Great Lakes launches statewide.`;
  }

  const locNode=$('#locdata');
  if(!locNode)return;
  let locations=[];
  try{locations=JSON.parse(locNode.textContent||'[]');}catch{return;}
  const byName=new Map(locations.map(x=>[x.name,x]));
  const cards=$$('.loc-card');
  const protection=(name,notes='')=>{
    const t=(name+' '+notes).toLowerCase();
    if(/river|portage|inland|protected basin|inside .*bay|sheltered|harbor of refuge|marina/.test(t))return 'protected';
    if(/open lake|direct shot|big water|straits|heavy current|weather windows|open-water/.test(t))return 'exposed';
    return 'mixed';
  };
  const labelProtection=v=>v==='protected'?'more protected':v==='exposed'?'open-water exposure':'mixed exposure';
  const cardFor=loc=>cards.find(card=>$('.loc-name',card)?.textContent?.trim()===loc.name)||null;
  const cardInsight=loc=>{
    const card=cardFor(loc);
    return {
      meta:$('.loc-meta',card)?.textContent?.trim()||`${loc.lake}`,
      notes:$('.loc-notes',card)?.textContent?.trim()||'Open the launch record below for local planning notes.',
      condition:$('.conditions:not(.loading)',card)?.textContent?.replace(/\s+/g,' ')?.trim()||'Regional NDBC observation is not available yet.',
      protection:card?.dataset.protection||'mixed'
    };
  };

  cards.forEach(card=>{
    const name=$('.loc-name',card)?.textContent?.trim()||'';
    const loc=byName.get(name);
    if(loc){card.id=loc.slug;card.dataset.slug=loc.slug;card.dataset.name=name.toLowerCase();}
    card.dataset.protection=protection(name,$('.loc-notes',card)?.textContent||'');
    if(loc && !$('.launch-actions',card)){
      const actions=document.createElement('div');
      actions.className='launch-actions';
      actions.innerHTML=`<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}" target="_blank" rel="noopener" data-launch-action="directions">Directions</a><a href="#locmap" data-launch-action="map" data-launch-slug="${esc(loc.slug)}">Map insight</a><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener" data-launch-action="verify">Verify access</a>`;
      card.append(actions);
    }
  });

  const style=document.createElement('style');
  style.textContent=`
  .launch-finder{margin:18px 0 24px;padding:18px;background:#fff;border:1px solid #d9d4ca;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.035)}
  .launch-finder h2{font-size:21px;margin:0 0 5px;color:#244d28;font-weight:normal}.launch-finder .lf-intro{font-size:14px;color:#555;margin:0 0 14px}
  .lf-grid{display:grid;grid-template-columns:1.2fr .9fr .9fr auto;gap:9px;align-items:end}.lf-field{display:grid;gap:4px}.lf-field label{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.55px;text-transform:uppercase;color:#777}.lf-field input,.lf-field select{width:100%;min-height:42px;border:1px solid #cfc9be;border-radius:5px;background:#fff;padding:8px 10px;font:14px/1.3 Georgia,serif;color:#222}.lf-reset{min-height:42px;border:1px solid #2c5f2d;border-radius:5px;background:#fff;color:#2c5f2d;padding:8px 12px;cursor:pointer;font-weight:bold}
  .lf-status{margin:12px 0 0;font-size:13px;color:#555}.lf-status strong{color:#222}.lf-note{margin:11px 0 0;padding-top:10px;border-top:1px solid #eee7dd;font-size:12px!important;color:#777!important;line-height:1.55!important}
  .lf-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.lf-pick{border:1px solid #e1ddd5;border-radius:6px;padding:10px 11px;background:#faf9f6}.lf-pick strong{display:block;font-size:13px;line-height:1.3;margin-bottom:3px}.lf-pick span{font-size:11px;color:#777;line-height:1.4}.lf-pick a{display:inline-block;margin-top:5px;font-size:11px;font-weight:bold}
  .launch-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #eee7dd}.launch-actions a{font:700 11px/1.3 Arial,sans-serif;letter-spacing:.2px}.loc-card[hidden]{display:none!important}.loc-card.lf-match{outline:2px solid #9fc4a2;outline-offset:1px}
  .launch-map-insight{margin:10px 0 22px;padding:14px 15px;border:1px solid #d8d2c7;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff}.launch-map-insight>strong{display:block;font-size:17px;color:#214a22}.launch-map-insight>span{display:block;font-size:12px;color:#777;margin-top:2px}.launch-map-insight p{font-size:13px!important;margin:7px 0!important;line-height:1.45!important}.lmi-signal{font-size:12px;margin:7px 0}.lmi-actions{display:flex;gap:9px;flex-wrap:wrap;margin:8px 0}.lmi-actions a{font:700 11px/1.3 Arial,sans-serif}.launch-map-insight small{display:block;color:#777;line-height:1.4}
  @media(max-width:760px){.lf-grid{grid-template-columns:1fr 1fr}.lf-reset{width:100%}.lf-picks{grid-template-columns:1fr}.launch-finder{padding:15px}.lf-field:first-child{grid-column:1/-1}}
  @media(max-width:480px){.lf-grid{grid-template-columns:1fr}.lf-field:first-child{grid-column:auto}}
  `;
  document.head.append(style);

  const panel=document.createElement('section');
  panel.className='launch-finder';
  panel.setAttribute('aria-labelledby','launch-finder-title');
  panel.innerHTML=`
    <h2 id="launch-finder-title">Find a Michigan Great Lakes boat launch</h2>
    <p class="lf-intro">Narrow 42 ramps by lake, name or county, then use the live regional wave and wind signal to decide what deserves a closer look.</p>
    <div class="lf-grid">
      <div class="lf-field"><label for="lf-q">Launch or county</label><input id="lf-q" type="search" autocomplete="off" placeholder="Bay City, Holland, Marquette…"></div>
      <div class="lf-field"><label for="lf-lake">Great Lake</label><select id="lf-lake"><option value="">All four lakes</option><option value="lake-michigan">Lake Michigan</option><option value="lake-huron">Lake Huron</option><option value="lake-superior">Lake Superior</option><option value="lake-erie">Lake Erie</option></select></div>
      <div class="lf-field"><label for="lf-protection">Launch character</label><select id="lf-protection"><option value="">Any exposure</option><option value="protected">More protected</option><option value="mixed">Mixed / verify locally</option><option value="exposed">Open-water exposure</option></select></div>
      <button class="lf-reset" id="lf-reset" type="button">Reset</button>
    </div>
    <p class="lf-status" id="lf-status" aria-live="polite"></p>
    <div class="lf-picks" id="lf-picks" aria-label="Starting points"></div>
    <p class="lf-note"><strong>Use this as a screening tool, not a launch or boating safety rating.</strong> The colored conditions come from the nearest mapped NDBC station and can differ materially inside a river, marina, bay or harbor. Verify the ramp, local notices and marine forecast before leaving.</p>`;
  const mapWrap=$('#locmap-wrap');
  if(mapWrap)mapWrap.before(panel);else $('.body')?.prepend(panel);
  const mapEl=$('#locmap');
  let insight=null;
  if(mapEl){
    insight=document.createElement('aside');
    insight.id='launch-map-insight';
    insight.className='launch-map-insight';
    insight.setAttribute('aria-live','polite');
    insight.innerHTML='<strong>Tap a launch marker for the useful part.</strong><span>Each dot connects to the launch record.</span><p>You’ll see local launch notes, regional NDBC context, directions and an official access-verification path.</p><small>Regional observations screen a trip; they do not verify a ramp, harbor or safe boating conditions.</small>';
    mapEl.after(insight);
  }

  const q=$('#lf-q'), lake=$('#lf-lake'), prot=$('#lf-protection'), status=$('#lf-status'), picks=$('#lf-picks');
  const params=new URLSearchParams(location.search);
  if(params.get('lake'))lake.value=params.get('lake');
  if(params.get('exposure'))prot.value=params.get('exposure');
  if(params.get('q'))q.value=params.get('q').slice(0,60);

  const conditionRank=card=>{
    if($('.conditions:not(.loading) .cond.caution',card))return 0;
    if($('.conditions:not(.loading) .cond.marginal',card))return 1;
    if($('.conditions:not(.loading) .cond.good',card))return 2;
    return 1;
  };
  const protectionRank=card=>card.dataset.protection==='protected'?2:card.dataset.protection==='mixed'?1:0;
  const visible=()=>cards.filter(c=>!c.hidden);
  function updateURL(){
    const u=new URL(location.href);u.searchParams.delete('q');u.searchParams.delete('lake');u.searchParams.delete('exposure');
    if(q.value.trim())u.searchParams.set('q',q.value.trim());if(lake.value)u.searchParams.set('lake',lake.value);if(prot.value)u.searchParams.set('exposure',prot.value);
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }
  function renderPicks(list){
    picks.replaceChildren();
    const ranked=[...list].sort((a,b)=>(conditionRank(b)+protectionRank(b))-(conditionRank(a)+protectionRank(a))).slice(0,3);
    ranked.forEach(card=>{
      const name=$('.loc-name',card)?.textContent.trim()||'Launch';
      const meta=$('.loc-meta',card)?.textContent.trim()||'';
      const d=document.createElement('div');d.className='lf-pick';
      d.innerHTML=`<strong>${esc(name)}</strong><span>${esc(meta)} · ${esc(labelProtection(card.dataset.protection))}</span><a href="#${esc(card.id)}" data-launch-pick="${esc(card.dataset.slug||'launch')}">View launch</a>`;
      picks.append(d);
    });
  }
  function showInsight(loc,source='marker'){
    if(!insight||!loc)return;
    const data=cardInsight(loc);
    insight.dataset.selectedLaunch=loc.slug;
    insight.innerHTML=`<strong>${esc(loc.name)}</strong><span>${esc(data.meta)} · ${esc(labelProtection(data.protection))}</span><p>${esc(data.notes)}</p><div class="lmi-signal"><b>Regional screening signal:</b> ${esc(data.condition)}</div><div class="lmi-actions"><a href="#${esc(loc.slug)}">View launch details</a><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}" target="_blank" rel="noopener">Directions</a><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener">Verify access</a></div><small>Regional NDBC context only. It is not ramp, marina, harbor or boating-safety truth; confirm local notices and the marine forecast before going.</small>`;
    emit('Boat Launch Map Insight',{launch:loc.slug,source});
  }
  function apply(source='filter'){
    const needle=q.value.trim().toLowerCase();
    cards.forEach(card=>{
      const hay=(card.textContent||'').toLowerCase();
      const ok=(!needle||hay.includes(needle))&&(!lake.value||card.dataset.lake===lake.value)&&(!prot.value||card.dataset.protection===prot.value);
      card.hidden=!ok;card.classList.toggle('lf-match',ok&&!!needle);
    });
    const list=visible();
    status.innerHTML=`Showing <strong>${list.length}</strong> of ${cards.length} Great Lakes launches${lake.value?' on '+esc(lake.options[lake.selectedIndex].text):''}.`;
    renderPicks(list);updateURL();
    if(source!=='init')emit('Boat Launch Filter',{filter:source,results:list.length});
  }
  function wireMarkers(){
    const markers=$$('#locmap .leaflet-interactive').slice(0,locations.length);
    if(markers.length<locations.length)return false;
    markers.forEach((node,i)=>{
      if(node.dataset.insightWired)return;
      const loc=locations[i];
      node.dataset.insightWired='1';
      node.setAttribute('tabindex','0');
      node.setAttribute('role','button');
      node.setAttribute('aria-label',`Open map insight for ${loc.name}`);
      node.addEventListener('click',()=>showInsight(loc,'marker'));
      node.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    });
    return true;
  }
  function openMarker(slug){
    const idx=locations.findIndex(x=>x.slug===slug);
    const loc=locations[idx];
    if(!loc)return;
    showInsight(loc,'card');
    const marker=$$('#locmap .leaflet-interactive')[idx];
    marker?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    insight?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  q.addEventListener('input',()=>apply('search'));lake.addEventListener('change',()=>apply('lake'));prot.addEventListener('change',()=>apply('exposure'));
  $('#lf-reset')?.addEventListener('click',()=>{q.value='';lake.value='';prot.value='';apply('reset');});
  panel.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;if(a.dataset.launchPick)emit('Boat Launch Pick',{launch:a.dataset.launchPick});});
  document.addEventListener('click',e=>{const a=e.target.closest('[data-launch-action]');if(!a)return;emit('Boat Launch Action',{action:a.dataset.launchAction});if(a.dataset.launchAction==='map'&&a.dataset.launchSlug){e.preventDefault();openMarker(a.dataset.launchSlug);}});
  apply('init');
  let tries=0;const refresh=setInterval(()=>{tries++;const conditionsReady=cards.some(c=>$('.conditions:not(.loading)',c));const markersReady=wireMarkers();if((conditionsReady&&markersReady)||tries>15){clearInterval(refresh);renderPicks(visible());wireMarkers();}},400);
})();
