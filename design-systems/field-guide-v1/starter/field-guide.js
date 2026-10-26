/* FIELD_GUIDE_V1 · static first, optional map second · no tracking or private-key storage */
(() => {
  'use strict';
  const form = document.getElementById('fg-form');
  if (!form) return;
  const cards = [...document.querySelectorAll('.fg-story')];
  const region = document.getElementById('fg-region');
  const season = document.getElementById('fg-season');
  const chips = [...document.querySelectorAll('.fg-chip')];
  const results = document.getElementById('fg-results');
  const empty = document.getElementById('fg-empty');
  const mapTarget = document.getElementById('fg-map');
  const mapStatus = document.getElementById('fg-map-status');
  const data = { mood:'all', map:null, markers:[], tileLayer:null, resize:null };

  const setMapStatus = (message, state) => {
    if (!mapStatus) return;
    mapStatus.textContent = message;
    mapStatus.dataset.state = state;
  };
  const visible = () => cards.filter(card => !card.hidden);

  function updateFilter({announce=true}={}) {
    chips.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === data.mood)));
    for (const card of cards) {
      const tags = card.dataset.moods.split(',');
      const seasons = card.dataset.seasons.split(',');
      card.hidden = (data.mood !== 'all' && !tags.includes(data.mood)) ||
        (season.value !== 'any' && !seasons.includes(season.value)) ||
        (region.value !== 'all' && card.dataset.region !== region.value);
    }
    const count = visible().length;
    if (announce) results.textContent = count
      ? count + ' places fit these editorial filters. Confirm actual access and current conditions with the sources below.'
      : 'No matching sample places. Change a filter or show everything.';
    empty.hidden = count !== 0;
    redrawMarkers();
  }
  chips.forEach(button => button.addEventListener('click', () => {
    data.mood = button.dataset.mood; updateFilter();
  }));
  region.addEventListener('change', () => updateFilter());
  season.addEventListener('change', () => updateFilter());
  form.addEventListener('submit', event => {
    event.preventDefault();
    updateFilter();
    document.getElementById('fg-stories').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  document.getElementById('fg-clear').addEventListener('click', () => {
    data.mood='all';region.value='all';season.value='any';updateFilter();
  });

  function redrawMarkers() {
    if (!data.map || !window.L) return;
    for (const marker of data.markers) data.map.removeLayer(marker);
    data.markers=[];
    const bounds=[];
    const pin = window.L.divIcon({className:'',html:'<span class="fg-map-pin" aria-hidden="true"></span>',iconSize:[18,18],iconAnchor:[9,9]});
    for (const card of visible()) {
      const lat=Number(card.dataset.lat), lng=Number(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const title=card.querySelector('h3')?.textContent||'Destination';
      const node=document.createElement('div');
      const heading=document.createElement('b');heading.textContent=title;
      const anchor=document.createElement('a');anchor.href='#'+card.id;
      anchor.textContent='Read this place →';
      anchor.style.display='block';
      anchor.addEventListener('click', e => {
        e.preventDefault();card.scrollIntoView({behavior:'smooth',block:'start'});
        card.querySelector('.fg-links a')?.focus({preventScroll:true});
        data.map.closePopup();
      });
      node.append(heading,anchor);
      data.markers.push(window.L.marker([lat,lng],{icon:pin,title}).bindPopup(node).addTo(data.map));
      bounds.push([lat,lng]);
    }
    if (bounds.length>1) data.map.fitBounds(bounds,{padding:[20,20],maxZoom:8});
    else if (bounds.length===1) data.map.setView(bounds[0],8);
    else data.map.setView([46.7,-87.4],6);
  }
  function attachTiles(url,provider) {
    if(!data.map) return;
    if(data.tileLayer) data.map.removeLayer(data.tileLayer);
    const layer=window.L.tileLayer(url,{
      subdomains:provider==='CARTO'?'abcd':'abc',maxZoom:18,
      attribution:provider==='CARTO'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    data.tileLayer=layer;let fails=0;
    layer.on('load',()=>{
      if (data.tileLayer!==layer) return;
      setMapStatus(provider==='CARTO'?'CARTO map tiles received. Select a pin.':'OpenStreetMap fallback tiles received. Select a pin.',
        provider==='CARTO'?'ready':'fallback');
    });
    layer.on('tileerror',()=>{
      if(data.tileLayer!==layer)return;
      if(++fails>=2 && provider==='CARTO') {
        setMapStatus('CARTO tiles failed. Switching to OpenStreetMap.', 'fallback');
        attachTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM');
      }else if(fails>=2){setMapStatus('Map tiles unavailable. Use the destination stories and map link.', 'error');}
    });
    layer.addTo(data.map);
  }
  async function startTiles() {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),6500);
    try {
      const response=await fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:controller.signal});
      if(!response.ok)throw new Error('CARTO config unavailable');
      const config=await response.json();
      if(config?.provider!=='CARTO' || typeof config.key!=='string' || !config.key.trim())
        throw new Error('CARTO public key unavailable');
      const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+
        encodeURIComponent(config.key.trim());
      attachTiles(url,'CARTO');
    } catch {
      setMapStatus('The host has no CARTO configuration. Using OpenStreetMap as a fallback.', 'fallback');
      attachTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','OSM');
    } finally {
      clearTimeout(timeout);
    }
  }
  function initMap() {
    if(!window.L || !mapTarget) {
      setMapStatus('Interactive map is unavailable; all place descriptions and links work without it.','error');
      return;
    }
    try {
      mapTarget.textContent='';
      data.map=window.L.map(mapTarget,{scrollWheelZoom:false,zoomControl:true}).setView([46.7,-87.4],6);
      redrawMarkers();
      if(typeof ResizeObserver!=='undefined'){
        data.resize=new ResizeObserver(()=>data.map?.invalidateSize({pan:false}));
        data.resize.observe(mapTarget);
      }
      window.requestAnimationFrame(()=>data.map?.invalidateSize({pan:false}));
      window.addEventListener('load',()=>data.map?.invalidateSize({pan:false}),{once:true});
      startTiles();
    }catch{
      mapTarget.textContent='Map could not start. Use the direct destination and official source links.';
      setMapStatus('Map failed. Destination stories are still available.','error');
    }
  }
  updateFilter({announce:false});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMap,{once:true});
  else initMap();
})();
