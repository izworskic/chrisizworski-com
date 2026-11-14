/* Visitor-first Circle Tour feasibility. Not a router, no live access promises.
 * Native Rust and independent JS agree on a whole-day planning allowance.
 * Both guides remain readable and navigable if WASM or this fetch is blocked.
 */
(function(root){
  'use strict';
  if(typeof document==='undefined')return;
  const host=document.getElementById('cti-feasibility');
  if(!host)return;
  const results=document.getElementById('cti-results');
  const hours=document.getElementById('cti-hours');
  const visit=document.getElementById('cti-visit');
  const season=document.getElementById('cti-season');
  if(!results||!hours||!visit||!season)return;
  let payload=null,preset=host.dataset.preset||'10';
  const style=document.createElement('style');
  style.id='cti-widget-style';
  style.textContent=`.cti-feasibility{border:1px solid #c5d6cb;border-radius:8px;padding:14px;margin:16px 0;background:#f5f8f4;color:#1a3830}
    details.cti-feasibility summary{font-weight:750;cursor:pointer}
    .cti-controls{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
    .cti-controls label{font-size:.83rem;display:grid;gap:5px;font-weight:650}
    .cti-controls select{background:white;border:1px solid #aebcb5;border-radius:5px;padding:8px;max-width:190px;min-width:125px}
    .cti-output{overflow-x:auto}.cti-output table{border-collapse:collapse;width:100%;font-size:.82rem}
    .cti-output th,.cti-output td{text-align:left;border-bottom:1px solid #d4e0d8;padding:8px;vertical-align:top}
    .cti-flag{font-weight:750}.cti-flag[data-level="3"]{color:#92331c}
    .cti-flag[data-level="2"]{color:#7d4e13}
    .cti-caution{font-size:.83rem;color:#425b4b;line-height:1.55}
    .cti-caution a{color:#145747;text-decoration:underline}`;
  document.head.appendChild(style);
  const labelFor=code=>({
    1:'Room for exploring',2:'Choose your main stop',3:'Too much for this budget',
    4:'Mileage evidence not approved',0:'Cannot assess'
  })[code]||'Cannot assess';
  function render(){
    const plan=payload?.itineraries?.[preset];
    if(!plan||!root.CircleTourRust?.fitDay){
      results.textContent='The day-by-day budget check is unavailable. The published itinerary and official road links remain usable.';
      return;
    }
    const budget=Number(hours.value)*60,main=Number(visit.value);
    const rows=plan.days.map(day=>({
      day:day.day,miles:day.miles,border:day.borderReserveMinutes,
      result:root.CircleTourRust.fitDay({
        miles:day.miles,minutes:budget,visit:main,
        border:day.borderReserveMinutes,basis:1
      })
    }));
    results.replaceChildren();
    const lead=document.createElement('p');
    lead.className='cti-caution';
    const burdens=rows.filter(x=>x.result===3).length;
    lead.textContent=`${preset}-day route · ${burdens} day${burdens===1?'':'s'} exceed the ${hours.value}-hour sample budget with one ${main}-minute experience. Day miles are editorial estimates, not verified routed distances.`;
    results.appendChild(lead);
    if(season.value==='winter'){
      const note=document.createElement('p');
      note.className='cti-caution';
      note.textContent='Winter: this time calculation is not a trip approval. Scenic drives, park entrances, facilities and road conditions need direct seasonal verification; the published itinerary was not prepared as a winter access guide.';
      results.appendChild(note);
    }else if(season.value==='fall'){
      const note=document.createElement('p');note.className='cti-caution';
      note.textContent='Fall: daylight, boat-tour schedules and seasonal park roads can shorten your actual activity window. Verify access and allow more margin.';
      results.appendChild(note);
    }
    const table=document.createElement('table');
    const header=document.createElement('thead');
    const headRow=document.createElement('tr');
    for(const text of ['Day','Published miles','Time-budget verdict']){
      const th=document.createElement('th');th.scope='col';th.textContent=text;headRow.appendChild(th);
    }
    header.appendChild(headRow);table.appendChild(header);
    const body=document.createElement('tbody');
    for(const item of rows){
      const tr=document.createElement('tr');tr.dataset.day=String(item.day);
      for(const value of [String(item.day),String(item.miles)+' mi']){
        const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
      }
      const td=document.createElement('td'),flag=document.createElement('span');
      flag.className='cti-flag';flag.dataset.level=String(item.result);
      flag.textContent=labelFor(item.result);
      td.appendChild(flag);
      if(item.border){
        const small=document.createElement('small');
        small.textContent=' · Includes 45 min unverified border reserve';
        td.appendChild(small);
      }
      tr.appendChild(td);body.appendChild(tr);
    }
    table.appendChild(body);results.appendChild(table);
    const detail=document.createElement('p');detail.className='cti-caution';
    const link=document.createElement('a');
    link.href='/lake-superior-circle-tour/10-day/';
    link.textContent='Read the detailed, source-linked 10-day itinerary';
    detail.append('No live road speeds or entrance permissions are inferred. ',link,'.');
    results.appendChild(detail);
    host.dataset.engine=root.CircleTourRust.engine();
  }
  for(const control of [hours,visit,season])control.addEventListener('change',render);
  root.addEventListener('circle-tour:preset-change',event=>{
    const next=String(event?.detail?.days||'');
    if(['7','10','15'].includes(next)){preset=next;render();}
  });
  (async()=>{
    try{
      const response=await fetch('/assets/circle-tour-trip-intelligence.json',{credentials:'same-origin'});
      if(!response.ok)throw Error('itinerary data unavailable');
      const data=await response.json();
      if(data.schemaVersion!==1||data.stopCount!==31||
        !['7','10','15'].every(d=>data.itineraries?.[d]?.days?.length===Number(d)))
        throw Error('stale source data');
      payload=data;render();
      await root.CircleTourRust?.activate?.();
      render();
    }catch{render();}
  })();
})(typeof window==='undefined'?null:window);
