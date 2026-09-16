'use strict';
(function(){
  const GEOCODE='/api/national-geocode';
  const LIVE='/api/bird-migration-morning';
  const ACTION='/api/birding-local-action';
  const form=document.getElementById('location-form');
  const input=document.getElementById('location-input');
  const locate=document.getElementById('locate-button');
  const result=document.getElementById('result');
  const error=document.getElementById('error');
  const loading=document.getElementById('loading-note');
  const $=s=>document.querySelector(s);
  const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US').format(n):'—';
  const timeFmt=iso=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?iso:d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});};
  let map=null;
  let mapLayer=null;

  function setLoading(on,text='Checking migration, nearby hotspots and morning weather…'){
    document.body.classList.toggle('loading',on);
    loading.textContent=text;
    form.querySelector('button[type="submit"]').disabled=on;
    locate.disabled=on;
  }
  function showError(message){error.textContent=message;error.classList.add('visible');}
  function clearError(){error.textContent='';error.classList.remove('visible');}
  function metric(id,value,small){const el=$(id);if(!el)return;el.querySelector('strong').textContent=value;const s=el.querySelector('small');if(s&&small)s.textContent=small;}

  async function json(url,options){
    const r=await fetch(url,options);
    let body={};
    try{body=await r.json();}catch{}
    if(!r.ok)throw new Error(body.error||body.detail||`Request failed (${r.status})`);
    return body;
  }

  async function geocodeQuery(q){return json(`${GEOCODE}?q=${encodeURIComponent(q)}`);}
  async function reverseGeocode(latitude,longitude){return json(GEOCODE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude,longitude})});}
  async function analyze(location){
    const base={lat:String(location.latitude),lon:String(location.longitude)};
    const migrationParams=new URLSearchParams({...base,state:String(location.stateCode||'')});
    const actionParams=new URLSearchParams({...base,distKm:'40',back:'3'});
    const [data,action]=await Promise.all([
      json(`${LIVE}?${migrationParams}`),
      json(`${ACTION}?${actionParams}`).catch(()=>null),
    ]);
    if(action?.ok)data.birdingAction=action;
    render(location,data);
    try{localStorage.setItem('birdMigrationLastLocation',JSON.stringify({q:location.query||location.displayName||'',displayName:location.displayName||'',latitude:location.latitude,longitude:location.longitude,stateCode:location.stateCode}));}catch{}
  }

  function renderWeather(weather){
    $('#weather-summary').textContent=weather.summary||'Morning weather unavailable';
    const bits=[];
    if(Number.isFinite(weather.maxPrecip))bits.push(`precip up to ${Math.round(weather.maxPrecip)}%`);
    if(Number.isFinite(weather.maxWindMph))bits.push(`wind up to ${Math.round(weather.maxWindMph)} mph`);
    $('#weather-detail').textContent=bits.length?bits.join(' · '):'No usable hourly rain/wind summary was returned.';
    const list=$('#weather-hours');list.innerHTML='';
    (weather.periods||[]).forEach(p=>{
      const card=document.createElement('div');card.className='hour';
      const strong=document.createElement('strong');strong.textContent=`${timeFmt(p.startTime)} · ${p.temperature ?? '—'}°${p.temperatureUnit||''}`;
      const span=document.createElement('span');
      const precip=Number.isFinite(p.precipitationProbability)?`${Math.round(p.precipitationProbability)}% rain`:'rain n/a';
      span.textContent=`${p.shortForecast||'Forecast'} · ${p.windSpeed||'wind n/a'} ${p.windDirection||''} · ${precip}`;
      card.append(strong,span);list.appendChild(card);
    });
  }

  function mapPlaces(local,action){
    if(action?.topPlaces?.length){
      return action.topPlaces.map(p=>({
        name:p.name,
        lat:p.lat,
        lon:p.lon,
        speciesCount:p.recentSpeciesCount,
        distanceMi:p.distanceMi,
        notableCount:p.notableCount,
        ebirdUrl:p.ebirdUrl,
      }));
    }
    return local.topLocations||[];
  }

  function renderMap(location,local,action){
    if(!window.L)return;
    const center=[Number(location.latitude),Number(location.longitude)];
    if(!map){
      map=L.map('bird-map',{scrollWheelZoom:false}).setView(center,9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    }else map.setView(center,9);
    if(mapLayer)mapLayer.remove();
    mapLayer=L.layerGroup().addTo(map);
    const bounds=[];
    L.circleMarker(center,{radius:8,weight:2,fillOpacity:.75}).addTo(mapLayer).bindTooltip('Selected location');
    bounds.push(center);
    mapPlaces(local,action).forEach((place,index)=>{
      if(!Number.isFinite(place.lat)||!Number.isFinite(place.lon))return;
      const point=[place.lat,place.lon];bounds.push(point);
      const marker=L.circleMarker(point,{radius:7,weight:2,fillOpacity:.7}).addTo(mapLayer);
      const node=document.createElement('div');
      const title=document.createElement('strong');title.textContent=place.name||`Birding location ${index+1}`;
      const detail=document.createElement('div');
      const bits=[`${place.speciesCount||0} recent species represented`];
      if(Number.isFinite(place.distanceMi))bits.push(`${place.distanceMi.toFixed(1)} mi away`);
      if(place.notableCount)bits.push(`${place.notableCount} notable`);
      detail.textContent=bits.join(' · ');
      node.append(title,detail);
      if(place.ebirdUrl){const link=document.createElement('a');link.href=place.ebirdUrl;link.target='_blank';link.rel='noopener';link.textContent='Open eBird hotspot';node.append(document.createElement('br'),link);}
      marker.bindPopup(node);
    });
    if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28],maxZoom:11});
    setTimeout(()=>map.invalidateSize(),0);
  }

  function renderNotables(action){
    const list=$('#notable-list');
    list.innerHTML='';
    const sightings=action?.notableSightings||[];
    sightings.forEach(bird=>{
      const row=document.createElement('div');row.className='bird-row';
      const name=document.createElement('strong');name.textContent=bird.name||'Notable bird';
      const detail=document.createElement('span');
      const bits=[bird.obsDt||'recent record',bird.location||null,Number.isFinite(bird.count)?`${fmt(bird.count)} reported`:null].filter(Boolean);
      detail.textContent=bits.join(' · ');
      row.append(name,detail);list.appendChild(row);
    });
    if(!list.children.length){const p=document.createElement('p');p.className='empty-note';p.textContent=action?.ok?'No non-private notable species surfaced in the current nearby window.':'Nearby notable-bird data could not be loaded; the rest of the morning read remains usable.';list.appendChild(p);}
  }

  function renderPlaces(local,action){
    const locationsList=$('#locations-list');
    locationsList.innerHTML='';
    if(action?.topPlaces?.length){
      action.topPlaces.forEach((place,index)=>{
        const row=document.createElement('div');row.className='place-row';
        const rank=document.createElement('span');rank.className='rank';rank.textContent=String(index+1);
        const body=document.createElement('div');
        const strong=document.createElement('strong');
        if(place.ebirdUrl){const link=document.createElement('a');link.href=place.ebirdUrl;link.target='_blank';link.rel='noopener';link.textContent=place.name||'eBird hotspot';strong.appendChild(link);}else strong.textContent=place.name||'eBird hotspot';
        const detail=document.createElement('span');
        const bits=[`${fmt(place.recentSpeciesCount)} recent species represented`,Number.isFinite(place.distanceMi)?`${place.distanceMi.toFixed(1)} mi`:null,place.latest?`latest ${place.latest}`:null].filter(Boolean);
        detail.textContent=bits.join(' · ');
        const why=document.createElement('span');why.textContent=place.why||'Recent eBird species records surfaced this hotspot.';
        body.append(strong,detail,why);
        const targets=(place.targetSpecies||[]).map(s=>s.name).filter(Boolean).slice(0,5);
        if(targets.length){const target=document.createElement('span');target.textContent=`Recent targets: ${targets.join(', ')}`;body.appendChild(target);}
        row.append(rank,body);locationsList.appendChild(row);
      });
      return;
    }
    (local.topLocations||[]).forEach((place,index)=>{
      const row=document.createElement('div');row.className='place-row';
      const rank=document.createElement('span');rank.className='rank';rank.textContent=String(index+1);
      const body=document.createElement('div');
      const name=document.createElement('strong');name.textContent=place.name||'Recent reporting location';
      const detail=document.createElement('span');detail.textContent=`${fmt(place.speciesCount)} recently reported species represented${place.latest?` · latest ${place.latest}`:''}`;
      body.append(name,detail);row.append(rank,body);locationsList.appendChild(row);
    });
    if(!locationsList.children.length){const p=document.createElement('p');p.className='empty-note';p.textContent='Recent species records are present, but no nearby hotspot could be ranked from the available data.';locationsList.appendChild(p);}
  }

  function renderLocal(location,data){
    const local=data.localBirds||{};
    const action=data.birdingAction||null;
    const pill=$('#local-pill');
    const speciesList=$('#species-list');
    const summary=$('#local-summary');
    speciesList.innerHTML='';
    const ebirdSource=$('#ebird-source');
    ebirdSource.href=data.sources?.ebird?.url||local.sourceUrl||'https://ebird.org/explore';

    if(!local.available){
      pill.textContent='Local reports unavailable';pill.classList.remove('high');
      summary.textContent=action?.topPlaces?.length?`${action.topPlaces.length} nearby hotspots still have current eBird action data, but the county-level species panel is unavailable.`:'Recent local eBird records could not be loaded. Migration and weather remain usable.';
      const birdEmpty=document.createElement('p');birdEmpty.className='empty-note';birdEmpty.textContent='Use the eBird regional link for current species reports.';speciesList.appendChild(birdEmpty);
      renderPlaces(local,action);renderNotables(action);renderMap(location,local,action);
      return;
    }

    pill.textContent=`${fmt(local.speciesCount)} species · ${local.windowDays||3} days`;pill.classList.add('high');
    const actionPhrase=action?.topPlaces?.length?` ${action.topPlaces.length} nearby eBird hotspots surfaced enough recent species evidence to rank as places to check within about ${action.radiusMi||25} miles.`:'';
    if(local.observationSemantics==='deduped-species-records'){
      summary.textContent=`${fmt(local.speciesCount)} distinct species have recent eBird records in the selected region. The upstream regional feed keeps the most recent record per species, so this is not a count of every checklist or sighting.${actionPhrase}`;
    }else{
      summary.textContent=`${fmt(local.speciesCount)} species across ${fmt(local.observationCount)} recent eBird observations in the selected reporting region. Use those records to choose habitat; do not treat the count as a complete inventory.${actionPhrase}`;
    }
    (local.recentSpecies||[]).forEach(bird=>{
      const row=document.createElement('div');row.className='bird-row';
      const name=document.createElement('strong');name.textContent=bird.name||'Recent species';
      const detail=document.createElement('span');
      const where=bird.location?` · ${bird.location}`:'';
      detail.textContent=`${bird.obsDt||'recent record'}${where}`;
      row.append(name,detail);speciesList.appendChild(row);
    });
    if(!speciesList.children.length){const p=document.createElement('p');p.className='empty-note';p.textContent='No recent species rows were returned for this reporting region.';speciesList.appendChild(p);}

    renderPlaces(local,action);
    renderNotables(action);
    renderMap(location,local,action);
  }

  function render(location,data){
    const bird=data.birdcast||{};
    const area=data.area||{};
    const label=area.countyName?`${area.countyName} County, ${location.stateCode}`:(location.displayName||location.query||'Selected location');
    $('#location-label').textContent=label;
    $('#decision-headline').textContent=data.decision?.headline||'Migration read unavailable.';
    const topPlace=data.birdingAction?.topPlaces?.[0];
    $('#decision-detail').textContent=topPlace?`${data.decision?.detail||'Review the independent signals below.'} First place to investigate from current eBird hotspot activity: ${topPlace.name}.`:data.decision?.detail||'No migration amount is being inferred.';
    const livePill=$('#live-pill');
    livePill.textContent=bird.live?'BirdCast live feed':bird.available?'BirdCast migration data':'BirdCast data unavailable';
    livePill.classList.toggle('high',Boolean(bird.live));
    const highPill=$('#high-pill');
    highPill.textContent=bird.high?'BirdCast: High migration':'BirdCast: no High label';
    highPill.classList.toggle('high',Boolean(bird.high));

    metric('#crossed-metric',fmt(bird.birdsCrossed),bird.starting?`since ${bird.starting}`:'regional estimate');
    metric('#flight-metric',fmt(bird.birdsInFlight),bird.recorded?`recorded ${bird.recorded}`:'live/peak estimate when available');
    metric('#direction-metric',bird.direction||'—',bird.directionName||'movement direction');
    const motion=[Number.isFinite(bird.speedMph)?`${bird.speedMph} mph`:null,Number.isFinite(bird.altitudeFt)?`${fmt(bird.altitudeFt)} ft`:null].filter(Boolean).join(' · ');
    metric('#motion-metric',motion||'—','speed · altitude');

    renderWeather(data.weather||{});
    renderLocal(location,data);
    const source=$('#birdcast-source');source.href=data.sources?.birdcast?.url||bird.sourceUrl||'https://dashboard.birdcast.org/';
    $('#source-region').textContent=area.countyName?`BirdCast county region when available: ${area.countyName} County. State-level fallback is used if needed.`:'BirdCast state-level regional estimate.';
    $('#generated-at').textContent=`Checked ${new Date(data.generatedAt||Date.now()).toLocaleString()}`;
    result.classList.add('visible');
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();clearError();result.classList.remove('visible');
    const q=input.value.trim();if(q.length<2){showError('Enter a U.S. city or ZIP code.');return;}
    setLoading(true,'Finding the location…');
    try{const location=await geocodeQuery(q);setLoading(true,'Checking BirdCast, nearby hotspots, recent birds and NWS morning weather…');await analyze(location);}catch(err){showError(err.message||'The birding check could not be completed.');}finally{setLoading(false);}
  });

  locate.addEventListener('click',()=>{
    clearError();result.classList.remove('visible');
    if(!navigator.geolocation){showError('This browser does not provide location access. Enter a city or ZIP instead.');return;}
    setLoading(true,'Getting your approximate location…');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{const location=await reverseGeocode(pos.coords.latitude,pos.coords.longitude);input.value=location.displayName||location.query||'';setLoading(true,'Checking BirdCast, nearby hotspots, recent birds and NWS morning weather…');await analyze(location);}catch(err){showError(err.message||'The birding check could not be completed.');}finally{setLoading(false);}
    },err=>{setLoading(false);showError(err.code===1?'Location permission was not granted. Enter a city or ZIP instead.':'Your location could not be determined. Enter a city or ZIP instead.');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });

  try{const saved=JSON.parse(localStorage.getItem('birdMigrationLastLocation')||'null');if(saved?.q)input.value=saved.q;}catch{}
})();
