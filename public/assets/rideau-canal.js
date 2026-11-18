/* Rideau Canal Explorer. Interpretive visitor decisions, not a navigation service. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {mode:'visit',time:'short',interest:'engineering',selectedPlaceId:'ottawa',start:'ottawa',end:'jones-falls'};
  const CARTO_TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  let model, journeyGraph, highlights=[], watchGuides={}, map=null, markers=new Map(), photoToken=0;
  const Engine=window.RideauJourneyEngine;
  state.units='km';state.speed=6;state.paddleRoute='tay-marsh';state.date='';
  const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
  function make(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  const sourceLink=(url,label)=>{const a=make('a',null,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function officialLink(place){return sourceLink(place.sourceUrl,'Parks Canada profile');}
  function mapSearch(place){
    if(!place.visit||!window.VisitorMapLinks)return null;
    return window.VisitorMapLinks.placeSearch({role:'public-place',query:place.visit.address});
  }
  function selected(){return highlights.find(p=>p.id===state.selectedPlaceId)||highlights[0]||null;}
  function filtered(){
    return highlights.filter(p=>p.visit.timeBudgets.includes(state.time)&&p.visit.interests.includes(state.interest));
  }
  function choosePlace(id,focus=false){
    if(!highlights.some(p=>p.id===id))return;
    state.selectedPlaceId=id;
    renderPlace();
    renderCandidates();
    focusMap(id,focus);
    syncUrl();
  }
  function syncUrl(){
    const query=new URLSearchParams(location.search);
    query.set('mode',state.mode);
    query.set('units',state.units);
    query.set('place',state.selectedPlaceId);
    if(state.mode==='visit'){query.set('time',state.time);query.set('interest',state.interest);}
    else{query.delete('time');query.delete('interest');}
    if(state.mode==='cruise'){query.set('from',state.start);query.set('to',state.end);query.set('speed',String(state.speed));if(state.date)query.set('date',state.date);}
    else{query.delete('from');query.delete('to');query.delete('speed');query.delete('date');}
    if(state.mode==='paddle')query.set('paddle',state.paddleRoute);else query.delete('paddle');
    history.replaceState(null,'',location.pathname+'?'+query.toString()+location.hash);
  }
  function readUrl(){
    const q=new URLSearchParams(location.search);
    if(['visit','cruise','paddle'].includes(q.get('mode')))state.mode=q.get('mode');
    if(['short','half','day'].includes(q.get('time')))state.time=q.get('time');
    if(['engineering','history','village','scenery'].includes(q.get('interest')))state.interest=q.get('interest');
    if(highlights.some(p=>p.id===q.get('place')))state.selectedPlaceId=q.get('place');
    if(highlights.some(p=>p.id===q.get('from')))state.start=q.get('from');
    const endpoints=(journeyGraph.mainline||[]).concat(journeyGraph.tay||[]).map(p=>p.id);
    if(endpoints.includes(q.get('from')))state.start=q.get('from');
    if(endpoints.includes(q.get('to')))state.end=q.get('to');
    if(['km','mi'].includes(q.get('units')))state.units=q.get('units');
    if([4,6,8].includes(Number(q.get('speed'))))state.speed=Number(q.get('speed'));
    if(/^20[2-9][0-9]-[01][0-9]-[0-3][0-9]$/.test(q.get('date')||''))state.date=q.get('date');
    if(journeyGraph.paddling.some(p=>p.id===q.get('paddle')))state.paddleRoute=q.get('paddle');
  }
  function applyMode(){
    document.querySelectorAll('[data-mode]').forEach(button=>{
      const active=button.dataset.mode===state.mode;
      button.setAttribute('aria-pressed',String(active));
    });
    $('visit-controls').hidden=state.mode!=='visit';
    $('cruise-controls').hidden=state.mode!=='cruise';
    $('paddle-context').hidden=state.mode!=='paddle';
    $('candidate-title').textContent=state.mode==='visit'?'Places worth your time':state.mode==='cruise'?'Discover lockstations':'Other lock visits, not route legs';
    if(state.mode==='cruise')renderCruise();
    if(state.mode==='paddle')renderPaddle();
    renderCandidates();
    renderPlace();
    syncUrl();
  }
  function renderCandidates(){
    const list=$('recommendations');list.replaceChildren();
    const exact=filtered();
    const candidates=state.mode==='visit'?(exact.length?exact:highlights.filter(p=>p.visit.timeBudgets.includes(state.time))):state.mode==='paddle'?highlights.filter(p=>['newboro','chaffeys'].includes(p.id)):highlights;
    if(state.mode==='visit'){
      setText('candidate-count',candidates.length+' suggested '+(candidates.length===1?'stop':'stops')+' for this choice');
      setText('answer-title',exact.length?'Start with '+exact[0].name:'No exact match; consider these alternatives');
      setText('answer-text',exact.length?'These are destination ideas, not a timed driving itinerary. Choose a location to see its exact evidence and official access information.':'No station in this time window is matched to that interest. The alternatives below fit your time category as editorial ideas, not verified timed routes.');
      if(candidates.length&&!candidates.some(p=>p.id===state.selectedPlaceId))state.selectedPlaceId=candidates[0].id;
    } else if(state.mode==='paddle'){
      setText('candidate-count','Two separate historic lock visits');
      setText('answer-title','Explore a lock beyond your paddle');
      setText('answer-text','Your selected Parks Canada paddling itinerary is above. The two lock profiles below are separate sightseeing ideas, not entrances or route legs for that itinerary.');
      if(!candidates.some(p=>p.id===state.selectedPlaceId))state.selectedPlaceId='newboro';
    }else{
      setText('candidate-count','Seven audited navigation reference points');
      setText('answer-title','Compare official waterway distances');
      setText('answer-text','Choose endpoints to see their difference in Parks Canada channel chainage. This is not a route, travel time or lockage appointment.');
    }
    candidates.forEach(p=>{
      const li=make('li');
      const b=make('button','stop-button');
      b.type='button';b.setAttribute('aria-current',String(p.id===state.selectedPlaceId));
      b.append(make('strong',null,p.name));
      b.append(make('span',null,state.mode==='cruise'?(p.visit.distanceOttawaKm.toFixed(1)+' km from Ottawa'):p.visit.summary));
      b.addEventListener('click',()=>choosePlace(p.id,true));
      li.append(b);list.append(li);
    });
  }
  function renderWatchGuide(place){
    const container=$('rideau-watch-guide'), guide=watchGuides[place.id];
    if(!guide||!Array.isArray(guide.places)||!guide.places.length){
      container.hidden=true;
      $('rideau-watch-options').replaceChildren();
      $('rideau-watch-food').replaceChildren();
      return;
    }
    container.hidden=false;
    setText('rideau-watch-intro',guide.intro);
    const list=$('rideau-watch-options');
    list.replaceChildren();
    for(const point of guide.places){
      const card=make('article','rideau-watch-stop');
      card.append(make('h5',null,point.name));
      card.append(make('p',null,point.watch));
      card.append(make('p','rideau-watch-approach',point.approach));
      const links=make('div','feature__source');
      const q=window.VisitorMapLinks?.placeSearch({role:'public-place',query:point.googleQuery})||
        'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(point.googleQuery);
      links.append(sourceLink(q,'Find this viewpoint in Google Maps'));
      links.append(sourceLink(point.sourceUrl,'Read the visitor source'));
      card.append(links);
      list.append(card);
    }
    const food=$('rideau-watch-food');
    food.replaceChildren(make('p',null,guide.foodText));
    const query=window.VisitorMapLinks?.placeSearch({role:'public-place',query:guide.foodSearch})||
      'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(guide.foodSearch);
    food.append(sourceLink(query,'Search for nearby food'));
  }
  function renderPlace(){
    const p=selected();if(!p)return;
    setText('feature-name',p.name);
    setText('feature-region',p.branch==='tay'?'Tay Canal branch':'Rideau Canal / documented stop');
    setText('feature-explain',p.visit.summary);
    setText('feature-tip',p.visit.interpretiveTip);
    setText('feature-address',p.visit.address);
    const links=$('feature-links');links.replaceChildren(officialLink(p));
    const search=mapSearch(p)||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.visit.address);
    links.append(sourceLink(search,'View in Google Maps'));
    renderWatchGuide(p);
    const img=$('feature-photo'),wrap=$('feature-photo-wrap');
    wrap.hidden=true;img.removeAttribute('src');
    const token=++photoToken;const photo=p.visit.photo;
    if(photo){
      const probe=new Image();
      const file=encodeURIComponent(photo.file).replace(/%2F/gi,'/');
      probe.onload=()=>{
        if(token!==photoToken||state.selectedPlaceId!==p.id)return;
        img.src=probe.src;
        img.alt=photo.caption;
        $('feature-photo-caption').textContent=photo.caption+' · '+photo.credit+' · '+photo.license+' · Display cropped to 16:9 · ';
        const credit=$('feature-photo-credit');credit.replaceChildren(sourceLink(photo.source,'Source and author'),document.createTextNode(' · '),sourceLink(photo.licenseUrl,'Reuse terms'));
        wrap.hidden=false;
      };
      probe.onerror=()=>{if(token===photoToken)wrap.hidden=true;};
      probe.src='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+file+'?width=960';
    }
    document.querySelectorAll('.stop-button').forEach(b=>{
      const name=b.querySelector('strong')?.textContent;
      b.setAttribute('aria-current',String(name===p.name));
    });
    focusMap(p.id,false);
  }
  async function mapTileSource(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    try{
      const response=await fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:controller.signal});
      if(response.ok){
        const config=await response.json();
        if(config?.provider==='CARTO'&&typeof config.key==='string'&&config.key.trim()){
          return {type:'carto',url:CARTO_TILE+'?key='+encodeURIComponent(config.key.trim()),attribution:'&copy; OpenStreetMap contributors &copy; CARTO'};
        }
      }
    }catch(_){}
    finally{clearTimeout(timer);}
    return {type:'osm',url:OSM_TILE,attribution:'&copy; OpenStreetMap contributors'};
  }
  async function initMap(){
    const shell=$('map-shell'),fallback=$('map-fallback');
    const valid=highlights.filter(p=>p.visit?.coordinates);
    if(!window.L||!valid.length){shell.hidden=true;fallback.hidden=false;return;}
    try{
      const source=await mapTileSource();
      shell.hidden=false;
      map=L.map('rideau-map',{scrollWheelZoom:false,zoomControl:true}).setView([44.82,-76.0],8);
      map.invalidateSize({pan:false});
      let activeLayer=null,attempt=0;
      function installTiles(chosen){
        if(!map)return;
        if(activeLayer)map.removeLayer(activeLayer);
        attempt++;
        const myAttempt=attempt;
        let loaded=false,failures=0;
        activeLayer=L.tileLayer(chosen.url,{maxZoom:17,attribution:chosen.attribution});
        activeLayer.on('tileload',()=>{loaded=true;});
        activeLayer.on('tileerror',()=>{
          failures++;
          if(failures>=5 && myAttempt===attempt){
            if(chosen.type==='carto')installTiles({type:'osm',url:OSM_TILE,attribution:'&copy; OpenStreetMap contributors'});
            else disableMap();
          }
        });
        activeLayer.addTo(map);
        setTimeout(()=>{
          if(map&&myAttempt===attempt&&!loaded){
            if(chosen.type==='carto')installTiles({type:'osm',url:OSM_TILE,attribution:'&copy; OpenStreetMap contributors'});
            else disableMap();
          }
        },9500);
      }
      installTiles(source);
      const bounds=[];
      valid.forEach(p=>{
        const {lat,lon}=p.visit.coordinates;
        const marker=L.marker([lat,lon],{title:p.name,icon:L.divIcon({className:'rideau-marker',html:'<span class="lock-pin">L</span>',iconSize:[32,32],iconAnchor:[16,16]})});
        marker.addTo(map).on('click',()=>choosePlace(p.id,true));
        marker.bindTooltip(p.name,{direction:'top'});
        markers.set(p.id,marker);bounds.push([lat,lon]);
      });
      map.fitBounds(bounds,{padding:[30,30]});
      shell.hidden=false;fallback.hidden=true;
      const first=markers.get(state.selectedPlaceId);
      first?.getElement()?.querySelector('.lock-pin')?.classList.add('active');
    }catch(_){disableMap();}
  }
  function disableMap(){
    const shell=$('map-shell');shell.hidden=true;
    $('map-fallback').hidden=false;
    if(map){try{map.remove();}catch(_){}}
    map=null;markers.clear();
  }
  function focusMap(id,scroll){
    if(!map)return;
    markers.forEach((m,key)=>{const pin=m.getElement()?.querySelector('.lock-pin');if(pin)pin.classList.toggle('active',key===id);});
    const marker=markers.get(id);
    if(marker){
      if(map.getZoom()<9)map.setView(marker.getLatLng(),9,{animate:false});
      else map.panTo(marker.getLatLng(),{animate:false});
      if(scroll && window.matchMedia('(min-width:901px)').matches===false){
        $('feature-name').scrollIntoView({behavior:'auto',block:'start'});
      }
    }
  }
  function renderCruise(){
    const outcome=$('channel-result');outcome.hidden=false;
    if(!Engine||!journeyGraph){setText('channel-number','Journey data unavailable');return;}
    const field=(id)=>{const v=$(id)?.value;return v===''||v==null?null:Number(v);};
    const plan=Engine.planCruise(journeyGraph,model,{from:state.start,to:state.end,speedKmh:state.speed,
      vessel:{lengthM:field('rideau-length'),widthM:field('rideau-beam'),draftM:field('rideau-draft'),airDraftM:field('rideau-air-draft')}});
    const list=$('channel-stops'),bridges=$('channel-bridge-list');list.replaceChildren();bridges.replaceChildren();
    if(!plan.ok){
      setText('channel-number','Choose two distinct places');setText('channel-label',plan.reason);
      setText('channel-notes','No route or time calculated.');setText('channel-scenario','');
      setText('channel-date','');setText('channel-constraints','');
      return;
    }
    const placeName=id=>model.lockLocations.find(x=>x.id===id)?.name||
      ({'perth-basin':'Perth Basin','kingston-causeway':'Kingston La Salle Causeway'}[id]||id);
    setText('channel-number',Engine.distance(plan.distanceKm,state.units));
    setText('channel-label',placeName(state.start)+' to '+placeName(state.end));
    setText('channel-notes',plan.interpretation==='branch-connection-estimate'
      ?'Reference connection through the Tay Canal. The published table identifies two different Tay diversion distances. Confirm the actual channel path on charts.'
      :'Published navigation-channel chainage. This is not a digital nautical route or a paddling distance.');
    setText('channel-scenario',plan.underwayHours===null?'Choose a planning pace to model underway-only time.':
      plan.underwayHours.toFixed(1)+' hours at '+plan.assumedSpeedKmh+' km/h if moving continuously. Excludes all locks, waits, bridges, weather and overnight stops. Not an arrival estimate.');
    setText('channel-date',state.date?('Planning date '+state.date+': current operating hours not verified for this journey.'):('2026 season ended. 2027 navigation hours have not been verified.'));
    setText('channel-constraints',plan.vessel.warnings.join(' ')+' The full route may have bridge clearances lower than the general canal reference. No passage approval is provided.');
    for(const stop of plan.lockSites){
      const li=make('li',null,stop.name+' ('+stop.chambers+' physical chamber'+(stop.chambers===1?'':'s')+')');
      li.append(document.createTextNode('  '));
      li.append(sourceLink(stop.sourceUrl,'Official lock profile'));
      list.append(li);
    }
    if(!plan.lockSites.length)list.append(make('li',null,'No named lock location between these reference points. Other navigation obstacles may still exist.'));
    const lead=make('p',null,plan.bridges.length+' documented bridge references in this reach. Clearance varies with bridge type and operation.');bridges.append(lead);
    if(plan.bridges.length){
      const ul=make('ul');
      for(const bridge of plan.bridges){
        const words=bridge.id.replace(/-/g,' ')+' ('+bridge.type+(bridge.clearanceClosedM!=null?', '+bridge.clearanceClosedM+' m closed/reference':'')+')';
        const li=make('li',null,words+'  ');li.append(sourceLink(bridge.sourceUrl,'Source'));ul.append(li);
      }
      bridges.append(ul);
    }
    $('channel-source').href=plan.sourceUrl;
    if(highlights.some(p=>p.id===state.end))state.selectedPlaceId=state.end;
    renderPlace();syncUrl();
  }
  function renderPaddle(){
    if(!Engine||!journeyGraph)return;
    const plan=Engine.planPaddle(journeyGraph,state.paddleRoute);
    if(!plan.ok){setText('paddle-name','Official itinerary unavailable');return;}
    setText('paddle-name',plan.name);
    setText('paddle-distance',Engine.distance(plan.km,state.units));
    setText('paddle-days',plan.days===1?'One-day official itinerary':'Two-day official itinerary');
    setText('paddle-story',plan.note);
    setText('paddle-overnight',plan.overnight);
    const links=$('paddle-map-links');links.replaceChildren();
    for(const [site,label] of [[plan.putIn,'Put-in: '],[plan.takeOut,'Takeout: ']]){
      const url=window.VisitorMapLinks?.placeSearch({role:'public-place',query:site.query})
        ||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.query);
      links.append(sourceLink(url,label+site.name));
    }
    for(const [listId,items] of [['paddle-highlights',plan.highlights],['paddle-hazards',plan.hazards]]){
      const ul=$(listId);ul.replaceChildren(...items.map(item=>make('li',null,item)));
    }
    $('paddle-official').href=plan.sourceUrl;
    syncUrl();
  }
  function renderDirectory(){
    const body=$('directory-body');body.replaceChildren();
    const addRow=(name,kind,source,branch)=>{
      const tr=make('tr');const a=sourceLink(source,name);a.target='_blank';
      const td=make('td');td.append(a);tr.append(td,make('td',null,kind),make('td',null,branch==='tay'?'Tay branch':'Main waterway'));body.append(tr);
    };
    model.lockLocations.forEach(p=>addRow(p.name,p.chambers+' chamber'+(p.chambers===1?'':'s'),p.sourceUrl,p.branch));
    model.bridges.forEach(p=>addRow(p.name,p.bridgeType+' bridge',p.sourceUrl,'main'));
    model.visitorOnly.forEach(p=>addRow(p.name,'Visitor destination, not a lock',p.sourceUrl,p.branch));
    setText('directory-count',model.lockLocations.length+' lock locations, '+model.bridges.length+' named bridges, '+model.visitorOnly.length+' other visitor location');
  }
  async function main(){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const [response,navResponse,watchResult]=await Promise.all([
        fetch('/assets/rideau-locations.json',{signal:controller.signal,cache:'default'}),
        fetch('/assets/rideau-navigation.json',{signal:controller.signal,cache:'default'}),
        fetch('/assets/rideau-watch.json',{signal:controller.signal,cache:'default'}).then(r=>r.ok?r.json():null).catch(()=>null)
      ]);
      watchGuides=watchResult?.schemaVersion===1&&watchResult.stations?watchResult.stations:{};

      if(!response.ok||!navResponse.ok)throw Error('No reviewed inventory or navigation graph');
      const [data,nav]=await Promise.all([response.json(),navResponse.json()]);
      if(nav.schemaVersion!==2||!Array.isArray(nav.mainline)||nav.mainline.length!==25||!Engine)throw Error('Graph not reconciled');
      journeyGraph=nav;
      if(!Array.isArray(data.lockLocations)||data.lockLocations.length!==26||!Array.isArray(data.bridges)||data.bridges.length!==15)throw Error('Inventory failed validation');
      model=data;highlights=data.lockLocations.filter(p=>p.visit);
      readUrl();
      const allEndpoints=journeyGraph.mainline.concat(journeyGraph.tay);
      const labelFor=id=>model.lockLocations.find(p=>p.id===id)?.name||
        ({'kingston-causeway':'Kingston La Salle Causeway','perth-basin':'Perth Basin'}[id]||id);
      const opts=()=>allEndpoints.map(p=>{const x=make('option',null,labelFor(p.id));x.value=p.id;return x;});
      $('cruise-from').replaceChildren(...opts());$('cruise-from').value=state.start;
      $('cruise-to').replaceChildren(...opts());$('cruise-to').value=state.end;
      $('rideau-speed').value=String(state.speed);
      $('rideau-units').value=state.units;
      $('rideau-trip-date').value=state.date;
      $('rideau-paddle-route').replaceChildren(...journeyGraph.paddling.map(p=>{const o=make('option',null,p.name);o.value=p.id;return o;}));
      $('rideau-paddle-route').value=state.paddleRoute;
      $('time-budget').value=state.time;
      $('interest').value=state.interest;
      document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;applyMode();}));
      $('time-budget').addEventListener('change',e=>{state.time=e.target.value;renderCandidates();renderPlace();syncUrl();});
      $('interest').addEventListener('change',e=>{state.interest=e.target.value;renderCandidates();renderPlace();syncUrl();});
      $('cruise-from').addEventListener('change',e=>{state.start=e.target.value;renderCruise();});
      $('cruise-to').addEventListener('change',e=>{state.end=e.target.value;renderCruise();});
      $('rideau-speed').addEventListener('change',e=>{state.speed=Number(e.target.value);renderCruise();});
      $('rideau-units').addEventListener('change',e=>{state.units=e.target.value;if(state.mode==='cruise')renderCruise();if(state.mode==='paddle')renderPaddle();});
      $('rideau-trip-date').addEventListener('change',e=>{state.date=e.target.value;renderCruise();});
      for(const id of ['rideau-length','rideau-beam','rideau-draft','rideau-air-draft'])$(id).addEventListener('input',renderCruise);
      $('rideau-paddle-route').addEventListener('change',e=>{state.paddleRoute=e.target.value;renderPaddle();});
      $('static-stops').hidden=true;
      $('interactive').hidden=false;
      renderDirectory();applyMode();initMap();
      if(state.mode==='cruise')renderCruise();
      setText('js-state','Source-audited station inventory loaded. Official operations are not monitored here.');
    }catch(_){
      $('interactive').hidden=true;
      $('static-stops').hidden=false;
      setText('js-state','Interactive inventory unavailable. Use the official station links below.');
    }finally{clearTimeout(timeout);}
  }
  main();
})();
