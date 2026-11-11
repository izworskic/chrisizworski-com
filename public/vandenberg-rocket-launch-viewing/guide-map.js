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

  const state={map:null,places:[],markers:new Map(),filter:'all',active:null};
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
  const visible=place=>state.filter==='all'||kind(place)===state.filter;
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
    state.places.forEach((p,i)=>{
      if(visible(p))list.appendChild(makeRow(p,i));
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
