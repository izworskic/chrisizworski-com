(function(){
  const $=id=>document.getElementById(id);
  const money=c=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
  const form=$('crossingForm'), results=$('results'), answer=$('answer'), status=$('trafficStatus');
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
    if(eventItems.length)labels.push(d.incidentCount+' mapped 511NY incident'+(d.incidentCount===1?'':'s'));
    if(signItems.length)labels.push(d.signCount+' active highway sign'+(d.signCount===1?'':'s'));
    return '<div class="disruption"><strong>'+labels.join(' · ')+'</strong>'+events+signs+'</div>';
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
      '</p><p class="muted">'+incidentStamp(data.ny511)+'</p><p class="muted">Verified, current 511NY advisories may inform comparisons; they never replace live travel times or posted closure instructions.</p><p class="muted">Lowest road charge among eligible listed crossings: '+
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
      status.textContent='Unable to load decision service';
      status.className='status off';
      renderDeparture({state:'UNAVAILABLE',reason:'The comparison API is unavailable.'});
    }
  }

  form.addEventListener('submit',e=>{e.preventDefault();load()});
  load();
  setInterval(()=>{if(!document.hidden)load()},60000);
})();
