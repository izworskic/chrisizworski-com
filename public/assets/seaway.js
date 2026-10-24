/* Seaway ship watch: recent observations, verified places, and educational models. */
(()=>{
  'use strict';
  const D=window.SeawayReference,C=window.SeawayCore,$=id=>document.getElementById(id);
  if(!D||!C)return;
  const regionById=new Map(D.regions.map(r=>[r.id,r])),lockById=new Map(D.locks.map(l=>[l.id,l])),viewById=new Map(D.viewpoints.map(v=>[v.id,v]));
  const cache=new Map(),errors=new Set(),markers=new Map(),lockMarkers=new Map(),viewMarkers=new Map(),lockGroups=new Map();
  const cameraById=new Map((D.cameras||[]).map(c=>[c.id,c]));
  let selectedCamera=D.cameras?.[0]?.id,cameraPlayer=null;
  let region=document.body.dataset.defaultRegion||'all',selectedLock='eisenhower',selectedView='eisenhower-center',selectedShip=null;
  let map=null,shipsLayer=null,requestId=0,loading=false,location=null,playing=false,frameId=null,lastFrame=null,progress=0;
  const svgNS='http://www.w3.org/2000/svg',reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const focusable='a[href],button,[tabindex]';
  function focusIndex(root){return [...root.querySelectorAll(focusable)].indexOf(document.activeElement);}
  function restoreFocus(root,index){if(index>=0&&!root.contains(document.activeElement))root.querySelectorAll(focusable)[index]?.focus({preventScroll:true});}
  function el(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;}
  function a(label,url){const n=el('a',label);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;}
  function svg(tag,attrs={},value){const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(value!==undefined)n.textContent=value;return n;}
  function track(action,label){if(typeof window.gtag==='function')window.gtag('event','seaway_interaction',{action,label,page:document.body.dataset.seawayPage});}
  const time=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'time unavailable';};
  const age=value=>{const mins=Math.max(0,Math.floor((Date.now()-Date.parse(value))/60000));return mins<1?'less than a minute ago':mins+' min ago';};
  const directions=v=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.directionsQuery);
  function readURL(){
    const p=new URL(locationHref()).searchParams;
    const r=p.get('region');region=r==='all'||regionById.has(r)?r:document.body.dataset.defaultRegion||'all';
    selectedLock=lockById.has(p.get('lock'))?p.get('lock'):'eisenhower';
    selectedView=viewById.has(p.get('view'))?p.get('view'):'eisenhower-center';
    selectedShip=/^\d{9}$/.test(p.get('vessel')||'')?p.get('vessel'):null;
    selectedCamera=cameraById.has(p.get('camera'))?p.get('camera'):D.cameras?.[0]?.id;
    cameraPlayer?.select(selectedCamera,{notify:false});
    $('regionSelect').value=region;$('viewingSide').value=viewById.get(selectedView).country;
  }
  function locationHref(){return window.location.href;}
  function writeURL(push=false){
    const url=new URL(locationHref());url.searchParams.set('region',region);url.searchParams.set('lock',selectedLock);url.searchParams.set('view',selectedView);
    if(selectedShip)url.searchParams.set('vessel',selectedShip);else url.searchParams.delete('vessel');
    if(selectedCamera)url.searchParams.set('camera',selectedCamera);
    if(url.href!==locationHref())window.history[push?'pushState':'replaceState'](null,'',url);
  }
  function data(){return cache.get(region)||cache.get('all')||null;}
  function reports(){return C.visible(data()?.vessels||[],region,$('shipSearch').value,$('vesselKind').value);}
  function reportFor(id){return C.visible(data()?.vessels||[],region).find(v=>v.mmsi===id);}
  function shipSVG(){return '<svg viewBox="0 0 72 32" aria-hidden="true" focusable="false"><path class="ship-hull" d="M3 19h5l3 5h47l9-6 3-4h-8l-7 4H20z"/><path class="ship-house" d="M8 19V10h12v9z"/><rect class="ship-stack" x="11" y="5" width="4" height="5" rx="1"/><rect class="ship-window" x="10" y="12" width="3" height="2"/><rect class="ship-window" x="15" y="12" width="3" height="2"/><rect class="ship-hatch" x="24" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="34" y="15" width="8" height="4" rx="1"/><rect class="ship-hatch" x="44" y="15" width="8" height="4" rx="1"/></svg>';}
  function shipDetail(v){
    const div=el('div');div.append(el('h3',v.name||'AIS vessel '+v.mmsi),el('p',C.motion(v)+' · '+C.direction(v)),el('p','Reported '+time(v.seen)+' · '+age(v.seen)));
    if(v.lengthMeters)div.append(el('p','Reported length '+v.lengthMeters+' m'+(v.beamMeters?' · beam '+v.beamMeters+' m':'')));
    div.append(el('p','A recent position, not a lock appointment. AIS destination text is not a verified itinerary.'),a('Check official lock order of turn ↗',D.officialQueue),el('br'),a('Original ship reports & source ↗','https://ais.openwaters.io/v1/vessels/'+v.mmsi));return div;
  }
  function updateReportLine(){
    const d=data(),has=C.visible(d?.vessels||[],region).length,unavailable=errors.has(region)||d?.state==='unavailable';
    const regionResult=d?.regions?.find(r=>r.id===region),state=region==='all'?d?.state:regionResult?.state||d?.state;
    let label=loading?'Checking the river’s recent signals…':unavailable?'The receiver cannot be checked right now':state==='partial'?'Partial reports received · coverage has gaps':has?has+' recently reported vessel'+(has===1?'':'s'):'No fresh signals received from this stretch';
    if(unavailable&&has)label+=' · recent saved reports remain below';
    $('reportState').textContent=label;$('reportState').parentElement.dataset.state=unavailable?'unavailable':state||'loading';
    $('reportTime').textContent=d?.checkedAt?'Last successful source check '+time(d.checkedAt):'Report ages appear with each ship.';
    $('regionContext').textContent=region==='all'?'Five researched areas from Montreal toward Lake Ontario. These are received reports, not a complete census or a list of confirmed Seaway transits.':regionById.get(region).note;
  }
  function updateList(){
    const ships=reports(),container=$('shipList'),keep=new Set(ships.map(v=>v.mmsi));
    $('shipCount').textContent=ships.length;
    if(!ships.length){
      container.replaceChildren();const box=el('div',undefined,'empty');
      const filtered=$('shipSearch').value.trim()||$('vesselKind').value!=='all';
      box.append(el('strong',filtered?'Try a wider search.':'Keep a little room for the river.'),el('p',filtered?'No fresh received report matches these filters. Try all reporting vessels or clear the ship search.':'We have no fresh ship reports to show in this stretch right now. A quiet receiver does not mean an empty waterway.'),a('Look at the official transit information ↗',D.officialQueue));
      if(region!=='all'){const button=el('button','Explore reports along the corridor', 'button secondary');button.type='button';button.style.marginTop='14px';button.addEventListener('click',()=>setRegion('all',true));box.append(button);}
      container.append(box);
    }else{
      for(const node of [...container.children])if(!node.dataset.mmsi||!keep.has(node.dataset.mmsi))node.remove();
      for(const v of ships){
        let card=[...container.children].find(n=>n.dataset.mmsi===v.mmsi);
        if(!card){card=el('button',undefined,'ship-card');card.type='button';card.dataset.mmsi=v.mmsi;card.addEventListener('click',()=>chooseShip(v.mmsi,true));container.append(card);}
        card.setAttribute('aria-pressed',String(selectedShip===v.mmsi));
        const stamp=[v.name,v.seen,v.speedKnots,v.heading,v.course,v.lengthMeters,age(v.seen)].join('|');
        if(card.dataset.stamp!==stamp){
          const top=el('strong',undefined,'ship-name'),symbol=el('span',undefined,'ship-symbol');symbol.innerHTML=shipSVG();top.append(symbol,el('span',v.name||'AIS vessel '+v.mmsi));
          card.replaceChildren(top,el('span',C.motion(v)+' · '+C.direction(v),'meta'),el('span',(v.lengthMeters?v.lengthMeters+' m · ':'')+'MMSI '+v.mmsi,'meta'),el('small','Heard '+age(v.seen)+' · '+time(v.seen)));
          card.dataset.stamp=stamp;
        }
        // Maintain order without detaching a focused control during refresh.
        const index=ships.indexOf(v);if(container.children[index]!==card)container.insertBefore(card,container.children[index]||null);
      }
    }
    const credits=[...new Set((data()?.attribution||[]).map(x=>x.credit||x.source))];
    $('shipAttribution').textContent='Open Waters public AIS'+(credits.length?' · '+credits.join(' · '):' · attribution supplied with received reports');
    const selected=reportFor(selectedShip);$('useShipDimensions').disabled=!(selected?.lengthMeters&&selected?.beamMeters);
  }
  function updateRegionReports(){
    const container=$('regionReports'),focused=focusIndex(container);container.replaceChildren();
    for(const r of D.regions){
      const record=data()?.regions?.find(x=>x.id===r.id),button=el('button',undefined,'region-report');button.type='button';button.append(el('strong',r.name));
      const count=C.visible(data()?.vessels||[],r.id).length;
      button.append(el('span',!record?'Choose to check reports':record.state==='unavailable'?'Source unavailable':count?count+' received report'+(count===1?'':'s')+(record.truncated?' · partial':''):'No fresh reports received'));
      button.setAttribute('aria-label',r.name+': '+button.lastChild.textContent);button.addEventListener('click',()=>setRegion(r.id,true));container.append(button);
    }
    restoreFocus(container,focused);
  }
  function mapMessage(){if(!map)return;const count=reports().filter(v=>map.getBounds().contains([v.lat,v.lon])).length;$('mapStatus').textContent=count+' loaded ship report'+(count===1?'':'s')+' in this map view. Ships stay scoped to the selected region; choose another stretch to load its reports. Dots are approximate lock landmarks.';}
  function shipIcon(v){
    const z=map.getZoom(),chosen=v.mmsi===selectedShip,size=chosen?[59,29]:z<8?[30,17]:[43,23],state=!Number.isFinite(v.speedKnots)?'is-unknown':v.speedKnots<.5?'is-stopped':'';
    return {key:size.join(':')+state+chosen,icon:L.divIcon({className:'seaway-ship-marker '+state+(chosen?' is-selected':''),html:shipSVG(),iconSize:size,iconAnchor:[size[0]/2,size[1]/2],popupAnchor:[0,-size[1]/2]})};
  }
  function drawShips(){
    if(!map)return;const ships=reports(),keep=new Set(ships.map(v=>v.mmsi));
    for(const [id,m]of markers)if(!keep.has(id)){shipsLayer.removeLayer(m);markers.delete(id);}
    for(const v of ships){
      const glyph=shipIcon(v);let m=markers.get(v.mmsi);
      if(!m){m=L.marker([v.lat,v.lon],{icon:glyph.icon,keyboard:true,title:v.name||'AIS vessel '+v.mmsi,zIndexOffset:v.mmsi===selectedShip?1000:0}).addTo(shipsLayer).bindPopup(shipDetail(v),{maxWidth:270});m.on('click',()=>chooseShip(v.mmsi,false));markers.set(v.mmsi,m);}
      else{
        if(m._seawayLat!==v.lat||m._seawayLon!==v.lon)m.setLatLng([v.lat,v.lon]);
        if(m._seawayIcon!==glyph.key)m.setIcon(glyph.icon);
        if(m._seawaySeen!==v.seen)m.setPopupContent(shipDetail(v));
        m.setZIndexOffset(v.mmsi===selectedShip?1000:0);
      }
      m._seawayLat=v.lat;m._seawayLon=v.lon;m._seawayIcon=glyph.key;m._seawaySeen=v.seen;
    }
    mapMessage();
  }
  function chooseShip(id,focus){
    const v=reportFor(id);if(!v)return;
    selectedShip=id;writeURL();updateList();drawShips();const panel=$('mapSelection');panel.replaceChildren(el('strong',v.name||'AIS vessel '+v.mmsi),el('p',C.motion(v)+' · '+C.direction(v)+' · last heard '+age(v.seen)),el('p','This position does not establish the next lock or an arrival time.'));
    const links=el('div',undefined,'link-row');links.append(a('Official transit information ↗',D.officialQueue),a('Original ship reports ↗','https://ais.openwaters.io/v1/vessels/'+v.mmsi));panel.append(links);
    if(focus&&map){map.setView([v.lat,v.lon],Math.max(11,map.getZoom()),{animate:false});markers.get(id)?.openPopup();}
    track('select_ship','reported-vessel');
  }
  function render(){updateReportLine();updateList();updateRegionReports();drawShips();renderView();if(selectedShip&&!reportFor(selectedShip)){$('mapSelection').replaceChildren(el('strong','That ship’s fresh signal is out of reach.'),el('p','Its report may have aged out or left the selected region. Choose a current ship card or consult the official transit information.'));}}
  async function loadReports(){
    if(document.hidden)return;
    const id=++requestId,scope=region;loading=true;updateReportLine();$('refreshReports').disabled=true;
    try{
      const r=await fetch('/api/st-lawrence-seaway?region='+encodeURIComponent(scope),{signal:AbortSignal.timeout(15000)});
      const value=await r.json();
      if(id!==requestId||scope!==region)return;
      if(!r.ok||!value.ok||!Array.isArray(value.vessels)||!Array.isArray(value.regions))throw new Error('AIS check unavailable');
      cache.set(scope,value);errors.delete(scope);
    }catch(_){if(id===requestId&&scope===region)errors.add(scope);}
    finally{if(id===requestId){loading=false;$('refreshReports').disabled=false;render();if(selectedShip&&reportFor(selectedShip))chooseShip(selectedShip,false);}}
  }
  function fitRegion(){
    if(!map)return;const boxes=region==='all'?D.regions.map(r=>r.bbox):[regionById.get(region).bbox];
    map.fitBounds([[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1]))],[Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))]],{padding:[25,25],animate:false});
  }
  function setRegion(id,push=false){
    if(id!=='all'&&!regionById.has(id))return;
    if(id!==region){region=id;selectedShip=null;$('regionSelect').value=id;writeURL(push);fitRegion();render();void loadReports();}
    else fitRegion();track('select_region',id);
  }
  async function startMap(){
    try{
      if(!window.L)throw new Error('Map library unavailable');
      map=L.map('seawayMap',{scrollWheelZoom:false,zoomControl:true,preferCanvas:true,worldCopyJump:true});
      shipsLayer=L.layerGroup().addTo(map);fitRegion();
      for(const l of D.locks){
        const icon=L.divIcon({className:'seaway-lock-marker'+(l.id===selectedLock?' is-selected':''),html:'<span>'+l.number+'</span>',iconSize:[26,26],iconAnchor:[13,13]});
        const marker=L.marker([l.lat,l.lon],{icon,title:'Lock '+l.number+' · '+l.name,keyboard:true,zIndexOffset:500}).addTo(map).bindTooltip('Lock '+l.number+' · '+l.name,{direction:'top'});
        marker.on('click',()=>chooseLock(l.id,true));lockMarkers.set(l.id,marker);
      }
      for(const v of D.viewpoints){
        const marker=L.marker([v.lat,v.lon],{icon:L.divIcon({className:'seaway-view-marker',html:'<span>◎</span>',iconSize:[26,26],iconAnchor:[13,13]}),title:v.name+' · public viewing',keyboard:true,zIndexOffset:600});
        const content=el('div');content.append(el('h3',v.name),el('p',v.description),a('Directions to public viewing ↗',directions(v)),el('br'),a('Official access information ↗',v.source));
        marker.bindPopup(content,{maxWidth:270});marker.on('click',()=>chooseView(v.id,false));viewMarkers.set(v.id,marker);
      }
      for(const ids of [['lower-beauharnois','upper-beauharnois'],['snell','eisenhower']]){
        const locks=ids.map(id=>lockById.get(id)),lat=locks.reduce((n,l)=>n+l.lat,0)/2,lon=locks.reduce((n,l)=>n+l.lon,0)/2;
        const m=L.marker([lat,lon],{icon:L.divIcon({className:'seaway-lock-marker seaway-lock-group',html:'<span>'+locks.map(l=>l.number).join('·')+'</span>',iconSize:[34,34],iconAnchor:[17,17]}),title:locks.map(l=>l.name).join(' and ')+' · select to zoom in',keyboard:true,zIndexOffset:550});
        m.on('click',()=>map.setView([lat,lon],13,{animate:false}));lockGroups.set(ids.join(','),m);
      }
      renderMapLandmarks();map.on('zoomend',()=>{renderMapLandmarks();drawShips();});map.on('moveend',mapMessage);drawShips();
      let key='';try{const r=await fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(8000)});if(r.ok){const config=await r.json();if(config.provider==='CARTO'&&typeof config.key==='string')key=config.key;}}catch(_){/* Keep public access usable with the established fallback. */}
      let fallback=false;
      function tiles(carto){
        const url=carto?'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(key):'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        const layer=L.tileLayer(url,{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'+(carto?' &copy; <a href="https://carto.com/attributions">CARTO</a>':'')}).addTo(map);
        layer.on('tileerror',()=>{if(carto&&!fallback){fallback=true;map.removeLayer(layer);tiles(false);}else $('mapStatus').textContent='Some map tiles could not load. The ship cards, lock buttons and public viewing directions are still available.';});
      }
      tiles(Boolean(key));
    }catch(_){$('mapStatus').textContent='The map could not open. Use the ship cards, lock buttons and public viewing directions on this page.';$('seawayMap').append(el('p','The river guide remains available below while the map is out of reach.','empty'));}
  }
  function renderViewMarkers(){
    if(!map)return;const side=$('viewingSide').value;
    for(const v of D.viewpoints){const m=viewMarkers.get(v.id);if(map.getZoom()>=10&&(side==='all'||side===v.country)){if(!map.hasLayer(m))m.addTo(map);}else if(map.hasLayer(m))map.removeLayer(m);}
  }
  function renderMapLandmarks(){
    if(!map)return;const grouped=map.getZoom()<11;
    for(const [ids,m]of lockGroups){if(grouped){if(!map.hasLayer(m))m.addTo(map);}else if(map.hasLayer(m))map.removeLayer(m);for(const id of ids.split(',')){const pin=lockMarkers.get(id);if(grouped){if(map.hasLayer(pin))map.removeLayer(pin);}else if(!map.hasLayer(pin))pin.addTo(map);}}
    renderViewMarkers();
  }
  function renderView(){
    const side=$('viewingSide').value,allowed=D.viewpoints.filter(v=>side==='all'||v.country===side);
    if(!allowed.some(v=>v.id===selectedView)&&allowed.length)selectedView=allowed[0].id;
    for(const b of document.querySelectorAll('#viewingChoices [data-viewpoint]')){const v=viewById.get(b.dataset.viewpoint);b.hidden=side!=='all'&&v.country!==side;b.setAttribute('aria-pressed',String(v.id===selectedView));}
    const v=viewById.get(selectedView),panel=$('viewingDetail'),focused=focusIndex(panel);
    panel.replaceChildren(el('p',v.tag,'eyebrow'),el('h3',v.name+' · '+v.place),el('p',v.description),el('p',v.practical));
    const nearby=C.visible(data()?.vessels||[],'all').filter(ship=>C.distance(v,ship)<=5),activity=el('div',undefined,'local-activity');
    const checked=data()?.regions?.some(r=>r.id===v.region&&r.state!=='unavailable');
    activity.append(el('strong',nearby.length?nearby.length+' recent report'+(nearby.length===1?'':'s')+' within about 5 km':!checked?'Check this region for recent signals':'No fresh reports received within about 5 km'));
    activity.append(el('p',nearby.length?nearby.map(x=>x.name||x.mmsi).join(' · ')+'. Proximity does not establish a lock arrival or visibility from this spot.':'Consult the official order of turn before timing your visit. Coverage gaps can leave passing ships unreported.'));panel.append(activity,el('p',v.fallback),el('p',v.access));
    if(location)panel.append(el('p',C.distance(location,v).toFixed(0)+' km straight-line distance from your location. Check road directions; this is not driving distance.','fine'));
    const links=el('div',undefined,'link-row');links.append(a('Directions to public viewing ↗',directions(v)),a('Official access & visitor information ↗',v.source));
    if(v.detailUrl&&window.location.pathname!==v.detailUrl){const link=el('a','Full Eisenhower Lock visiting guide →');link.href=v.detailUrl;links.append(link);}
    const explore=el('button','Check ships in this region','button secondary');explore.type='button';explore.addEventListener('click',()=>setRegion(v.region,true));links.append(explore);panel.append(links);restoreFocus(panel,focused);renderViewMarkers();
  }
  function chooseView(id,focus=true){
    const v=viewById.get(id);if(!v)return;
    selectedView=id;$('viewingSide').value=v.country;renderView();writeURL(true);
    if(focus){setRegion(v.region);if(map){map.setView([v.lat,v.lon],13,{animate:false});viewMarkers.get(id)?.openPopup();}$('viewing-plan').scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'});}
    track('select_viewpoint',id);
  }
  function chooseLock(id,focus=false){
    const lock=lockById.get(id);if(!lock)return;selectedLock=id;pauseModel();progress=0;renderModel();drawProfile();
    for(const b of document.querySelectorAll('[data-lock]'))b.setAttribute('aria-pressed',String(b.dataset.lock===id));
    const story=$('lockStory');story.replaceChildren(el('p','Lock '+lock.number+' · '+(lock.country==='US'?'United States':'Canada'),'eyebrow'),el('h3',lock.name),el('p',lock.story),el('p',lock.access));
    if(lock.viewpoint){const button=el('button','Explore public viewing →','button secondary');button.type='button';button.addEventListener('click',()=>chooseView(lock.viewpoint));story.append(button);}
    if(map)for(const [key,marker]of lockMarkers){if(marker._seawaySelected!==(key===id)){marker.setIcon(L.divIcon({className:'seaway-lock-marker'+(key===id?' is-selected':''),html:'<span>'+lockById.get(key).number+'</span>',iconSize:[26,26],iconAnchor:[13,13]}));marker._seawaySelected=key===id;}}
    if(focus){setRegion(lock.region);if(map)map.setView([lock.lat,lock.lon],13,{animate:false});const panel=$('mapSelection');panel.replaceChildren(el('strong','Lock '+lock.number+' · '+lock.name),el('p',lock.story),el('p',lock.access));}
    writeURL(focus);track('select_lock',id);
  }
  const stages=['Enter the chamber at the starting water level.','Secure the ship. Both gates close.','Change the water level by gravity.','Match the water level on the departure side.','Open the departure gate and continue the journey.'];
  function renderModel(){
    const lock=lockById.get(selectedLock),down=$('modelDirection').value==='down',frame=C.lockFrame(progress,lock.lift,down);
    $('modelProgress').value=progress;$('modelLockName').textContent=lock.name+' · '+(lock.variableLift?'illustrative adjustment ':'reference lift ')+lock.lift.toFixed(1)+' m';
    for(const id of ['chamberWater','chamberTexture']){$(id).setAttribute('y',frame.water);$(id).setAttribute('height',290-frame.water);}
    $('upperWater').setAttribute('y',frame.high);$('upperWater').setAttribute('height',290-frame.high);
    $('modelShip').setAttribute('transform','translate('+frame.x+' '+frame.water+')');
    $('lowerGate').setAttribute('opacity',frame.lowerOpen?.12:1);$('upperGate').setAttribute('opacity',frame.upperOpen?.12:1);
    $('flowPath').setAttribute('visibility',frame.changing?'visible':'hidden');$('flowPath').setAttribute('d',down?'M440 250V276H155':'M700 276H440V250');
    const change=frame.stage===2?(down?'Emptying by gravity':'Filling by gravity'):frame.stage===4?'Continue '+(down?'downbound':'upbound'):frame.stage===3?'Levels match':frame.stage===1?'Both gates closed':'Enter at the starting level';
    if($('waterChange').textContent!==change)$('waterChange').textContent=change;
    const stageText=(frame.stage+1)+' · '+stages[frame.stage];if($('modelStage').textContent!==stageText)$('modelStage').textContent=stageText;
    const desc=lock.name+'. '+(down?'Downbound':'Upbound')+' educational sequence. '+stages[frame.stage]+' Lower gate '+(frame.lowerOpen?'open':'closed')+'; upper gate '+(frame.upperOpen?'open':'closed')+'. Not live lock telemetry.';
    if($('modelDesc').textContent!==desc)$('modelDesc').textContent=desc;
  }
  function pauseModel(){playing=false;if(frameId)cancelAnimationFrame(frameId);frameId=null;lastFrame=null;$('playModel').textContent='Play the lock journey';}
  function animateModel(now){
    if(!playing)return;if(lastFrame!==null)progress=C.clamp(progress+(now-lastFrame)/230,0,100);lastFrame=now;renderModel();
    if(progress>=100){pauseModel();return;}frameId=requestAnimationFrame(animateModel);
  }
  function drawProfile(){
    const target=$('liftProfile'),focused=focusIndex(target),width=Math.max(300,target.clientWidth||900),height=240,left=42,right=15,top=25,bottom=height-39,span=(width-left-right)/7;
    const s=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-labelledby':'profileTitle profileDesc'});s.append(svg('title',{id:'profileTitle'},'Cumulative reference lift through seven Seaway locks'),svg('desc',{id:'profileDesc'},'The chart adds lock lifts only. Natural river gradients are omitted. Equal horizontal steps do not represent distance.'));
    const y=v=>bottom-v/70*(bottom-top);for(const n of [0,20,40,60]){s.append(svg('line',{x1:left,y1:y(n),x2:width-right,y2:y(n),class:'chart-grid'}),svg('text',{x:left-8,y:y(n)+4,'text-anchor':'end',class:'chart-label'},n+' m'));}
    let sum=0,path='M'+left+' '+y(0);const points=[];
    D.locks.forEach((l,i)=>{const x=left+(i+1)*span;path+='H'+x;sum+=l.lift;path+='V'+y(sum);points.push({l,x,y:y(sum),sum});});
    s.append(svg('path',{d:path+'V'+bottom+'H'+left+'Z',fill:'#e0eeea',stroke:'none'}),svg('path',{d:path,fill:'none',stroke:'#29798a','stroke-width':2}));
    points.forEach(({l,x,y:yy,sum})=>{
      const g=svg('g',{tabindex:0,role:'button','aria-label':l.name+': '+sum.toFixed(1)+' metres cumulative reference lift','aria-pressed':String(l.id===selectedLock)});g.append(svg('circle',{cx:x,cy:yy,r:19,fill:'transparent'}),svg('circle',{cx:x,cy:yy,r:l.id===selectedLock?7:5,class:'profile-step'+(l.id===selectedLock?' is-selected':'')}),svg('text',{x,y:yy-14,'text-anchor':'middle',class:'chart-value'},sum.toFixed(1)),svg('text',{x,y:bottom+22,'text-anchor':'middle',class:'chart-label'},String(l.number)));
      const select=()=>{chooseLock(l.id);$('profileReadout').textContent='Lock '+l.number+' · '+l.name+': '+l.lift.toFixed(1)+' m '+(l.variableLift?'illustrative adjustment':'reference lift')+'; '+sum.toFixed(1)+' m summed lock lift. This is not elevation above sea level.';};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});s.append(g);
    });
    target.replaceChildren(s);restoreFocus(target,focused);
  }
  function renderFit(source='Illustrative ship dimensions. Not a selected ship or a clearance approval.'){
    const length=$('fitLength').valueAsNumber,beam=$('fitBeam').valueAsNumber,fit=C.fit(length,beam);$('fitSource').textContent=source;
    if(!fit){$('fitReadout').textContent='Enter positive length and beam values within the displayed limits.';$('fitHull').setAttribute('visibility','hidden');return;}
    const scale=Math.min(690/Math.max(length,233.5),80/Math.max(beam,24.4)),chamber=$('fitModel').querySelector('rect'),cy=67,x=30+(Math.max(length,233.5)-233.5)*scale/2;
    chamber.setAttribute('x',x);chamber.setAttribute('y',cy-24.4*scale/2);chamber.setAttribute('width',233.5*scale);chamber.setAttribute('height',24.4*scale);
    const start=x+(233.5-length)*scale/2,end=start+length*scale,half=beam*scale/2,bow=Math.min(16,length*scale*.15);
    $('fitHull').setAttribute('visibility','visible');$('fitHull').setAttribute('d','M'+start+' '+(cy-half)+'H'+(end-bow)+'L'+end+' '+cy+' '+(end-bow)+' '+(cy+half)+'H'+start+'Z');
    $('fitReadout').textContent=fit.withinReference?fit.remainingLength.toFixed(1)+' m of total reference length and '+fit.remainingBeam.toFixed(1)+' m of total width remain.':'These dimensions exceed the reference chamber '+(fit.remainingLength<0?'length':'')+(fit.remainingLength<0&&fit.remainingBeam<0?' and ':'')+(fit.remainingBeam<0?'width':'')+'.';
  }
  function drawHistory(){
    const year=Number($('historyYear').value),field=$('historyMeasure').value,rows=C.monthly(D.history.rows,year,field),target=$('historyChart'),width=Math.max(300,target.clientWidth||900),height=285,left=45,right=12,top=25,bottom=235;
    const max=Math.max(1,...rows.map(r=>r.value||0)),unit=field==='tonnage_metric_tons'?1000000:100,ceiling=Math.ceil(max/unit)*unit,y=n=>bottom-n/ceiling*(bottom-top),slot=(width-left-right)/12,bw=slot*.68;
    const format=n=>field==='tonnage_metric_tons'?(n/1000000).toFixed(1)+'m':n.toLocaleString('en-US');
    const s=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-labelledby':'historyTitle historyDesc'});s.append(svg('title',{id:'historyTitle'},year+' monthly Seaway '+(field==='vessel_transits'?'commercial vessel transits':'commercial metric tonnage')),svg('desc',{id:'historyDesc'},'Historical BTS/GLS monthly data, not traffic at the selected lock. Missing values are unreported, not zero.'));
    for(let i=0;i<=3;i++){const n=ceiling*i/3;s.append(svg('line',{x1:left,y1:y(n),x2:width-right,y2:y(n),class:'chart-grid'}),svg('text',{x:left-7,y:y(n)+4,'text-anchor':'end',class:'chart-label'},field==='tonnage_metric_tons'?format(n):String(Math.round(n))));}
    rows.forEach((r,i)=>{
      const x=left+slot*i+slot*.16,month=new Date(Date.UTC(year,i,1)).toLocaleString('en-US',{month:'short',timeZone:'UTC'}),label=month+' '+year+': '+(r.value===null?'not reported':r.value.toLocaleString('en-US')+(field==='vessel_transits'?' commercial vessel transits':' metric tons'));
      const g=svg('g',{role:'button',tabindex:0,'aria-label':label});
      g.append(svg('rect',{x:x-3,y:top,width:bw+6,height:bottom-top,fill:'transparent'}));
      if(r.value!==null){g.append(svg('rect',{x,y:y(r.value),width:bw,height:Math.max(1,bottom-y(r.value)),rx:2,class:'history-bar'}));if(width>650)g.append(svg('text',{x:x+bw/2,y:y(r.value)-9,'text-anchor':'middle',class:'chart-value'},format(r.value)));}
      else{g.append(svg('rect',{x,y:bottom-11,width:bw,height:11,fill:'none',stroke:'#9aa9a4','stroke-dasharray':'3 3'}),svg('text',{x:x+bw/2,y:bottom-17,'text-anchor':'middle',class:'chart-label'},'—'));}
      g.append(svg('text',{x:x+bw/2,y:bottom+22,'text-anchor':'middle',class:'chart-label'},width<500?String(i+1):month));
      const select=()=>{for(const bar of s.querySelectorAll('.history-bar'))bar.classList.remove('is-selected');g.querySelector('.history-bar')?.classList.add('is-selected');$('historyReadout').textContent=label+'. Historical Seaway series, not this lock or today’s arrivals.';track('history_month',String(i+1));};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});s.append(g);
    });
    if(width<500)s.append(svg('text',{x:width/2,y:height-7,'text-anchor':'middle',class:'chart-label'},'Month number · January 1 → December 12'));
    target.replaceChildren(s);$('historyReadout').textContent=year+' · '+(field==='vessel_transits'?'commercial vessel transits':'commercial tonnage, metric tons')+'. Select a month to read its value.';
    const table=el('table'),head=el('thead'),tr=el('tr');tr.append(el('th','Month · '+year),el('th',field==='vessel_transits'?'Commercial vessel transits':'Commercial metric tons'));head.append(tr);const body=el('tbody');for(const r of rows){const row=el('tr');row.append(el('th',new Date(Date.UTC(year,r.month-1,1)).toLocaleString('en-US',{month:'long',timeZone:'UTC'})),el('td',r.value===null?'Not reported':r.value.toLocaleString('en-US')));body.append(row);}table.append(head,body);$('historyTable').replaceChildren(table);
  }
  $('regionSelect').addEventListener('change',e=>setRegion(e.target.value,true));
  $('refreshReports').addEventListener('click',()=>{track('refresh','manual');void loadReports();});
  $('resetMap').addEventListener('click',fitRegion);
  $('shipSearch').addEventListener('input',()=>{updateList();drawShips();});$('vesselKind').addEventListener('change',()=>{updateList();drawShips();});
  document.querySelectorAll('[data-viewpoint]').forEach(b=>b.addEventListener('click',()=>chooseView(b.dataset.viewpoint)));
  document.querySelectorAll('[data-lock]').forEach(b=>b.addEventListener('click',()=>chooseLock(b.dataset.lock,true)));
  $('viewingSide').addEventListener('change',()=>{renderView();writeURL(true);});
  $('locateMe').addEventListener('click',()=>{
    const status=$('locationMessage');if(!navigator.geolocation){status.textContent='Location is unavailable in this browser. Choose a river region above.';return;}
    status.textContent='Finding your nearest researched stretch. Your coordinates stay in this browser.';
    navigator.geolocation.getCurrentPosition(pos=>{
      location={lat:pos.coords.latitude,lon:pos.coords.longitude};
      const closest=D.regions.map(r=>({r,d:C.distance(location,{lat:(r.bbox[0]+r.bbox[2])/2,lon:(r.bbox[1]+r.bbox[3])/2})})).sort((a,b)=>a.d-b.d)[0];
      if(closest.d>500){status.textContent='You are outside the researched Seaway corridor. Choose a region above to explore its ships and locks.';return;}
      status.textContent='Nearest researched region: '+closest.r.name+'. Viewing plans respect your selected country; road directions may differ from straight-line distance.';setRegion(closest.r.id,true);renderView();
    },()=>{status.textContent='Location could not be read. Choose a river region above; every viewing plan still has directions.';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });
  $('playModel').addEventListener('click',()=>{if(playing){pauseModel();return;}if(reduceMotion.matches){progress=[25,35,70,80,100].find(x=>x>progress)??0;renderModel();return;}if(progress>=100)progress=0;playing=true;$('playModel').textContent='Pause journey';frameId=requestAnimationFrame(animateModel);track('lock_model','play');});
  $('stepModel').addEventListener('click',()=>{pauseModel();progress=[25,35,70,80,100].find(x=>x>progress)??0;renderModel();});
  $('resetModel').addEventListener('click',()=>{pauseModel();progress=0;renderModel();});
  $('modelProgress').addEventListener('input',e=>{pauseModel();progress=Number(e.target.value);renderModel();});
  $('modelDirection').addEventListener('change',()=>{pauseModel();progress=0;renderModel();});
  for(const id of ['fitLength','fitBeam'])$(id).addEventListener('input',()=>renderFit('Your custom example dimensions. Not a clearance approval.'));
  $('useShipDimensions').addEventListener('click',()=>{const v=reportFor(selectedShip);if(!v?.lengthMeters||!v?.beamMeters)return;$('fitLength').value=v.lengthMeters;$('fitBeam').value=v.beamMeters;renderFit('AIS-reported dimensions for '+(v.name||v.mmsi)+'. Reported values are not a clearance approval.');});
  $('historyYear').addEventListener('change',drawHistory);$('historyMeasure').addEventListener('change',drawHistory);
  window.addEventListener('popstate',()=>{const previous=region;readURL();chooseLock(selectedLock);fitRegion();render();if(previous!==region)void loadReports();});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{drawProfile();drawHistory();map?.invalidateSize({pan:false});},200);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseModel();if(cameraPlayer?.isLoaded())cameraPlayer.stop('Video stopped while this tab was hidden. Load the camera again when you return.');}});
  cameraPlayer=window.SeawayCameras?.mount({root:$('seawayCameras'),feeds:D.cameras,document,onSelect:camera=>{selectedCamera=camera.id;writeURL(true);track('select_camera',camera.id);},onPlayback:camera=>track('camera_player',camera.id)});
  readURL();chooseLock(selectedLock);renderFit();drawHistory();render();void startMap();void loadReports();
  setInterval(()=>{if(!document.hidden)void loadReports();},120000);
  setInterval(()=>{if(!document.hidden)render();},30000);
  document.documentElement.dataset.seawayReady='true';
})();
