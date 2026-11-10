'use strict';
(() => {
  // A purpose-built California-only decision desk. All mission, venue, NWS and
  // access assertions originate from the single /api/rocket-launch-usa response.
  // This module never asks the browser to fetch LL2 or NWS independently.
  const $=id=>document.getElementById(id);
  const state={data:null,intent:'family',offsetHours:0,selectedSite:null,map:null,markers:new Map(),
    line:null,padMarker:null,tiles:null,rocketPins:null,allLaunches:[],selectedLaunchId:null};
  const label=(id,value)=>{const n=$(id);if(n)n.textContent=value;};
  const el=(tag,cls,value)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(value!==undefined&&value!==null)n.textContent=String(value);
    return n;
  };
  const safeLink=(url,title,cls)=>{
    if(typeof url!=='string'||!/^(?:https:\/\/[a-z0-9.-]+\/|\/(?!\/))/i.test(url))return null;
    const a=el('a',cls,title);
    a.href=url;
    a.target='_blank';
    a.rel='noopener noreferrer';
    return a;
  };
  const fmt=iso=>{
    const date=new Date(iso||'');
    if(Number.isNaN(+date))return 'time not confirmed';
    return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',
      weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);
  };
  const compass=b=>{
    if(!Number.isFinite(b))return null;
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round(b/45)%8];
  };
  const DANGER=new Set(['after-hours','boundary','time-unknown']);
  function currentScenario(){
    return state.data?.scenarios?.find(x=>x.offsetHours===state.offsetHours)||null;
  }
  function candidateFor(site,scenario){
    return scenario?.candidates?.find(x=>x.id===site.id)||null;
  }
  function statusWord(candidate){
    if(!candidate)return 'Known viewing area · check hours';
    const s=candidate.access?.state;
    return s==='after-hours'?'Not open at this launch time':
      s==='boundary'?'May be closing around sunset':
      s==='time-unknown'?'Hours need checking':
      candidate.forecast?.state==='hazard'?'Nearby forecast shows poor conditions':
      'Possible viewing spot · check launch-day access';
  }
  function estimate(site,candidate){
    // Preference ranking is relative and editorial, never an access or visibility score.
    const affinity={family:'family',photo:'photo',close:'close'}[state.intent];
    const base=Number(site.affinities?.[affinity]||0)*10;
    const cloud=candidate?.forecast;
    const bonus=cloud?.state==='reference-only'&&Number.isInteger(cloud.cloud)?
      (100-cloud.cloud)/10:0;
    return base+bonus;
  }
  function makeItems(){
    const scenario=currentScenario();
    const rows=(state.data?.sites||[]).map(s=>({site:s,
      candidate:candidateFor(s,scenario)}));
    const selectedCanPlan=Boolean(state.data?.status==='candidate-review'&&scenario);
    if(selectedCanPlan){
      rows.sort((a,b)=>{
        const bad=x=>DANGER.has(x.candidate?.access?.state)||
          x.candidate?.forecast?.state==='hazard'?1:0;
        return bad(a)-bad(b)||estimate(b.site,b.candidate)-estimate(a.site,a.candidate)||
          a.site.name.localeCompare(b.site.name);
      });
    }
    return rows;
  }
  function drawMap(rows){
    const root=$('rl-vandenberg-map');
    if(!root||!window.L||!state.data)return;
    const sites=state.data.sites||[];
    if(state.map){
      // Map pins are stable over scenario changes; update selected bearing only.
      for(const [id,pin] of state.markers){
        const row=rows.find(x=>x.site.id===id);
        const active=id===state.selectedSite;
        pin.setStyle({radius:active?11:8,fillColor:
          row?.candidate?.access?.state==='after-hours'?'#b7706e':
          active?'#f2b76a':'#2f9caa',
          weight:active?3:2});
      }
      showBearing();
      state.rocketPins?.update(state.allLaunches,state.selectedLaunchId);
      state.map.invalidateSize(false);
      return;
    }
    try{
      root.replaceChildren();
      const L=window.L;
      const map=L.map(root,{scrollWheelZoom:false,preferCanvas:true,zoomControl:true});
      const credit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {maxZoom:18,attribution:credit}).addTo(map);
      root.dataset.tiles='osm-fallback';
      fetch('/api/carto-basemap-config',{credentials:'same-origin',
        signal:AbortSignal.timeout(6000)})
        .then(r=>r.ok?r.json():null)
        .then(c=>{
          if(!c||c.provider!=='CARTO'||typeof c.key!=='string'||!c.key.trim())return;
          const tileUrl='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+
            encodeURIComponent(c.key.trim());
          const carto=L.tileLayer(tileUrl,{subdomains:'abcd',maxZoom:19,
            attribution:credit+' &copy; CARTO'});
          let successful=false,failed=0;
          carto.on('tileload',()=>{
            if(!successful&&map.hasLayer(carto)){
              successful=true;
              root.dataset.tiles='carto-keyed';
              if(map.hasLayer(osm))map.removeLayer(osm);
            }
          });
          carto.on('tileerror',()=>{
            if(++failed>=2&&!successful){
              if(map.hasLayer(carto))map.removeLayer(carto);
              if(!map.hasLayer(osm))osm.addTo(map);
              root.dataset.tiles='osm-fallback';
            }
          });
          carto.addTo(map);
        }).catch(()=>{});
      const bounds=[];
      sites.forEach(site=>{
        if(!Number.isFinite(site.lat)||!Number.isFinite(site.lon))return;
        const row=rows.find(x=>x.site.id===site.id);
        const blocked=row?.candidate?.access?.state==='after-hours';
        const pin=L.circleMarker([site.lat,site.lon],{radius:8,fillOpacity:1,
          color:'#fff',weight:2,fillColor:blocked?'#b7706e':'#2f9caa'}).addTo(map);
        // Dynamic popup text is escaped by creating DOM nodes, not innerHTML.
        const popup=el('div','rl-vandenberg-popup');
        popup.appendChild(el('strong','',site.name));
        popup.appendChild(el('p','',site.pinLabel+' · check access'));
        pin.bindPopup(popup);
        pin.on('click',()=>chooseSite(site.id,true));
        state.markers.set(site.id,pin);
        bounds.push([site.lat,site.lon]);
      });
      const pad=state.data.pad;
      if(Number.isFinite(pad?.lat)&&Number.isFinite(pad?.lon)){
        const marker=L.circleMarker([pad.lat,pad.lon],{
          radius:10,color:'#f9f3e8',weight:3,fillColor:'#b85943',fillOpacity:1
        }).addTo(map);
        marker.bindTooltip('Launch pad · restricted military installation. NO PUBLIC ENTRY.',
          {direction:'top'});
        state.padMarker=marker;
        bounds.push([pad.lat,pad.lon]);
      }
      if(bounds.length)map.fitBounds(bounds,{padding:[29,29],maxZoom:12});
      state.map=map;
      state.rocketPins=window.RocketMapPins?.mount(map,{
        region:'california',
        centers:{california:{lat:34.74,lon:-120.57}},
        onSelect:(id,region)=>document.dispatchEvent(new CustomEvent(
          'rocket-map:choose-mission',{detail:{launchId:id,region}}))
      });
      state.rocketPins?.update(state.allLaunches,state.selectedLaunchId);
      showBearing();
    }catch(_){
      root.replaceChildren(el('p','rl-vandenberg-map-fallback',
        'The map isn’t loading, but you can still compare the viewing spots and their rules below.'));
    }
  }
  function showBearing(){
    if(!state.map||!window.L)return;
    if(state.line){state.map.removeLayer(state.line);state.line=null;}
    const site=state.data?.sites?.find(x=>x.id===state.selectedSite);
    const pad=state.data?.pad;
    if(!site?.padGeometry||!Number.isFinite(pad?.lat))return;
    state.line=window.L.polyline([[site.lat,site.lon],[pad.lat,pad.lon]],{
      color:'#f2b76a',weight:2,dashArray:'4 8',opacity:.9
    }).addTo(state.map);
  }
  function chooseSite(id,scroll){
    if(!state.data?.sites?.some(x=>x.id===id))return;
    state.selectedSite=id;
    renderCards();
    if(scroll){
      const card=document.querySelector('[data-vandenberg-card="'+id+'"]');
      card?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  function renderCards(){
    const root=$('rl-vandenberg-cards');
    if(!root||!state.data)return;
    const rows=makeItems();
    if(!rows.some(x=>x.site.id===state.selectedSite))state.selectedSite=rows[0]?.site.id||null;
    root.replaceChildren();
    const planning=state.data.status==='candidate-review'&&currentScenario();
    label('rl-vandenberg-count',rows.length+' places to consider');
    const eligible=rows.filter(x=>x.candidate&&!DANGER.has(x.candidate.access?.state)&&
      x.candidate.forecast?.state!=='hazard');
    if(planning&&eligible.length){
      label('rl-vandenberg-headline','Start by looking at: '+eligible[0].site.name);
      label('rl-vandenberg-explanation','This place fits your preferences and the nearby weather forecast. It may still be closed or fogged in, so read the details and check the current rules before heading out.');
    }else{
      label('rl-vandenberg-headline','Explore the public viewing spots');
      label('rl-vandenberg-explanation',state.data.status==='pad-geometry-unverified'?
        'We don’t have a confirmed pad location for this mission yet, so distances and directions aren’t shown.':
        state.data.status==='schedule-overdue'?
        'The launch time may have changed. Check the operator’s latest update before choosing a spot.':
        state.data.status==='time-unverified'?
        'The liftoff time is still tentative. Once it’s set, we can compare opening hours and nearby skies.':
        'We can’t recommend a spot for this time yet. Check the official viewing notices for openings and closures.');
    }
    const scenario=currentScenario();
    for(const [index,{site,candidate}] of rows.entries()){
      const card=el('article','rl-vandenberg-card');
      card.dataset.vandenbergCard=site.id;
      card.dataset.selected=state.selectedSite===site.id?'true':'false';
      card.dataset.access=candidate?.access?.state||'unknown';
      const top=el('div','rl-vandenberg-card-top');
      top.appendChild(el('span','rl-vandenberg-number',String(index+1).padStart(2,'0')));
      const title=el('div','');
      title.appendChild(el('h5','',site.name));
      title.appendChild(el('span','rl-vandenberg-kind',site.park));
      top.appendChild(title);
      const pick=el('button','rl-vandenberg-focus','View on map');
      pick.type='button';
      pick.setAttribute('aria-label','Highlight '+site.name+' on the map');
      pick.addEventListener('click',()=>chooseSite(site.id,false));
      top.appendChild(pick);
      card.appendChild(top);
      card.appendChild(el('p','rl-vandenberg-status',statusWord(candidate)));
      card.appendChild(el('p','rl-vandenberg-scene',site.scene));
      const facts=el('div','rl-vandenberg-facts');
      const geometry=site.padGeometry;
      const one=el('div','');
      one.appendChild(el('small','', 'DIRECTION TO THE PAD'));
      one.appendChild(el('strong','',geometry?
        geometry.miles.toFixed(1)+' mi · '+compass(geometry.bearing)+' '+geometry.bearing+'°':
        'Pad location not confirmed'));
      facts.appendChild(one);
      const two=el('div','');
      two.appendChild(el('small','','NEARBY CLOUD FORECAST'));
      const forecast=candidate?.forecast;
      two.appendChild(el('strong','',forecast?.state==='reference-only'?
        forecast.cloud+'% · '+site.reference.name:
        forecast?.state==='hazard'?'Poor weather in the nearby forecast':'Forecast not ready for this hour'));
      facts.appendChild(two);
      card.appendChild(facts);
      if(forecast?.state==='reference-only'){
        card.appendChild(el('p','rl-vandenberg-proxy',
          'Weather reading '+site.reference.miles.toFixed(1)+' mi away. Fog and nearby hills can still block the rocket, even when the forecast looks clear.'));
      }
      card.appendChild(el('p','rl-vandenberg-access',site.accessNote));
      const links=el('div','rl-vandenberg-actions');
      const cited=safeLink(site.source,'Check this location’s rules');
      if(cited)links.appendChild(cited);
      const osm=safeLink(site.osm,'See the area on a map');
      if(osm)links.appendChild(osm);
      if(candidate?.access?.directionsAllowed&&scenario&&state.data.status==='candidate-review'){
        const url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.address);
        const route=safeLink(url,'Find this place in Google Maps','rl-vandenberg-directions');
        if(route)links.appendChild(route);
      }
      card.appendChild(links);
      root.appendChild(card);
    }
    drawMap(rows);
  }
  function renderTimes(){
    const root=$('rl-vandenberg-times');
    if(!root||!state.data)return;
    root.replaceChildren();
    const cases=state.data.scenarios||[];
    if(!cases.length){
      root.appendChild(el('span','rl-vandenberg-no-time',
        'The launch time isn’t precise enough yet to compare hours and weather.'));
      return;
    }
    if(!cases.some(x=>x.offsetHours===state.offsetHours))state.offsetHours=0;
    for(const row of cases){
      const button=el('button','',row.offsetHours===0?'Scheduled · '+fmt(row.targetAt):
        '+'+row.offsetHours+'h · '+fmt(row.targetAt));
      button.type='button';
      button.dataset.offset=String(row.offsetHours);
      button.setAttribute('aria-pressed',state.offsetHours===row.offsetHours?'true':'false');
      button.addEventListener('click',()=>{
        state.offsetHours=row.offsetHours;
        renderTimes();
        renderCards();
      });
      root.appendChild(button);
    }
  }
  function render(){
    const root=$('rl-vandenberg');
    if(!root)return;
    if(!state.data){root.hidden=true;return;}
    root.hidden=false;
    label('rl-vandenberg-state',state.data.status==='candidate-review'?
      'Comparing viewing spots':
      'Check launch details: '+state.data.status.replace(/-/g,' '));
    if(state.data.closedViewingLocations?.length)
      label('rl-vandenberg-closed',
        state.data.closedViewingLocations.join(' · ')+
        '. Explore Lompoc lists these as closed for launch viewing. Don’t use them as spectator stops.');
    for(const button of document.querySelectorAll('#rl-vandenberg-intents button[data-intent]'))
      button.setAttribute('aria-pressed',state.intent===button.dataset.intent?'true':'false');
    renderTimes();
    renderCards();
  }
  document.querySelectorAll('#rl-vandenberg-intents button[data-intent]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(!['family','photo','close'].includes(button.dataset.intent))return;
      state.intent=button.dataset.intent;
      for(const b of document.querySelectorAll('#rl-vandenberg-intents button[data-intent]'))
        b.setAttribute('aria-pressed',state.intent===b.dataset.intent?'true':'false');
      renderCards();
    });
  });
  // The national app dispatches only its already validated selected launch API
  // response. Never reuse California site pins for another region’s mission.
  document.addEventListener('rocket-viewing:data',event=>{
    const data=event.detail;
    state.allLaunches=data?.selectedRegion==='california'?
      data.regions?.find(r=>r.id==='california')?.launches||[]:[];
    state.selectedLaunchId=data?.selectedRegion==='california'?data.selectedLaunchId:null;
    state.rocketPins?.update(state.allLaunches,state.selectedLaunchId);
    state.data=data?.selectedRegion==='california'&&data?.vandenbergViewing?.region==='california'?
      data.vandenbergViewing:null;
    state.offsetHours=0;
    state.selectedSite=null;
    render();
  });
})();
