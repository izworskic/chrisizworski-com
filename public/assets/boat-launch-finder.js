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
    if(img){
      img.src=REAL_HERO.image;
      img.alt='Concrete public boat-launch ramps at Lake Erie Metropark in Michigan';
      img.width=1280;img.height=853;img.removeAttribute('srcset');
    }
    if(cap)cap.innerHTML=`Lake Erie Metropark, Michigan boat launch. Real photograph by <a href="${REAL_HERO.source}" target="_blank" rel="noopener">${REAL_HERO.author} via Wikimedia Commons</a>, licensed <a href="${REAL_HERO.license}" target="_blank" rel="noopener">CC BY 3.0</a>. This guide covers 42 Great Lakes launches statewide.`;
  }

  const locNode=$('#locdata');
  if(!locNode)return;
  let locations=[];
  try{locations=JSON.parse(locNode.textContent||'[]');}catch{return;}
  const byName=new Map(locations.map(x=>[x.name,x]));
  const bySlug=new Map(locations.map(x=>[x.slug,x]));
  const cards=$$('.loc-card');

  const protection=(name,notes='')=>{
    const t=(name+' '+notes).toLowerCase();
    if(/river|portage|inland|protected basin|inside .*bay|sheltered|harbor of refuge|marina/.test(t))return 'protected';
    if(/open lake|direct shot|big water|straits|heavy current|weather windows|open-water/.test(t))return 'exposed';
    return 'mixed';
  };
  const labelProtection=v=>v==='protected'?'more protected':v==='exposed'?'open-water exposure':'mixed exposure';
  const cardFor=loc=>cards.find(card=>card.dataset.slug===loc.slug)||null;
  const cardInsight=loc=>{
    const card=cardFor(loc);
    return {
      meta:$('.loc-meta',card)?.textContent?.trim()||loc.lake||'Great Lakes launch',
      notes:$('.loc-notes',card)?.textContent?.trim()||'Open the launch record for local planning notes.',
      condition:$('.conditions:not(.loading)',card)?.textContent?.replace(/\s+/g,' ')?.trim()||'Regional NDBC observation is not available yet.',
      protection:card?.dataset.protection||'mixed'
    };
  };
  const conditionState=card=>{
    if($('.conditions:not(.loading) .cond.caution',card))return 'rough';
    if($('.conditions:not(.loading) .cond.marginal',card))return 'moderate';
    if($('.conditions:not(.loading) .cond.good',card))return 'calm';
    return 'unknown';
  };
  const markerColor=state=>state==='calm'?'#2e9e3f':state==='moderate'?'#e0991a':state==='rough'?'#cf3a3a':'#7a7a7a';

  cards.forEach(card=>{
    const name=$('.loc-name',card)?.textContent?.trim()||'';
    const loc=byName.get(name);
    if(loc){
      card.id=loc.slug;
      card.dataset.slug=loc.slug;
      card.dataset.name=name.toLowerCase();
    }
    card.dataset.protection=protection(name,$('.loc-notes',card)?.textContent||'');
    if(loc && !$('.launch-actions',card)){
      const actions=document.createElement('div');
      actions.className='launch-actions';
      actions.innerHTML=`<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}" target="_blank" rel="noopener" data-launch-action="directions">Directions</a><a href="#locmap" data-launch-action="map" data-launch-slug="${esc(loc.slug)}">Show on map</a><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener" data-launch-action="verify">Verify access</a>`;
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
    .launch-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #eee7dd}.launch-actions a{font:700 11px/1.3 Arial,sans-serif;letter-spacing:.2px}.loc-card[hidden]{display:none!important}.loc-card.lf-match{outline:2px solid #9fc4a2;outline-offset:1px}.loc-card.lf-selected{outline:3px solid #2c5f2d;outline-offset:2px;background:#fbfdf9}.lf-selected-badge{display:inline-block;margin:0 0 8px;padding:4px 7px;border-radius:999px;background:#e8f2e8;color:#214a22;font:700 10px/1 Arial,sans-serif;text-transform:uppercase;letter-spacing:.45px}
    .launch-map-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.85fr);gap:12px;align-items:stretch}.launch-map-layout #locmap{height:430px}.launch-map-insight{margin:0;padding:15px;border:1px solid #d8d2c7;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff;min-height:100%}.launch-map-insight>strong{display:block;font-size:18px;color:#214a22}.launch-map-insight>span{display:block;font-size:12px;color:#777;margin-top:2px}.launch-map-insight p{font-size:13px!important;margin:8px 0!important;line-height:1.5!important}.lmi-signal{font-size:12px;margin:8px 0}.lmi-actions{display:flex;gap:9px;flex-wrap:wrap;margin:10px 0}.lmi-actions a{font:700 11px/1.3 Arial,sans-serif}.launch-map-insight small{display:block;color:#777;line-height:1.45}
    @media(max-width:820px){.launch-map-layout{grid-template-columns:1fr}.launch-map-layout #locmap{height:330px}.launch-map-insight{min-height:0}}
    @media(max-width:760px){.lf-grid{grid-template-columns:1fr 1fr}.lf-reset{width:100%}.lf-picks{grid-template-columns:1fr}.launch-finder{padding:15px}.lf-field:first-child{grid-column:1/-1}}
    @media(max-width:480px){.lf-grid{grid-template-columns:1fr}.lf-field:first-child{grid-column:auto}}
  `;
  document.head.append(style);

  const panel=document.createElement('section');
  panel.className='launch-finder';
  panel.setAttribute('aria-labelledby','launch-finder-title');
  panel.innerHTML=`
    <h2 id="launch-finder-title">Find a Michigan Great Lakes boat launch</h2>
    <p class="lf-intro">The list and map now stay synchronized: filter the records, select a map marker, or send any launch record back to the map.</p>
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

  let insight=null;
  if(mapWrap){
    insight=document.createElement('aside');
    insight.id='launch-map-insight';
    insight.className='launch-map-insight';
    insight.setAttribute('aria-live','polite');
    insight.innerHTML='<strong>Select a launch on the map.</strong><span>The marker and detailed record use the same launch ID.</span><p>The matching record will be highlighted below, and every record has a “Show on map” action that returns to the exact marker.</p><small>Map colors are regional screening context only.</small>';
  }

  const q=$('#lf-q'),lake=$('#lf-lake'),prot=$('#lf-protection'),status=$('#lf-status'),picks=$('#lf-picks');
  const params=new URLSearchParams(location.search);
  if(params.get('lake'))lake.value=params.get('lake');
  if(params.get('exposure'))prot.value=params.get('exposure');
  if(params.get('q'))q.value=params.get('q').slice(0,60);

  const conditionRank=card=>{
    const state=conditionState(card);
    return state==='calm'?2:state==='moderate'?1:state==='rough'?0:1;
  };
  const protectionRank=card=>card.dataset.protection==='protected'?2:card.dataset.protection==='mixed'?1:0;
  const visible=()=>cards.filter(c=>!c.hidden);

  let map=null;
  let mapLayout=null;
  const markerBySlug=new Map();
  let selectedSlug='';

  function updateURL(){
    const u=new URL(location.href);
    ['q','lake','exposure'].forEach(k=>u.searchParams.delete(k));
    if(q.value.trim())u.searchParams.set('q',q.value.trim());
    if(lake.value)u.searchParams.set('lake',lake.value);
    if(prot.value)u.searchParams.set('exposure',prot.value);
    if(selectedSlug)u.hash=selectedSlug;
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }

  function renderPicks(list){
    picks.replaceChildren();
    const ranked=[...list].sort((a,b)=>(conditionRank(b)+protectionRank(b))-(conditionRank(a)+protectionRank(a))).slice(0,3);
    ranked.forEach(card=>{
      const name=$('.loc-name',card)?.textContent.trim()||'Launch';
      const meta=$('.loc-meta',card)?.textContent.trim()||'';
      const d=document.createElement('div');
      d.className='lf-pick';
      d.innerHTML=`<strong>${esc(name)}</strong><span>${esc(meta)} · ${esc(labelProtection(card.dataset.protection))}</span><a href="#${esc(card.id)}" data-launch-pick="${esc(card.dataset.slug||'launch')}">Select this launch</a>`;
      picks.append(d);
    });
  }

  function clearSelectedCard(){
    cards.forEach(card=>{
      card.classList.remove('lf-selected');
      card.removeAttribute('aria-current');
      $('.lf-selected-badge',card)?.remove();
    });
  }

  function markSelectedCard(card){
    clearSelectedCard();
    if(!card)return;
    card.classList.add('lf-selected');
    card.setAttribute('aria-current','true');
    if(!$('.lf-selected-badge',card)){
      const badge=document.createElement('span');
      badge.className='lf-selected-badge';
      badge.textContent='Selected on map';
      card.prepend(badge);
    }
  }

  function showInsight(loc,source='map'){
    if(!insight||!loc)return;
    const data=cardInsight(loc);
    insight.dataset.selectedLaunch=loc.slug;
    insight.innerHTML=`<strong>${esc(loc.name)}</strong><span>${esc(data.meta)} · ${esc(labelProtection(data.protection))}</span><p>${esc(data.notes)}</p><div class="lmi-signal"><b>Regional screening signal:</b> ${esc(data.condition)}</div><div class="lmi-actions"><a href="#${esc(loc.slug)}" data-launch-action="record" data-launch-slug="${esc(loc.slug)}">Jump to highlighted record</a><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}" target="_blank" rel="noopener">Directions</a><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener">Verify access</a></div><small>This panel is populated from the same detailed launch record highlighted below. Regional NDBC context is not ramp, marina, harbor or boating-safety truth.</small>`;
    emit('Boat Launch Map Insight',{launch:loc.slug,source});
  }

  function popupHtml(loc){
    const data=cardInsight(loc);
    return `<strong>${esc(loc.name)}</strong><br>${esc(data.meta)}<br><span style="font-size:11px">${esc(data.condition)}</span><br><a href="#${esc(loc.slug)}" data-launch-popup-record="${esc(loc.slug)}">Open matching record</a>`;
  }

  function markerStyle(slug,selected=false){
    const loc=bySlug.get(slug);
    const card=loc?cardFor(loc):null;
    const color=markerColor(card?conditionState(card):'unknown');
    return {radius:selected?9:6,fillColor:color,color:selected?'#173f1d':'#fff',weight:selected?3:1.5,opacity:1,fillOpacity:.92};
  }

  function refreshMarker(slug){
    const marker=markerBySlug.get(slug),loc=bySlug.get(slug);
    if(!marker||!loc)return;
    marker.setStyle(markerStyle(slug,slug===selectedSlug));
    marker.setPopupContent(popupHtml(loc));
  }

  function refreshAllMarkers(){locations.forEach(loc=>refreshMarker(loc.slug));}

  function syncMapToVisible({fit=true}={}){
    if(!map)return;
    const bounds=[];
    locations.forEach(loc=>{
      const marker=markerBySlug.get(loc.slug);
      const card=cardFor(loc);
      if(!marker||!card)return;
      if(card.hidden){
        if(map.hasLayer(marker))map.removeLayer(marker);
      }else{
        if(!map.hasLayer(marker))marker.addTo(map);
        bounds.push([loc.lat,loc.lng]);
      }
    });
    if(fit&&bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:9});
  }

  function selectLaunch(slug,source='map'){
    const loc=bySlug.get(slug);
    if(!loc)return;
    const card=cardFor(loc);
    selectedSlug=slug;
    markSelectedCard(card);
    showInsight(loc,source);
    markerBySlug.forEach((_,s)=>refreshMarker(s));
    updateURL();
    if(source==='map'){
      status.innerHTML=`Selected on map: <strong>${esc(loc.name)}</strong>. Its exact detailed record is highlighted below.`;
    }
  }

  function jumpToRecord(slug){
    const loc=bySlug.get(slug),card=loc?cardFor(loc):null;
    if(!card)return;
    selectLaunch(slug,'map-record');
    card.scrollIntoView({behavior:'smooth',block:'center'});
    card.focus?.({preventScroll:true});
    emit('Boat Launch Map To Record',{launch:slug});
  }

  function focusMap(slug){
    const loc=bySlug.get(slug),marker=markerBySlug.get(slug);
    if(!map||!loc||!marker)return;
    if(!map.hasLayer(marker))marker.addTo(map);
    selectLaunch(slug,'record');
    map.flyTo([loc.lat,loc.lng],Math.max(map.getZoom(),9),{duration:.45});
    setTimeout(()=>marker.openPopup(),480);
    mapLayout?.scrollIntoView({behavior:'smooth',block:'center'});
    emit('Boat Launch Record To Map',{launch:slug});
  }

  function apply(source='filter'){
    const needle=q.value.trim().toLowerCase();
    cards.forEach(card=>{
      const hay=(card.textContent||'').toLowerCase();
      const ok=(!needle||hay.includes(needle))&&(!lake.value||card.dataset.lake===lake.value)&&(!prot.value||card.dataset.protection===prot.value);
      card.hidden=!ok;
      card.classList.toggle('lf-match',ok&&!!needle&&!card.classList.contains('lf-selected'));
    });
    const list=visible();
    if(selectedSlug){
      const selected=cards.find(c=>c.dataset.slug===selectedSlug);
      if(selected?.hidden){selectedSlug='';clearSelectedCard();if(insight)insight.innerHTML='<strong>Selection cleared by the active filters.</strong><span>Choose another visible marker or record.</span>';}
    }
    status.innerHTML=`Map and records synchronized: <strong>${list.length}</strong> of ${cards.length} launches visible${lake.value?' on '+esc(lake.options[lake.selectedIndex].text):''}.`;
    renderPicks(list);
    updateURL();
    syncMapToVisible({fit:source!=='search'||needle.length>1});
    if(source!=='init')emit('Boat Launch Filter',{filter:source,results:list.length});
  }

  function buildOwnedMap(){
    if(!mapWrap||!window.L||map)return;
    const oldMap=$('#locmap');
    if(!oldMap)return;
    const fresh=document.createElement('div');
    fresh.id='locmap';
    fresh.setAttribute('aria-label','Synchronized map of boat launch locations and detailed launch records');
    mapLayout=document.createElement('div');
    mapLayout.className='launch-map-layout';
    oldMap.replaceWith(mapLayout);
    mapLayout.append(fresh,insight);

    map=L.map(fresh,{scrollWheelZoom:false}).setView([44.6,-85.5],6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap, &copy; CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);

    locations.forEach(loc=>{
      const marker=L.circleMarker([loc.lat,loc.lng],markerStyle(loc.slug,false));
      marker.bindPopup(popupHtml(loc),{maxWidth:320});
      marker.on('click',()=>selectLaunch(loc.slug,'map'));
      marker.on('add',()=>{
        const el=marker.getElement();
        if(!el)return;
        el.setAttribute('tabindex','0');
        el.setAttribute('role','button');
        el.setAttribute('aria-label',`Select ${loc.name} and its matching launch record`);
        el.addEventListener('keydown',ev=>{
          if(ev.key==='Enter'||ev.key===' '){
            ev.preventDefault();
            marker.openPopup();
            selectLaunch(loc.slug,'map-keyboard');
          }
        });
      });
      marker.addTo(map);
      markerBySlug.set(loc.slug,marker);
    });

    syncMapToVisible({fit:true});
    refreshAllMarkers();
    emit('Boat Launch Linked Map Ready',{launches:markerBySlug.size});
  }

  function waitForLeaflet(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.L){
        clearInterval(timer);
        setTimeout(buildOwnedMap,120);
      }else if(tries>50){
        clearInterval(timer);
        if(insight)insight.innerHTML='<strong>Map unavailable.</strong><span>The filtered launch records and directions below remain usable.</span>';
      }
    },200);
  }

  q.addEventListener('input',()=>apply('search'));
  lake.addEventListener('change',()=>apply('lake'));
  prot.addEventListener('change',()=>apply('exposure'));
  $('#lf-reset')?.addEventListener('click',()=>{q.value='';lake.value='';prot.value='';apply('reset');});

  panel.addEventListener('click',e=>{
    const a=e.target.closest('[data-launch-pick]');
    if(!a)return;
    e.preventDefault();
    const slug=a.dataset.launchPick;
    selectLaunch(slug,'pick');
    jumpToRecord(slug);
    emit('Boat Launch Pick',{launch:slug});
  });

  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-launch-action]');
    if(action){
      const slug=action.dataset.launchSlug;
      emit('Boat Launch Action',{action:action.dataset.launchAction});
      if(action.dataset.launchAction==='map'&&slug){
        e.preventDefault();focusMap(slug);
      }else if(action.dataset.launchAction==='record'&&slug){
        e.preventDefault();jumpToRecord(slug);
      }
    }
    const popup=e.target.closest('[data-launch-popup-record]');
    if(popup){
      e.preventDefault();
      jumpToRecord(popup.dataset.launchPopupRecord);
    }
  });

  cards.forEach(card=>{
    const cond=$('.conditions',card);
    if(!cond||!card.dataset.slug)return;
    const slug=card.dataset.slug;
    const observer=new MutationObserver(()=>refreshMarker(slug));
    observer.observe(cond,{childList:true,subtree:true,characterData:true,attributes:true});
  });

  apply('init');
  waitForLeaflet();
})();
