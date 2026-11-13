'use strict';
/**
 * Lompoc Viewing Atlas — independent static editorial map.
 * Map pins are generated from lib/vandenberg-viewing.js, the same source used
 * by the live mission planner. This script never fetches LL2, NWS, a user's
 * location, a launch schedule, or a rocket flight path.
 *
 * Every site is a public *candidate*, not a verified current opening or
 * a known parking entrance. Official closing hours remain in the guide.
 */
(() => {
  const root=document.getElementById('vg-viewing-map');
  const list=document.getElementById('vg-map-places');
  const detail=document.getElementById('vg-map-selection');
  const buttons=document.getElementById('vg-map-filters');
  if(!root||!list||!detail||!buttons)return;

  const state={map:null,places:[],markers:new Map(),filter:'all',active:null,rust:null,priority:0,marineConcern:0};
  const CATEGORIES={coast:new Set(['park-sunset','surf-hours']),
    town:new Set(['college','city-park'])};
  const COLOR={coast:'#d27a43',town:'#176a78'};
  const $=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(typeof text==='string')node.textContent=text;
    return node;
  };
  const safeExternal=(href,text)=>{
    if(typeof href!=='string')return null;
    try{
      const url=new URL(href);
      if(url.protocol!=='https:'||!url.hostname)return null;
      const a=$('a','',text);
      a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
      return a;
    }catch(_){return null;}
  };
  const kind=place=>CATEGORIES.coast.has(place.kind)?'coast':'town';
  // Once loaded, Rust owns category filtering and relative comparison scoring.\n  // Before then, the original map remains usable without WebAssembly.\n  const visible=place=>{\n    if(state.rust){\n      const index=state.places.indexOf(place);\n      const group=state.filter==='coast'?1:state.filter==='town'?2:0;\n      return index>=0&&state.rust.vg_visible(index,group)===1;\n    }\n    return state.filter==='all'||kind(place)===state.filter;\n  };
  const sceneLabel=place=>place.kind==='park-sunset'?'Closes at sunset':
    place.kind==='surf-hours'?'8 a.m.–6 p.m. · check launch restrictions':
    place.kind==='college'?'Check campus parking rules':
    'Check park hours and launch-day access';

  function noteSelection(place) {
    detail.replaceChildren();
    if(!place){
      detail.appendChild($('p','vg-map-selection-hint',
        'Choose a place to see what the view might be like and what access rules to check.'));
      return;
    }
    const label=$('span','vg-map-detail-kicker','SELECTED / '+place.pinLabel.toUpperCase());
    const title=$('h3','',place.name);
    const caution=$('p','vg-map-detail-caution',sceneLabel(place));
    const scene=$('p','',place.scene);
    const access=$('p','vg-map-detail-access',place.accessNote);
    const actions=$('div','vg-map-detail-links');
    const read=$('a','vg-map-read','Read what to expect here');
    read.href='#'+place.articleAnchor;
    actions.appendChild(read);
    const origin=safeExternal(place.source,'Read the local viewing source');
    if(origin)actions.appendChild(origin);
    if(['surf-hours','college'].includes(place.kind)){
      const rules=safeExternal(place.accessSource,
        place.kind==='surf-hours'?'Check Space Force beach rules':'Check campus parking rules');
      if(rules)actions.appendChild(rules);
    }
    detail.append(label,title,caution,scene,access,actions);
  }

  function emitSelect(place,how) {
    document.dispatchEvent(new CustomEvent('vandenberg-guide:site-select',{
      detail:{site:place.id,interaction:how}
    }));
  }

  function makeRow(place,index) {
    const btn=$('button','vg-map-place');
    btn.type='button';btn.dataset.mapPlace=place.id;
    btn.setAttribute('aria-label','Highlight '+place.name+' on the map');
    btn.setAttribute('aria-pressed',String(state.active===place.id));
    const num=$('span','vg-map-place-num',String(index+1).padStart(2,'0'));
    num.dataset.kind=kind(place);
    const middle=$('span','vg-map-place-copy');
    middle.append($('strong','',place.name),$('small','',sceneLabel(place)));
    btn.append(num,middle,$('span','vg-map-place-arrow','↗'));
    btn.addEventListener('click',()=>select(place.id,'list'));
    return btn;
  }

  function rows(){
    list.replaceChildren();
    const ordered=state.rust?[...state.places].sort((a,b)=>
      state.rust.vg_rank(state.places.indexOf(b),state.priority,state.marineConcern)-
      state.rust.vg_rank(state.places.indexOf(a),state.priority,state.marineConcern)):state.places;
    ordered.forEach(p=>{
      if(visible(p))list.appendChild(makeRow(p,state.places.indexOf(p)));
    });
    const shown=state.places.filter(visible);
    document.getElementById('vg-map-count').textContent=shown.length+
      (shown.length===1?' documented location':' places to consider');
  }

  function select(id,how) {
    const p=state.places.find(item=>item.id===id&&visible(item));
    if(!p)return;
    state.active=id;
    for(const [key,marker] of state.markers){
      const active=key===id;
      marker.setZIndexOffset(active?700:0);
      const node=marker.getElement?.();
      if(node)node.classList.toggle('vg-map-pin-selected',active);
    }
    rows();
    noteSelection(p);
    const marker=state.markers.get(id);
    if(marker&&state.map){
      // Keep the same zoom; never imply a route/ETA from a mapped centroid.
      state.map.panTo(marker.getLatLng(),{animate:true,duration:.35});
      if(how==='marker'){
        const row=list.querySelector('[data-map-place="'+id+'"]');
        row?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
      }
    }
    if(how==='marker'||how==='list')emitSelect(p,how);
  }

  function fitVisible(){
    if(!state.map||!window.L)return;
    const coords=state.places.filter(visible).map(p=>[p.lat,p.lon]);
    if(coords.length)state.map.fitBounds(coords,{padding:[31,31],maxZoom:12});
  }

  function filter(value) {
    if(value!=='all'&&!CATEGORIES[value])return;
    state.filter=value;
    if(!state.places.some(p=>p.id===state.active&&visible(p)))
      state.active=null;
    for(const [id,marker] of state.markers){
      const p=state.places.find(x=>x.id===id);
      if(p&&visible(p)&&!state.map.hasLayer(marker))marker.addTo(state.map);
      else if(p&&!visible(p)&&state.map.hasLayer(marker))state.map.removeLayer(marker);
    }
    buttons.querySelectorAll('button[data-map-filter]').forEach(btn=>
      btn.setAttribute('aria-pressed',String(btn.dataset.mapFilter===value)));
    rows();noteSelection(state.places.find(p=>p.id===state.active)||null);
    fitVisible();
  }

  function addMarker(p,index){
    const symbol=String(index+1);
    // The only HTML inserted into the Leaflet icon is our own numeric index.
    const icon=window.L.divIcon({
      className:'vg-map-icon vg-map-icon-'+kind(p),
      html:'<span aria-hidden="true"><b>'+symbol+'</b></span>',
      iconSize:[34,39],iconAnchor:[17,37],popupAnchor:[0,-38]
    });
    const marker=window.L.marker([p.lat,p.lon],{
      icon,keyboard:true,title:p.name+' (documented viewing candidate)',
      alt:p.name+' map marker'
    }).addTo(state.map);
    const popup=$('div','vg-map-popup');
    popup.append($('strong','',p.name),$('p','',sceneLabel(p)));
    const view=$('a','','Read about this viewing spot');
    view.href='#'+p.articleAnchor;
    popup.appendChild(view);
    marker.bindPopup(popup);
    marker.on('click',()=>select(p.id,'marker'));
    state.markers.set(p.id,marker);
  }

  function addBasemap(map){
    const attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const osm=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:18,attribution
    }).addTo(map);
    root.dataset.tiles='osm-fallback';
    // Keep the existing keyed CARTO experience, with an OSM map fallback.
    fetch('/api/carto-basemap-config',{
      credentials:'same-origin',signal:AbortSignal.timeout(6500)
    }).then(r=>r.ok?r.json():null).then(config=>{
      if(!config||config.provider!=='CARTO'||
         typeof config.key!=='string'||!config.key.trim())return;
      const tileUrl='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+
        encodeURIComponent(config.key.trim());
      const carto=window.L.tileLayer(tileUrl,{
        maxZoom:19,subdomains:'abcd',
        attribution:attribution+' &copy; CARTO'
      });
      let loaded=false,failures=0;
      carto.on('tileload',()=>{
        if(!loaded&&map.hasLayer(carto)){
          loaded=true;root.dataset.tiles='carto-keyed';
          if(map.hasLayer(osm))map.removeLayer(osm);
        }
      });
      carto.on('tileerror',()=>{
        if(++failures>=2&&!loaded){
          if(map.hasLayer(carto))map.removeLayer(carto);
          if(!map.hasLayer(osm))osm.addTo(map);
          root.dataset.tiles='osm-fallback';
        }
      });
      carto.addTo(map);
    }).catch(()=>{});
  }

  function checkManifest(payload){
    if(payload?.schemaVersion!==1||!Array.isArray(payload.places)||
       payload.places.length!==6||payload.sourceOfTruth!=='lib/vandenberg-viewing.js')
      return false;
    const ids=new Set();
    for(const p of payload.places){
      if(ids.has(p.id)||!/^([a-z]+-?)+$/.test(p.id)||
         !Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
         p.lat<34.55||p.lat>34.8||p.lon< -120.7||p.lon> -120.35||
         !/^[a-z-]+$/.test(p.articleAnchor||'')||
         !/^https:\/\/www\.openstreetmap\.org\/(way|node)\/\d+$/.test(p.osm||''))
        return false;
      ids.add(p.id);
    }
    return true;
  }

  const priorityLabels=['A family outing','Photographing the climb','Closer to the coast'];
  const cautionText={
    1:'Ocean Park closes at dusk; parking and launch access can change.',
    2:'Surf Beach lists 8 a.m.–6 p.m.; launch and wildlife closures can override those hours.',
    3:'College parking permits apply. A particular launch-day campus opening is unverified.',
    4:'Check park hours and events. Town parks do not promise a view of the launch pad.'
  };

  function updateRustComparison(){
    const panel=document.getElementById('vg-rust-choices');
    if(!panel||!state.rust)return;
    panel.hidden=false;
    panel.dataset.engine='rust-wasm';
    const ordered=[...state.places].sort((a,b)=>
      state.rust.vg_rank(state.places.indexOf(b),state.priority,state.marineConcern)-
      state.rust.vg_rank(state.places.indexOf(a),state.priority,state.marineConcern));
    const preferred=ordered[0];
    const index=state.places.indexOf(preferred);
    const intro=document.getElementById('vg-rust-choice-intro');
    const link=document.getElementById('vg-rust-choice-link');
    const caution=document.getElementById('vg-rust-choice-caution');
    const context=document.getElementById('vg-rust-choice-context');
    if(!intro||!link||!caution||!context)return;
    intro.textContent='First place to investigate for '+priorityLabels[state.priority].toLowerCase()+':';
    link.textContent=preferred.name;
    link.href='#'+preferred.articleAnchor;
    caution.textContent=cautionText[state.rust.vg_caution(index)]||'Access must be checked with the land manager.';
    context.textContent=state.marineConcern?
      'You selected a coastal-fog concern. The comparison shifts toward inland alternatives, but does not know which skies are clear.':
      'This compares the six published site profiles, not their current openings or your launch’s weather.';
    panel.querySelectorAll('[data-rust-priority]').forEach(button=>
      button.setAttribute('aria-pressed',String(Number(button.dataset.rustPriority)===state.priority)));
  }

  async function initRust(){
    const panel=document.getElementById('vg-rust-choices');
    if(!panel||typeof WebAssembly==='undefined'||typeof atob!=='function')return;
    try{
      const response=await fetch('/vandenberg-rocket-launch-viewing/viewpoint-engine.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw new Error('Rust module unavailable');
      const encoded=(await response.text()).trim();
      if(encoded.length>250000||!/^[a-zA-Z0-9+/]+=*$/.test(encoded))
        throw new Error('Invalid Rust module');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const {instance}=await WebAssembly.instantiate(bytes,{});
      const wasm=instance.exports;
      if(wasm.vg_engine_version?.()!==1||wasm.vg_site_count?.()!==state.places.length||
         !['vg_rank','vg_visible','vg_caution'].every(key=>typeof wasm[key]==='function'))
        throw new Error('Rust ABI does not match published venues');
      state.rust=wasm;
      panel.querySelectorAll('[data-rust-priority]').forEach(button=>{
        button.addEventListener('click',()=>{
          state.priority=Number(button.dataset.rustPriority);
          updateRustComparison();rows();
        });
      });
      const fog=document.getElementById('vg-rust-marine');
      fog?.addEventListener('change',()=>{
        state.marineConcern=fog.checked?1:0;
        updateRustComparison();rows();
      });
      updateRustComparison();rows();
      root.dataset.rust='ready';
    }catch(_){
      // A browser, network, content-security or WASM failure cannot break the map.
      // The complete six-venue HTML guide and original JS map are still available.
      root.dataset.rust='unavailable';
    }
  }

  async function init(){
    if(!window.L){
      root.querySelector('.vg-map-placeholder span').textContent=
        'The map isn’t loading, but the six viewing places and their access notes are still listed beside it.';
      return;
    }
    try{
      const response=await fetch('/vandenberg-rocket-launch-viewing/places.json',{
        credentials:'same-origin',headers:{Accept:'application/json'},
        signal:AbortSignal.timeout(9000)
      });
      if(!response.ok)throw new Error('map inventory unavailable');
      const payload=await response.json();
      if(!checkManifest(payload))throw new Error('map inventory failed source checks');
      state.places=payload.places;
      root.replaceChildren();
      state.map=window.L.map(root,{
        scrollWheelZoom:false,preferCanvas:true,zoomControl:true
      });
      addBasemap(state.map);
      state.places.forEach(addMarker);
      rows();
      buttons.hidden=false;
      buttons.querySelectorAll('button[data-map-filter]').forEach(btn=>{
        btn.addEventListener('click',()=>filter(btn.dataset.mapFilter));
      });
      fitVisible();
      root.dataset.mapReady='true';
      // This is progressive enhancement: the map is ready without the Rust module.
      initRust();
      // Adjust dimensions after the first layout pass without timers.
      requestAnimationFrame(()=>state.map.invalidateSize(false));
    }catch(_){
      root.replaceChildren();
      const fallback=$('div','vg-map-placeholder');
      fallback.append($('strong','','The map isn’t loading'),
        $('span','','You can still compare all six Lompoc viewing areas and follow their official rules below.'));
      root.appendChild(fallback);
      root.dataset.mapReady='false';
    }
  }
  init();
})();
