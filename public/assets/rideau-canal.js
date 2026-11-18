/* Rideau Canal Explorer. Interpretive visitor decisions, not a navigation service. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {mode:'visit',time:'short',interest:'engineering',selectedPlaceId:'ottawa',start:'ottawa',end:'jones-falls'};
  const MAP_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  let model, highlights=[], map=null, markers=new Map(), photoToken=0;
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
    query.set('place',state.selectedPlaceId);
    if(state.mode==='visit'){query.set('time',state.time);query.set('interest',state.interest);}
    else{query.delete('time');query.delete('interest');}
    if(state.mode==='cruise'){query.set('from',state.start);query.set('to',state.end);}
    else{query.delete('from');query.delete('to');}
    history.replaceState(null,'',location.pathname+'?'+query.toString()+location.hash);
  }
  function readUrl(){
    const q=new URLSearchParams(location.search);
    if(['visit','cruise','paddle'].includes(q.get('mode')))state.mode=q.get('mode');
    if(['short','half','day'].includes(q.get('time')))state.time=q.get('time');
    if(['engineering','history','village','scenery'].includes(q.get('interest')))state.interest=q.get('interest');
    if(highlights.some(p=>p.id===q.get('place')))state.selectedPlaceId=q.get('place');
    if(highlights.some(p=>p.id===q.get('from')))state.start=q.get('from');
    if(highlights.some(p=>p.id===q.get('to')))state.end=q.get('to');
  }
  function applyMode(){
    document.querySelectorAll('[data-mode]').forEach(button=>{
      const active=button.dataset.mode===state.mode;
      button.setAttribute('aria-pressed',String(active));
    });
    $('visit-controls').hidden=state.mode!=='visit';
    $('cruise-controls').hidden=state.mode!=='cruise';
    $('paddle-context').hidden=state.mode!=='paddle';
    $('candidate-title').textContent=state.mode==='visit'?'Places worth your time':state.mode==='cruise'?'Plan a documented section':'Documented launch leads';
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
      setText('candidate-count','Two Parks Canada profiles document boat-launch facilities');
      setText('answer-title','Choose a launch to research, not a guessed paddle route');
      setText('answer-text','The sites below have a documented boat launch. A complete paddling leg still needs independently verified takeout, portages, local conditions and a chart.');
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
  function renderPlace(){
    const p=selected();if(!p)return;
    setText('feature-name',p.name);
    setText('feature-region',p.branch==='tay'?'Tay Canal branch':'Rideau Canal / documented stop');
    setText('feature-explain',p.visit.summary);
    setText('feature-tip',p.visit.interpretiveTip);
    setText('feature-address',p.visit.address);
    const links=$('feature-links');links.replaceChildren(officialLink(p));
    const search=mapSearch(p);
    if(search)links.append(sourceLink(search,'View in Google Maps'));
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
        $('feature-photo-caption').textContent=photo.caption+' · '+photo.credit+' · '+photo.license+' · ';
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
  function initMap(){
    const shell=$('map-shell'),fallback=$('map-fallback');
    const valid=highlights.filter(p=>p.visit?.coordinates);
    if(!window.L||!valid.length){shell.hidden=true;fallback.hidden=false;return;}
    try{
      map=L.map('rideau-map',{scrollWheelZoom:false,zoomControl:true}).setView([44.82,-76.0],8);
      const layer=L.tileLayer(MAP_TILE,{maxZoom:17,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'});
      let tileFailures=0;
      layer.on('tileerror',()=>{tileFailures++;if(tileFailures>=5)disableMap();});
      layer.addTo(map);
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
    const from=highlights.find(p=>p.id===state.start),to=highlights.find(p=>p.id===state.end);
    const outcome=$('channel-result');
    if(!from||!to||from.id===to.id){
      outcome.hidden=false;setText('channel-number','Select two different stops');setText('channel-label','No route calculated');
      setText('channel-notes','Official chainage exists for the audited endpoints. Select a distinct start and end.');
      return;
    }
    const km=Math.abs(from.visit.distanceOttawaKm-to.visit.distanceOttawaKm);
    const a=Math.min(from.portalOrder,to.portalOrder),b=Math.max(from.portalOrder,to.portalOrder);
    const between=model.lockLocations.filter(p=>p.branch==='main'&&p.portalOrder>a&&p.portalOrder<b);
    outcome.hidden=false;
    setText('channel-number',km.toFixed(1)+' km');
    setText('channel-label',from.name+' to '+to.name+' / Parks Canada reference distance');
    setText('channel-notes',between.length+' named lock locations between the two reference points. No travel time, bridge passage, draft or lockage schedule is implied. Actual boating requires current official charts and notices.');
    state.selectedPlaceId=to.id;
    renderPlace();renderCandidates();syncUrl();
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
      const response=await fetch('/assets/rideau-locations.json',{signal:controller.signal,cache:'default'});
      if(!response.ok)throw Error('No inventory');
      const data=await response.json();
      if(!Array.isArray(data.lockLocations)||data.lockLocations.length!==26||!Array.isArray(data.bridges)||data.bridges.length!==15)throw Error('Inventory failed validation');
      model=data;highlights=data.lockLocations.filter(p=>p.visit);
      readUrl();
      const opts=highlights.map(p=>{const x=make('option',null,p.name);x.value=p.id;return x;});
      $('cruise-from').replaceChildren(...opts);
      $('cruise-from').value=state.start;
      $('cruise-to').replaceChildren(...highlights.map(p=>{const x=make('option',null,p.name);x.value=p.id;return x;}));
      $('cruise-to').value=state.end;
      $('time-budget').value=state.time;
      $('interest').value=state.interest;
      document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;applyMode();if(state.mode==='cruise')renderCruise();}));
      $('time-budget').addEventListener('change',e=>{state.time=e.target.value;renderCandidates();renderPlace();syncUrl();});
      $('interest').addEventListener('change',e=>{state.interest=e.target.value;renderCandidates();renderPlace();syncUrl();});
      $('cruise-from').addEventListener('change',e=>{state.start=e.target.value;renderCruise();});
      $('cruise-to').addEventListener('change',e=>{state.end=e.target.value;renderCruise();});
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
