'use strict';
/**
 * Static Vandenberg visitor atlas, independent of live mission conditions.
 * Location identity, coordinates and descriptions come from the guide's
 * server-rendered venue cards; tests compare those coordinates/OSM records
 * against lib/vandenberg-viewing.js to prevent two competing location lists.
 *
 * Only the basemap configuration is requested. No LL2/NWS API call, browser
 * geolocation, stored state, or implied launch-day access decision is added.
 */
(() => {
  const $=id=>document.getElementById(id);
  const canvas=$('vg-map-canvas');
  const list=$('vg-map-location-nav');
  if(!canvas||!list)return;
  const categories=new Set(['coast','parks','campus']);
  const sites=[...document.querySelectorAll('article.vg-place-card[data-vg-site]')].map((card,i)=>{
    const lat=Number(card.dataset.vgLat),lon=Number(card.dataset.vgLon);
    const category=card.dataset.vgCategory;
    if(!/^[a-z-]{3,32}$/.test(card.dataset.vgSite||'')||
      !categories.has(category)||!Number.isFinite(lat)||!Number.isFinite(lon)||
      lat<34.5||lat>34.85||lon< -120.8||lon> -120.35)return null;
    const title=card.querySelector('h3')?.textContent?.trim();
    const subtitle=card.querySelector('.vg-place-character')?.textContent?.trim();
    const access=card.querySelector('.vg-place-restriction')?.textContent?.replace(/\s+/g,' ')?.trim();
    const official=card.querySelector('.vg-place-footer a[href^="https://"]');
    const osm=card.dataset.vgOsm;
    if(!title||!subtitle||!access||!/^https:\/\/www\.openstreetmap\.org\/(?:node|way)\/\d+$/.test(osm||''))
      return null;
    return {id:card.dataset.vgSite,index:i+1,category,lat,lon,title,subtitle,access,
      source:official?.href||null,sourceLabel:official?.textContent?.trim()||'Source',
      osm,card,anchor:'#'+card.id};
  }).filter(Boolean);
  const byId=new Map(sites.map(s=>[s.id,s]));
  const styles={coast:'#ad6346',parks:'#2c7d72',campus:'#b48843'};
  const state={map:null,markers:new Map(),base:null,selected:'ocean-park',filter:'all'};
  const make=(tag,cls,value)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined&&value!==null)node.textContent=String(value);
    return node;
  };
  const safeLink=(url,label,cls)=>{
    if(typeof url!=='string'||!/^https:\/\//.test(url))return null;
    let u;try{u=new URL(url)}catch{return null}
    if(!['www.openstreetmap.org','explorelompoc.com','www.vandenberg.spaceforce.mil',
      'www.hancockcollege.edu','www.cityoflompoc.com'].includes(u.hostname))return null;
    const a=make('a',cls,label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';
    return a;
  };
  const matches=s=>state.filter==='all'||s.category===state.filter;
  const active=()=>byId.get(state.selected);
  const mapButton=s=>{
    const b=make('button','vg-map-location-button');
    b.type='button';b.dataset.vgLocation=s.id;
    b.setAttribute('aria-pressed',s.id===state.selected?'true':'false');
    b.setAttribute('aria-label','Select '+s.title+' on the map');
    b.appendChild(make('span','vg-map-location-number',String(s.index).padStart(2,'0')));
    const copy=make('span','vg-map-location-copy');
    copy.appendChild(make('strong','',s.title));
    copy.appendChild(make('small','',
      s.category==='coast'?'Coastal hours and closures':
      s.category==='campus'?'Campus parking regulation':'City park · verify hours'));
    b.appendChild(copy);
    b.addEventListener('click',()=>select(s.id,true,'list'));
    return b;
  };
  function renderSelection(){
    const s=active();
    if(!s)return;
    $('vg-map-selected-category').textContent=
      s.category==='coast'?'COAST · RESTRICTED ACCESS':
      s.category==='campus'?'CAMPUS · PARKING RULES':'CITY PARK · CHECK HOURS';
    $('vg-map-selection-title').textContent=s.title;
    $('vg-map-selected-description').textContent=s.subtitle;
    $('vg-map-access-note').textContent=s.access;
    const actions=$('vg-map-source-actions');
    actions.replaceChildren();
    const source=safeLink(s.source,'Check published access information ↗');
    const osm=safeLink(s.osm,'See the mapped place feature ↗');
    if(source)actions.appendChild(source);
    if(osm)actions.appendChild(osm);
    const article=make('a','vg-map-read-link','Read the full location notes ↓');
    article.href=s.anchor;actions.appendChild(article);
    [...document.querySelectorAll('.vg-place-card[data-vg-site]')].forEach(card=>{
      card.dataset.vgMapSelected=card.dataset.vgSite===s.id?'true':'false';
    });
    list.replaceChildren(...sites.filter(matches).map(mapButton));
    $('vg-map-result-count').textContent=sites.filter(matches).length+' mapped candidates';
    state.markers.forEach((pin,id)=>{
      const site=byId.get(id);
      if(!site)return;
      const icon=makeIcon(site,id===s.id);
      pin.setIcon(icon);
    });
  }
  function track(event,data){
    if(typeof window.gtag!=='function')return;
    window.gtag('event',event,{
      guide:'vandenberg-rocket-launch-viewing',
      ...data
    });
  }
  function select(id,pan,from){
    if(!byId.has(id))return;
    const site=byId.get(id);
    if(!matches(site))state.filter='all';
    state.selected=id;
    renderControls();
    renderSelection();
    if(state.map&&pan){
      state.map.panTo([site.lat,site.lon],{animate:true});
      state.markers.get(id)?.openPopup();
    }
    if(from)track('vandenberg_guide_map_select',{site_id:id,interaction:from});
  }
  function renderControls(){
    document.querySelectorAll('[data-vg-filter]').forEach(b=>{
      b.setAttribute('aria-pressed',b.dataset.vgFilter===state.filter?'true':'false');
    });
    for(const [id,pin] of state.markers){
      const s=byId.get(id);
      if(!s||!state.map)continue;
      if(matches(s)){if(!state.map.hasLayer(pin))pin.addTo(state.map)}
      else if(state.map.hasLayer(pin))state.map.removeLayer(pin);
    }
  }
  function fitVisible(){
    if(!state.map||!window.L)return;
    const points=sites.filter(matches).map(s=>[s.lat,s.lon]);
    if(points.length)state.map.fitBounds(window.L.latLngBounds(points),
      {padding:[34,34],maxZoom:12,animate:false});
  }
  function applyFilter(category){
    if(category!=='all'&&!categories.has(category))return;
    state.filter=category;
    const filtered=sites.filter(matches);
    if(!filtered.some(s=>s.id===state.selected))state.selected=filtered[0]?.id||state.selected;
    renderControls();
    renderSelection();
    fitVisible();
    track('vandenberg_guide_map_filter',{filter:category});
  }
  function makeIcon(s,selected){
    return window.L.divIcon({
      className:'vg-leaflet-pin-anchor',
      html:'<span class="vg-leaflet-pin vg-leaflet-pin-'+s.category+
        (selected?' is-selected':'')+'">'+s.index+'</span>',
      iconSize:[40,40],iconAnchor:[20,20],popupAnchor:[0,-23]
    });
  }
  function makePopup(s){
    const wrap=make('div','vg-leaflet-popup');
    wrap.appendChild(make('strong','',s.title));
    wrap.appendChild(make('p','',s.subtitle));
    wrap.appendChild(make('small','','Published viewing candidate. Access unverified.'));
    return wrap;
  }
  function initMap(){
    if(!window.L){
      canvas.dataset.mapState='unavailable';
      const message=$('vg-map-loading');
      if(message)message.textContent='Map tiles could not start. Use the six location links and full guide below.';
      return;
    }
    try{
      const L=window.L;
      const map=L.map(canvas,{
        scrollWheelZoom:false,preferCanvas:false,zoomControl:true,attributionControl:true,
        tap:false,keyboard:true
      });
      map.attributionControl.setPrefix(false);
      const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      osm.addTo(map);
      state.base=osm;
      state.map=map;
      canvas.dataset.mapState='osm';
      const loading=$('vg-map-loading');if(loading)loading.remove();
      sites.forEach(s=>{
        const pin=L.marker([s.lat,s.lon],{
          icon:makeIcon(s,s.id===state.selected),
          title:s.title,
          alt:'View source-backed launch-viewing candidate: '+s.title,
          keyboard:true
        }).addTo(map);
        pin.bindPopup(makePopup(s),{autoPanPadding:[18,20]});
        pin.on('click',()=>select(s.id,false,'pin'));
        state.markers.set(s.id,pin);
      });
      renderSelection();fitVisible();
      // Uses the site's existing read-only CARTO key endpoint. OSM remains
      // visible until a CARTO tile actually loads; outages do not blank the map.
      if(typeof window.fetch==='function'){
        fetch('/api/carto-basemap-config',{
          credentials:'same-origin',
          signal:typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?
            AbortSignal.timeout(6500):undefined,
          headers:{Accept:'application/json'}
        }).then(r=>r.ok?r.json():null).then(config=>{
          if(!config||config.provider!=='CARTO'||typeof config.key!=='string'||
            !config.key.trim()||!state.map)return;
          const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+
            encodeURIComponent(config.key.trim());
          const carto=L.tileLayer(url,{subdomains:'abcd',maxZoom:19,
            attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'});
          let seen=false,failures=0;
          carto.on('tileload',()=>{
            if(seen||!state.map||!map.hasLayer(carto))return;
            seen=true;canvas.dataset.mapState='carto';
            if(map.hasLayer(osm))map.removeLayer(osm);
            state.base=carto;
          });
          carto.on('tileerror',()=>{
            if(++failures<2||seen)return;
            if(map.hasLayer(carto))map.removeLayer(carto);
            if(!map.hasLayer(osm))osm.addTo(map);
            canvas.dataset.mapState='osm-fallback';
          });
          carto.addTo(map);
        }).catch(()=>{/* OSM remains active. */});
      }
    }catch(_){
      canvas.dataset.mapState='unavailable';
      canvas.replaceChildren(make('div','vg-map-loading',
        'The live map is unavailable. Select a location by name and use its published source below.'));
      state.map=null;state.markers.clear();
      renderSelection();
    }
  }
  document.querySelectorAll('[data-vg-filter]').forEach(button=>{
    button.addEventListener('click',()=>applyFilter(button.dataset.vgFilter));
  });
  $('vg-map-reset')?.addEventListener('click',()=>{
    applyFilter('all');
    fitVisible();
  });
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('[data-vg-open-map]');
    if(!anchor)return;
    const id=anchor.dataset.vgOpenMap;
    if(!byId.has(id))return;
    select(id,true,'article');
  });
  // Defensive behavior on unexpected source drift: render the existing guide
  // but do not draw misleading or partial map pins.
  if(sites.length!==6||byId.size!==6){
    canvas.dataset.mapState='invalid';
    canvas.replaceChildren(make('p','vg-map-loading',
      'The viewing map is being checked against its source records. The full site guide remains available below.'));
    return;
  }
  renderControls();
  renderSelection();
  initMap();
})();
