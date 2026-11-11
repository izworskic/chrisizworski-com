(function(){
  const $=id=>document.getElementById(id);
  const money=c=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
  const form=$('crossingForm'), results=$('results'), answer=$('answer'), status=$('trafficStatus');
  const pairA=$('pairA'), pairB=$('pairB'), pairResult=$('pairResult');
  const pairState={first:'queens-midtown',second:'queensboro'};
  let currentSnapshot=null, pairOptionsKey=null;
  const escapeHtml=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function scopeLabel(scope){
    return ({
      CROSSING_ONLY:'crossing',
      CROSSING_APPROACH:'crossing + approach',
      APPROACH_CORRIDOR:'approach corridor + crossing',
      APPROACH_SEGMENT:'approach segment'
    })[scope] || 'live segment';
  }

  function delayText(r){
    if(r.delayMinutes==null) return '';
    const d=Math.round(r.delayMinutes*10)/10;
    const reference=r.baselineKind==='NYCDOT_8_WEEK_HOURLY_AVG'?'8-wk avg':r.baselineKind==='MAPBOX_TYPICAL_TRAFFIC'?'typical':'usual';
    if(Math.abs(d)<0.5) return ' · about '+reference;
    return d>0 ? ' · +'+d+' min vs '+reference : ' · '+Math.abs(d)+' min faster than '+reference;
  }

  // Freshness is checked independently per 511NY source. A valid sign update
  // does not establish that roadway incidents were fetched successfully.
  const current511=stamp=>{
    const time=Date.parse(stamp||'');
    const age=Date.now()-time;
    return Number.isFinite(time)&&age>=-60000&&age<=20*60000;
  };

  function incidentStamp(info){
    if(current511(info?.eventsUpdatedAt)){
      const age=Math.max(0,Math.round((Date.now()-Date.parse(info.eventsUpdatedAt))/60000));
      return '511NY roadway advisories checked '+age+'m ago; coverage may be incomplete.';
    }
    return '511NY incident updates are not verified right now. Check <a href="https://511ny.org/" target="_blank" rel="noopener noreferrer">official 511NY conditions</a> for closures and road restrictions.';
  }

  function disruptionHtml(r,info){
    const d=r.disruption||{};
    const freshEvents=current511(info?.eventsUpdatedAt);
    const freshSigns=current511(info?.signsUpdatedAt);
    const eventItems=freshEvents&&Array.isArray(d.events)?d.events:[];
    const signItems=freshSigns&&Array.isArray(d.signs)?d.signs:[];
    // Empty incident lists are not an all-clear, and missing incident data
    // must not create eleven identical placeholder cards.
    if(!eventItems.length&&!signItems.length)return '';
    const events=eventItems.slice(0,2).map(e=>'<div class="detail">'+escapeHtml(e.category||'Incident')+': '+escapeHtml(e.description||e.code)+'</div>').join('');
    const signs=signItems.slice(0,1).map(s=>'<div class="detail vms">VMS: '+escapeHtml(s.message)+'</div>').join('');
    const labels=[];
    if(eventItems.length)labels.push(d.incidentCount+' nearby 511NY road advisor'+(d.incidentCount===1?'y':'ies'));
    if(signItems.length)labels.push(d.signCount+' active highway sign'+(d.signCount===1?'':'s'));
    return '<div class="disruption"><strong>'+labels.join(' · ')+'</strong>'+events+signs+'</div>';
  }

  // Crossing IDs come from the same API snapshot as the tolls and travel scope.
  // A/B selection changes the answer locally, without another provider request.
  function renderPair(data){
    if(!pairA||!pairB||!pairResult)return;
    const routes=Array.isArray(data?.routes)?data.routes:[];
    if(routes.length<2){
      pairResult.innerHTML='<p class="notice">Crossing comparison is unavailable. Refer to the published toll table and official 511NY conditions below.</p>';
      return;
    }
    const ids=routes.map(r=>r.id).join(',');
    if(ids!==pairOptionsKey){
      const options=routes.map(r=>'<option value="'+escapeHtml(r.id)+'">'+escapeHtml(r.name)+'</option>').join('');
      pairA.innerHTML=options;
      pairB.innerHTML=options;
      pairOptionsKey=ids;
    }
    if(!routes.some(r=>r.id===pairState.first))pairState.first=routes[0].id;
    if(!routes.some(r=>r.id===pairState.second))pairState.second=routes[1].id;
    pairA.value=pairState.first;
    pairB.value=pairState.second;
    if(pairState.first===pairState.second){
      pairResult.innerHTML='<p class="notice">Choose two different crossings to compare the modeled charges and evidence.</p>';
      return;
    }
    const first=routes.find(r=>r.id===pairState.first);
    const second=routes.find(r=>r.id===pairState.second);
    const carCard=(r,heading)=>{
      const allowed=r.eligibility?.state==='ELIGIBLE';
      const time=r.etaState==='LIVE'&&Number.isFinite(r.etaMinutes)
        ? escapeHtml(r.etaMinutes)+' min · '+escapeHtml(scopeLabel(r.etaScope))
        : 'Live measurement unavailable';
      const source=r.etaState==='LIVE'
        ? escapeHtml(r.trafficSourceName||'Live traffic source')+
          (r.direction?' · '+escapeHtml(r.direction):'')+
          (r.reportedAt?' · '+escapeHtml(r.reportedAt):'')
        : escapeHtml(r.trafficPending||'No verified current segment time');
      return '<article class="pair-card"><p class="pair-kicker">'+heading+'</p><h3>'+escapeHtml(r.name)+'</h3>'+
        '<p class="pair-charge">'+money(r.cost?.total)+' <span>modeled road charge</span></p>'+
        '<p class="detail">Crossing '+money(r.cost?.toll)+' · Zone '+money(r.cost?.zone)+
        (r.cost?.credit?' · Credit −'+money(r.cost.credit):'')+'</p>'+
        '<p class="pair-eligibility '+(allowed?'good':'caution')+'">Vehicle: '+escapeHtml(r.eligibility?.state||'REVIEW')+'</p>'+
        '<p class="detail">'+escapeHtml(r.eligibility?.reason||'Verify posted restrictions.')+'</p>'+
        '<p class="pair-time">'+time+'</p><p class="detail">'+source+'</p>'+
        disruptionHtml(r,data.ny511)+
        '<p><a href="'+escapeHtml(r.cameraUrl)+'" target="_blank" rel="noopener noreferrer">Check official 511NY map</a></p></article>';
    };
    const canCompare=first.eligibility?.state==='ELIGIBLE'&&second.eligibility?.state==='ELIGIBLE'&&
      Number.isFinite(first.cost?.total)&&Number.isFinite(second.cost?.total);
    let conclusion='Vehicle restrictions or missing road charges prevent a valid price comparison. Review both eligibility notices.';
    if(canCompare){
      const difference=first.cost.total-second.cost.total;
      conclusion=difference===0
        ? 'Same modeled road charge for these selections.'
        : (difference<0?escapeHtml(first.name):escapeHtml(second.name))+
          ' has '+money(Math.abs(difference))+' lower modeled road charges for the selected inputs.';
    }
    pairResult.innerHTML='<div class="pair-grid">'+carCard(first,'Option A')+carCard(second,'Option B')+'</div>'+
      '<div class="pair-verdict"><strong>'+conclusion+'</strong>'+
      '<p>These are crossing and congestion-zone charges, not complete-trip costs. Live times may cover different roadway lengths or directions, so they cannot establish which route is fastest. Confirm your actual route, restrictions and current incidents before driving.</p></div>';
  }

  function renderDeparture(info){
    const target=$('departureIntelligence');
    if(!target)return;
    if(!info||info.state!=='AVAILABLE'||!Array.isArray(info.windows)||info.windows.length!==3){
      const reason=info?.reason||'Historical evidence is currently unavailable.';
      target.innerHTML='<p class="notice"><strong>Timing comparison not available.</strong> '+escapeHtml(reason)+
        ' This does not affect current tolls or measured traffic.</p>'+
        (info?.source?.latestObservationDate?'<p class="detail">Last archived day: '+escapeHtml(info.source.latestObservationDate)+'</p>':'');
      return;
    }
    const names={
      'queens-midtown':'Queens–Midtown Tunnel',
      'hugh-carey':'Hugh L. Carey Tunnel',
      'brooklyn':'Brooklyn Bridge approach corridor',
      'manhattan':'Manhattan Bridge approach corridor',
      'rfk':'RFK Manhattan approach segment',
      'verrazzano':'Verrazzano eastbound span'
    };
    const cards=info.windows.map(w=>{
      const lower=Number(w.lowerMinutes),upper=Number(w.upperMinutes),typical=Number(w.typicalMinutes);
      const title=w.inMinutes===0?'This hour':w.inMinutes===60?'+1 hour':'+2 hours';
      return '<article class="timing-window"><p class="timing-window-label">'+title+
        ' · '+escapeHtml(w.clockLabel)+' ET</p><p class="timing-median">'+typical.toFixed(1)+
        '<span>min typical</span></p><p class="detail">Historical daily-hourly range: '+
        lower.toFixed(1)+'–'+upper.toFixed(1)+' min</p><p class="detail">'+
        escapeHtml(w.trainingDays)+' distinct training days</p></article>';
    }).join('');
    const movement=info.historicallyLighterInMinutes==null
      ? 'No defensible advantage at one time over another.'
      : 'Historically lighter segment near +'+escapeHtml(info.historicallyLighterInMinutes)+
        ' minutes; not a travel recommendation.';
    const holdout=info.holdout||{};
    target.innerHTML='<p class="timing-selected">'+escapeHtml(names[info.crossingId]||info.crossingId)+
      ' · '+escapeHtml(scopeLabel(info.scope))+' · '+escapeHtml(info.direction)+'</p>'+
      '<div class="timing-grid">'+cards+'</div>'+
      '<p class="timing-conclusion"><strong>'+movement+'</strong> Current incidents can reverse this pattern.</p>'+
      '<p class="detail">Independent holdout: '+escapeHtml(holdout.observedHourRows)+
      ' observed date-hours, model MAE '+escapeHtml(holdout.maeMinutes)+
      ' min versus all-hour baseline '+escapeHtml(holdout.naiveMaeMinutes)+
      ' min. Historical range coverage '+Math.round(Number(holdout.intervalCoverage)*100)+
      '%. Archive through '+escapeHtml(info.source?.latestObservationDate||'unknown')+'.</p>'+
      '<p class="detail">'+escapeHtml(info.disclaimer||'Historical segment evidence only.')+'</p>';
  }

  function render(data){
    currentSnapshot=data;
    renderPair(data);
    renderDeparture(data.departure);
    const liveCount=data.routes.filter(r=>r.etaState==='LIVE').length;
    status.textContent=data.trafficState==='UNAVAILABLE'
      ? 'Live times unavailable'
      : 'Live conditions · '+liveCount+' crossings/segments';
    status.className='status '+(data.trafficState==='UNAVAILABLE'?'off':'live');

    answer.innerHTML='<p class="eyebrow">Decision state</p><h2>Compare live crossing conditions + true road charges</h2><p>'+
      (liveCount
        ? 'Official live measurements are used where available, with fixed Mapbox traffic probes filling selected source gaps. Segment lengths differ, so the tool will not falsely rank unlike crossing and approach times as a door-to-door fastest route.'
        : 'Official live measurements are unavailable right now. Toll and congestion-charge comparisons remain available.')+
      '</p><p class="muted">'+incidentStamp(data.ny511)+'</p><p class="muted">511NY reports may affect a nearby approach rather than the bridge itself. Always check posted signs and the official road map.</p><p class="muted">Lowest road charge among eligible listed crossings: '+
      (data.lowestToll?data.lowestToll.name+' at '+money(data.lowestToll.cost.total):'not available')+'.</p>';

    results.innerHTML=data.routes.map(r=>{
      const eta=r.etaMinutes!=null
        ? '<span class="status live">'+r.etaMinutes+' min</span>'
        : '<span class="status off">Unavailable</span>';
      const speed=r.speedMph!=null?' · '+r.speedMph+' mph':'';
      const detail=r.etaMinutes!=null
        ? '<div class="detail">'+(r.direction||'Current direction')+' · '+scopeLabel(r.etaScope)+speed+delayText(r)+'</div>'+
          '<div class="detail">'+(r.trafficSourceName||'Official traffic source')+(r.reportedAt?' · '+r.reportedAt:'')+'</div>'
        : '<div class="detail">'+(r.trafficPending||'No fresh official reading connected')+'</div>';
      return '<tr role="row"><td role="cell" headers="crossing-name"><div class="route-name">'+r.name+'</div><div class="detail">'+r.corridor+' · '+r.cost.periodLabel+'</div></td>'+
        '<td role="cell" headers="crossing-time"><span class="mobile-label" aria-hidden="true">Live crossing / corridor time</span>'+eta+detail+disruptionHtml(r,data.ny511)+'</td>'+
        '<td role="cell" headers="crossing-charge"><span class="mobile-label" aria-hidden="true">Total road charge</span><div class="cost">'+money(r.cost.total)+'</div><div class="detail">Crossing '+money(r.cost.toll)+' · Zone '+money(r.cost.zone)+(r.cost.credit?' · credit −'+money(r.cost.credit):'')+'</div></td>'+
        '<td role="cell" headers="crossing-vehicle"><span class="mobile-label" aria-hidden="true">Vehicle check</span><span class="status '+(r.eligibility.state==='ELIGIBLE'?'live':'off')+'">'+r.eligibility.state+'</span><div class="detail">'+r.eligibility.reason+'</div></td>'+
        '<td role="cell" headers="crossing-camera"><span class="mobile-label" aria-hidden="true">Traffic / camera</span><a href="'+r.cameraUrl+'" target="_blank" rel="noopener">511NY ↗</a></td></tr>';
    }).join('');
  }

  async function load(){
    const p=new URLSearchParams(new FormData(form));
    p.set('liveBucket',String(Math.floor(Date.now()/60000)));
    try{
      const res=await fetch('/api/nyc-crossing?'+p.toString(),{cache:'no-store'});
      if(!res.ok) throw new Error('decision service '+res.status);
      render(await res.json());
    }catch(e){
      currentSnapshot=null;
      status.textContent='Unable to load decision service';
      status.className='status off';
      if(pairResult)pairResult.innerHTML='<p class="notice">Current comparisons are unavailable; no live travel-time or current toll claim can be verified. See the published rates and official sources below.</p>';
      results.innerHTML='<tr role="row"><td role="cell" colspan="5">Current live comparison unavailable. See the published toll table below.</td></tr>';
      answer.innerHTML='<h2>Live crossing comparison unavailable</h2><p>Check the official roadway feeds before driving. The published car toll guide remains available below.</p>';
      renderDeparture({state:'UNAVAILABLE',reason:'The comparison API is unavailable.'});
    }
  }

  form.addEventListener('submit',e=>{e.preventDefault();load()});
  if(pairA)pairA.addEventListener('change',()=>{
    pairState.first=pairA.value;
    if(currentSnapshot)renderPair(currentSnapshot);
  });
  if(pairB)pairB.addEventListener('change',()=>{
    pairState.second=pairB.value;
    if(currentSnapshot)renderPair(currentSnapshot);
  });
  load();
  setInterval(()=>{if(!document.hidden)load()},60000);
})();
