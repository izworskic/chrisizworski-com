'use strict';
(function(){
  const API='/api/columbia-salmon';
  const state={data:null,species:'chinookAdult'};
  const $=s=>document.querySelector(s);
  const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US').format(n):'—';
  const dateFmt=iso=>{if(!iso)return '—';const d=new Date(iso+'T12:00:00-07:00');return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'});};
  const shortDate=iso=>{if(!iso)return '';const d=new Date(iso+'T12:00:00-07:00');return d.toLocaleDateString('en-US',{month:'numeric',day:'numeric',timeZone:'America/Los_Angeles'});};
  const trendText=t=>!t||t.direction==='unknown'?'Trend unavailable':`${t.direction[0].toUpperCase()+t.direction.slice(1)} ${Number.isFinite(t.pct)?Math.abs(t.pct)+'%':''}`.trim();

  function runLabel(season){
    if(!season)return 'Run context unavailable';
    if(season.chinookRun==='fall Chinook')return season.fallChinookPeakEnvelope?'Fall Chinook · within historical peak-date envelope':'Fall Chinook season';
    if(season.chinookRun==='spring Chinook')return 'Spring Chinook season';
    if(season.chinookRun==='summer Chinook')return 'Summer Chinook season';
    return season.chinookRun;
  }

  function summary(data){
    const t=data.bonneville.trends.chinook;
    const parts=[];
    if(data.season.chinookRun==='fall Chinook')parts.push('Fall Chinook are the main Chinook run at Bonneville now');
    else parts.push(`${data.season.chinookRun} is the current Chinook run context`);
    if(t.direction==='falling')parts.push('the 7-day count pattern is easing from earlier-week levels');
    else if(t.direction==='rising')parts.push('the 7-day count pattern is strengthening');
    else if(t.direction==='steady')parts.push('the 7-day count pattern is relatively steady');
    if(data.season.fallChinookPeakEnvelope)parts.push('today falls inside the historical earliest-to-latest annual peak-date envelope');
    return parts.join('; ')+'.';
  }

  function renderDecision(data){
    const latest=data.bonneville.latest;
    $('#latest-date').textContent=`Counts through ${dateFmt(data.latestDate)}`;
    $('#data-age').textContent=data.dataAgeDays===0?'Latest reporting day':data.dataAgeDays===1?'1 day behind':`${data.dataAgeDays} days behind`;
    $('#data-age').dataset.state=data.dataAgeDays<=1?'live':'stale';
    $('#run-context').textContent=runLabel(data.season);
    $('#decision-title').textContent=data.season.chinookRun==='fall Chinook'?'Fall Chinook are moving through the lower Columbia.':'Salmon are moving through the Columbia system.';
    $('#decision-summary').textContent=summary(data);
    $('#chinook-count').textContent=fmt(latest.chinookAdult);
    $('#chinook-date').textContent=dateFmt(latest.date);
    $('#coho-count').textContent=fmt(latest.cohoAdult);
    $('#steelhead-count').textContent=fmt(latest.steelhead);
    $('#jack-count').textContent=fmt(latest.chinookJack);
    $('#chinook-trend').textContent=trendText(data.bonneville.trends.chinook);
    $('#coho-trend').textContent=trendText(data.bonneville.trends.coho);
    $('#steelhead-trend').textContent=trendText(data.bonneville.trends.steelhead);
    $('#ytd-chinook').textContent=fmt(data.bonneville.ytd?.chinookAdult);
  }

  function renderChart(){
    const data=state.data;if(!data)return;
    const rows=data.bonneville.rows;
    const vals=rows.map(r=>Number.isFinite(r[state.species])?r[state.species]:0);
    const max=Math.max(...vals,1);
    const chart=$('#trend-chart');
    chart.innerHTML='';
    rows.forEach((row,i)=>{
      const val=vals[i];
      const wrap=document.createElement('div');wrap.className='bar-wrap';
      const value=document.createElement('div');value.className='bar-value';value.textContent=fmt(val);
      const bar=document.createElement('div');bar.className='bar';bar.style.height=`${Math.max(2,(val/max)*150)}px`;bar.title=`${shortDate(row.date)}: ${fmt(val)}`;
      const label=document.createElement('div');label.className='bar-label';label.textContent=shortDate(row.date);
      wrap.append(value,bar,label);chart.appendChild(wrap);
    });
    const map={chinookAdult:['Chinook adult','chinook'],cohoAdult:['Coho adult','coho'],steelhead:['Steelhead','steelhead']};
    const [name,key]=map[state.species];
    $('#trend-label').textContent=`Bonneville ${name}: ${trendText(data.bonneville.trends[key])}`;
  }

  function renderCorridor(data){
    const holder=$('#corridor');holder.innerHTML='';
    data.dams.forEach((dam,i)=>{
      const latest=dam.latest;
      const el=document.createElement('article');el.className='dam';
      el.innerHTML=`<span>Checkpoint ${i+1}</span><h3>${dam.name}</h3><strong>${fmt(latest?.chinookAdult)}</strong><small>adult Chinook · ${latest?shortDate(latest.date):'no current row'}</small>`;
      holder.appendChild(el);
    });
    if(data.corridor.highestReportedChinook){
      const h=data.corridor.highestReportedChinook;
      $('#corridor-note').innerHTML=`Highest reported adult Chinook count among these four checkpoints: <strong>${h.damName}</strong> with <strong>${fmt(h.count)}</strong> on ${dateFmt(h.date)}. ${data.corridor.note}`;
    }else $('#corridor-note').textContent=data.corridor.note;
  }

  function renderContext(data){
    $('#peak-fall').textContent=data.season.fallChinookPeakEnvelope?'Inside historical peak-date envelope':'Outside historical peak-date envelope';
    $('#peak-coho').textContent=data.season.cohoPeakEnvelope?'Inside historical peak-date envelope':'Outside historical peak-date envelope';
    $('#peak-steelhead').textContent=data.season.steelheadPeakEnvelope?'Inside historical peak-date envelope':'Outside historical peak-date envelope';
    $('#source-updated').textContent=`Live counts source: Fish Passage Center · latest Bonneville reporting date ${dateFmt(data.latestDate)}.`;
    const sourceLink=$('#source-link');sourceLink.href=data.source.url;
  }

  function fail(message){
    document.body.classList.remove('loading');
    const error=$('#error');error.style.display='block';error.textContent=message;
    $('#latest-date').textContent='Live source unavailable';
  }

  document.querySelectorAll('[data-species]').forEach(btn=>btn.addEventListener('click',()=>{
    state.species=btn.dataset.species;
    document.querySelectorAll('[data-species]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    renderChart();
  }));

  fetch(API,{headers:{Accept:'application/json'}})
    .then(r=>r.json().then(j=>({ok:r.ok,j})))
    .then(({ok,j})=>{
      if(!ok||!j.ok)throw new Error(j.error||'Live source unavailable');
      state.data=j;renderDecision(j);renderChart();renderCorridor(j);renderContext(j);document.body.classList.remove('loading');
    })
    .catch(err=>fail(`Live fish counts could not be loaded right now. The page still shows the source and method, but no current count is being inferred. ${err.message||''}`));
})();
