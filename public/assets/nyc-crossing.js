(function(){
  const $=id=>document.getElementById(id), money=c=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const form=$('crossingForm'), results=$('results'), answer=$('answer'), status=$('trafficStatus');
  function render(data){
    status.textContent=data.trafficState==='UNAVAILABLE'?'Live times unavailable':'Live Port Authority crossing times';
    status.className='status '+(data.trafficState==='UNAVAILABLE'?'off':'live');
    answer.innerHTML='<p class="eyebrow">Recommendation state</p><h2>'+ (data.fastest?('Take '+data.fastest.name):'Compare tolls before you choose') +'</h2><p>'+ (data.fastest?data.fastest.etaMinutes+' minutes estimated, '+money(data.fastest.cost.total)+' in road charges.':'Live full-trip ETAs are not available yet, so the page will not pretend one crossing is fastest.')+'</p><p class="muted">Lowest toll among eligible listed crossings: '+(data.lowestToll?data.lowestToll.name+' at '+money(data.lowestToll.cost.total):'not available')+'.</p>';
    results.innerHTML=data.routes.map(r=>'<tr><td><div class="route-name">'+r.name+'</div><div class="detail">'+r.corridor+' · '+r.cost.periodLabel+'</div></td><td><span class="status '+(r.etaState==='LIVE'?'live':'off')+'">'+(r.etaMinutes!=null?r.etaMinutes+' min':'Unavailable')+'</span></td><td><div class="cost">'+money(r.cost.total)+'</div><div class="detail">Crossing '+money(r.cost.toll)+' · Zone '+money(r.cost.zone)+(r.cost.credit?' · credit −'+money(r.cost.credit):'')+'</div></td><td><span class="status '+(r.eligibility.state==='ELIGIBLE'?'live':'off')+'">'+r.eligibility.state+'</span><div class="detail">'+r.eligibility.reason+'</div></td><td><a href="'+r.cameraUrl+'" target="_blank" rel="noopener">511NY ↗</a></td></tr>').join('');
    if(data.recommendationState==='PARTIAL_CROSSING_TIMES') {
      answer.innerHTML='<p class="eyebrow">Live crossing times + cost</p><h2>Compare NJ → Manhattan crossings</h2><p>GWB, Lincoln and Holland now show the Port Authority’s current crossing and approach times alongside road charges. These start at different approaches—not your starting address—so the shortest crossing time is not necessarily your fastest trip.</p><p class="muted">Times are for travel toward New York now. The departure selector changes the cost calculation, not these live times.</p>';
    }
    [...results.rows].forEach((row,i)=>{const r=data.routes[i]; if(r.etaMinutes!=null){const detail=document.createElement('div');detail.className='detail';detail.textContent='Toward NY · '+(r.lane?r.lane+' level · ':'')+(r.reportedAt||'')+' · crossing + approach';row.cells[1].appendChild(detail);}});
  }
  async function load(){const p=new URLSearchParams(new FormData(form)); try{const res=await fetch('/api/nyc-crossing?'+p.toString());render(await res.json())}catch(e){status.textContent='Unable to load decision service';status.className='status off'} }
  form.addEventListener('submit',e=>{e.preventDefault();load()});load();setInterval(()=>{if(!document.hidden)load()},60000);
})();
