(function () {
  'use strict';
  const container = document.getElementById('sooVesselMap');
  const status = document.getElementById('vesselMapStatus');
  const dot = document.getElementById('vesselMapDot');
  const refresh = document.getElementById('vesselMapRefresh');
  const list = document.getElementById('sooVesselList');
  const credits = document.getElementById('sooAisCredits');
  let map, layer, fitted = false, busy = false, started = false, previous;
  const title = v => v.name || 'Vessel ' + v.mmsi;
  const age = v => Math.max(0, Math.round((Date.now() - Date.parse(v.seen)) / 60000));
  function text(tag, content) { const el=document.createElement(tag);el.textContent=content;return el; }
  function details(v) {
    return (v.speedKnots === null ? 'Speed unavailable' : (v.speedKnots * 1.15078).toFixed(1) + ' mph (' + v.speedKnots.toFixed(1) + ' kn)') +
      ' · reported ' + age(v) + ' min ago · ' + v.source;
  }
  function render(data, failed) {
    const vessels = data.vessels.filter(v => Number.isFinite(Date.parse(v.seen)) && Date.now() - Date.parse(v.seen) <= 1800000);
    list.replaceChildren();
    if (layer) layer.clearLayers();
    const points=[];
    vessels.forEach(v => {
      const content=document.createElement('div');content.append(text('strong',title(v)),text('p',details(v)),text('p','MMSI ' + v.mmsi));
      if (v.course !== null) content.append(text('p','Course ' + Math.round(v.course) + '°'));
      let marker;
      if (map) {
        marker=L.circleMarker([v.lat,v.lon], {radius:v.shipType>=70&&v.shipType<90?9:6,color:'#fff',weight:2,fillColor:v.speedKnots===null?'#64748b':v.speedKnots>0.5?'#146c86':'#a6651e',fillOpacity:0.95}).addTo(layer);
        marker.bindTooltip(text('span',title(v)),{direction:'top'}).bindPopup(content);
        points.push([v.lat,v.lon]);
      }
      const item=document.createElement('li');
      if (marker) {
        const button=text('button',title(v));button.type='button';button.addEventListener('click',()=>{map.setView([v.lat,v.lon],15);marker.openPopup();container.scrollIntoView({block:'center',behavior:'smooth'});});item.append(button);
      } else item.append(text('strong',title(v)));
      item.append(text('span',details(v)));list.append(item);
    });
    if (!vessels.length) list.append(text('li','No reports less than 30 minutes old were returned for this area. This does not mean there are no ships.'));
    if (map && points.length && !fitted) {map.fitBounds(points,{padding:[30,30],maxZoom:13});fitted=true;}
    const count=vessels.length + ' recent vessel report' + (vessels.length===1?'':'s');
    status.textContent = failed ? 'Refresh unavailable. ' + count + ' retained from the earlier check; see report ages below.' :
      count + ' near the Soo · checked ' + new Date(data.checkedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'}) + (map?'':' · map unavailable; vessel list below');
    dot.className='vessel-map-status-dot'+(failed?' offline':vessels.length?' live':'');
    credits.textContent='Source credits: '+data.attribution.map(a=>a.credit).join(' · ');
  }
  async function load() {
    if (busy) return;
    busy=true;refresh.disabled=true;
    try {
      const r=await fetch('/api/soo-ais',{signal:AbortSignal.timeout(12000)});const data=await r.json();
      if (!r.ok || !data.ok || !Array.isArray(data.vessels)) throw new Error('AIS unavailable');
      previous=data;render(data,false);
    } catch (_) {
      if (previous) render(previous,true);
      else {status.textContent='Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.';dot.className='vessel-map-status-dot offline';list.replaceChildren(text('li','The feed did not return usable data. This is not a zero-traffic report.'));}
    } finally {busy=false;refresh.disabled=false;}
  }
  function start() {
    if (started) return;started=true;
    if (typeof L !== 'undefined') {
      map=L.map(container,{scrollWheelZoom:false}).setView([46.5036,-84.36],13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      layer=L.layerGroup().addTo(map);
    } else container.textContent='Map could not load. Recent vessel reports remain available in the list below.';
    load();setInterval(()=>{if(!document.hidden)load();},60000);
  }
  refresh.addEventListener('click',()=>{if(!started)start();else load();});
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{rootMargin:'300px'});observer.observe(container);
  } else start();
})();
