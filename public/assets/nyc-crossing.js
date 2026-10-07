(function(){
  const $=id=>document.getElementById(id);
  const money=c=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
  const form=$('crossingForm'), results=$('results'), answer=$('answer'), status=$('trafficStatus');

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

  function render(data){
    const liveCount=data.routes.filter(r=>r.etaState==='LIVE').length;
    status.textContent=data.trafficState==='UNAVAILABLE'
      ? 'Live times unavailable'
      : 'Live conditions · '+liveCount+' crossings/segments';
    status.className='status '+(data.trafficState==='UNAVAILABLE'?'off':'live');

    answer.innerHTML='<p class="eyebrow">Decision state</p><h2>Compare live crossing conditions + true road charges</h2><p>'+
      (liveCount
        ? 'Official live measurements are used where available, with fixed Mapbox traffic probes filling selected source gaps. Segment lengths differ, so the tool will not falsely rank unlike crossing and approach times as a door-to-door fastest route.'
        : 'Official live measurements are unavailable right now. Toll and congestion-charge comparisons remain available.')+
      '</p><p class="muted">Lowest road charge among eligible listed crossings: '+
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
      return '<tr><td><div class="route-name">'+r.name+'</div><div class="detail">'+r.corridor+' · '+r.cost.periodLabel+'</div></td>'+
        '<td>'+eta+detail+'</td>'+
        '<td><div class="cost">'+money(r.cost.total)+'</div><div class="detail">Crossing '+money(r.cost.toll)+' · Zone '+money(r.cost.zone)+(r.cost.credit?' · credit −'+money(r.cost.credit):'')+'</div></td>'+
        '<td><span class="status '+(r.eligibility.state==='ELIGIBLE'?'live':'off')+'">'+r.eligibility.state+'</span><div class="detail">'+r.eligibility.reason+'</div></td>'+
        '<td><a href="'+r.cameraUrl+'" target="_blank" rel="noopener">511NY ↗</a></td></tr>';
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
    }
  }

  form.addEventListener('submit',e=>{e.preventDefault();load()});
  load();
  setInterval(()=>{if(!document.hidden)load()},60000);
})();