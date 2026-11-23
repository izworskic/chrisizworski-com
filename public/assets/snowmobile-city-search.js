/* Source-backed Michigan city search. Never geocode a guess or invent a route. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SnowmobileCitySearch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const URL='/assets/snowmobile-origin-cities.json';
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;'}[c]));
  function normalize(s){
    return String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/\b(?:michigan|mi)\b\s*$/,'')
      .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function validRow(row){
    return row&&/^(mi-26\d{5}|trail-[a-z0-9-]+)$/.test(row.id)&&
      typeof row.name==='string'&&row.name.length>0&&row.name.length<100&&
      Number.isFinite(row.lat)&&Number.isFinite(row.lon)&&
      row.lat>=41&&row.lat<=49&&row.lon>=-91&&row.lon<=-82&&
      ['city','village','cdp','trail-reference'].includes(row.kind);
  }
  function validate(payload){
    if(!payload||payload.version!==1||payload.state!=='MI'||!Array.isArray(payload.records)||
       payload.records.length<700||payload.records.length>1200)throw Error('City index version or coverage is invalid');
    const ids=new Set();
    for(const row of payload.records){
      if(!validRow(row)||ids.has(row.id))throw Error('City index contains an invalid or duplicate location');
      ids.add(row.id);
    }
    return payload.records;
  }
  function point(row){return Number(row.lat).toFixed(5)+','+Number(row.lon).toFixed(5);}
  function origin(row){return {id:row.id,label:row.name+', MI',point:point(row)};}
  function resolve(records,query,selected){
    if(!Array.isArray(records))return {state:'unavailable'};
    const q=normalize(query);
    if(!q)return {state:'empty'};
    if(selected&&normalize(selected.name)===q)return {state:'match',record:selected};
    const exact=records.filter(row=>normalize(row.name)===q);
    if(exact.length===1)return {state:'match',record:exact[0]};
    if(exact.length>1)return {state:'ambiguous',records:exact};
    return {state:'unknown'};
  }
  function distance(a,b,stop=2){
    if(Math.abs(a.length-b.length)>stop)return stop+1;
    let before=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const next=[i];
      for(let j=1;j<=b.length;j++)
        next[j]=Math.min(next[j-1]+1,before[j]+1,before[j-1]+(a[i-1]===b[j-1]?0:1));
      before=next;
      if(Math.min(...before)>stop)return stop+1;
    }
    return before[b.length];
  }
  function suggest(records,query,limit=8){
    if(!Array.isArray(records))return [];
    const q=normalize(query);
    if(q.length<2)return [];
    const choices=[];
    for(const row of records){
      const name=normalize(row.name);
      let rank=100;
      if(name===q)rank=0;
      else if(name.startsWith(q))rank=1;
      else if(name.split(' ').some(word=>word.startsWith(q)))rank=2;
      else if(name.includes(q))rank=3;
      else if(q.length>=4){const d=distance(name,q,q.length>=6?2:1);if(d<=(q.length>=6?2:1))rank=4+d;}
      if(rank<100)choices.push({row,rank});
    }
    choices.sort((a,b)=>a.rank-b.rank||a.row.name.localeCompare(b.row.name)||a.row.kind.localeCompare(b.row.kind));
    return choices.slice(0,limit).map(x=>x.row);
  }
  function attach({input,results,feedback,onChange}){
    if(!input||!results||!feedback)throw Error('Missing city search controls');
    let records=null,selected=null;
    const publish=message=>{feedback.textContent=message;};
    const close=()=>{results.hidden=true;results.innerHTML='';input.setAttribute('aria-expanded','false');};
    const ready=fetch(URL,{signal:AbortSignal.timeout(10000)}).then(async response=>{
      if(!response.ok)throw Error('City directory request failed');
      records=validate(await response.json());
      publish('Type a Michigan city or community, then compare. You can also use your location.');
      return records;
    }).catch(()=>{
      publish('City lookup is unavailable. You can still use your location or browse regional trail reports.');
      return null;
    });
    const choose=row=>{
      selected=row;
      input.value=row.name;
      close();
      publish('Using '+row.name+', Michigan as your starting place (Census reference point, not a trailhead).');
      if(typeof onChange==='function')onChange();
    };
    const show=()=>{
      const q=input.value.trim();
      if(!records){close();return;}
      const found=suggest(records,q);
      if(!found.length){close();if(q.length>=2)publish('No matching Michigan place. Check spelling; do not use a guessed location.');return;}
      results.innerHTML=found.map(row=>'<button type="button" class="city-suggestion" data-city-id="'+safe(row.id)+'">'+safe(row.name)+' <span>'+safe(row.kind==='trail-reference'?'trail-area reference':row.kind.toUpperCase())+'</span></button>').join('');
      results.hidden=false;input.setAttribute('aria-expanded','true');
      publish(found.length+' matching Michigan place'+(found.length===1?'':'s')+'. Select one or enter an exact name.');
    };
    input.addEventListener('input',()=>{
      selected=null;
      if(typeof onChange==='function')onChange();
      show();
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape'){close();return;}
      if(event.key==='ArrowDown'&&!results.hidden){
        event.preventDefault();results.querySelector('button')?.focus();
      }
    });
    results.addEventListener('click',event=>{
      const option=event.target.closest?.('[data-city-id]');
      if(!option||!records)return;
      const row=records.find(item=>item.id===option.dataset.cityId);
      if(row)choose(row);
    });
    results.addEventListener('keydown',event=>{
      const options=Array.from(results.querySelectorAll('button'));
      const i=options.indexOf(event.target);
      if(event.key==='Escape'){event.preventDefault();close();input.focus();return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        const delta=event.key==='ArrowDown'?1:-1;
        const next=i+delta;
        if(next>=0&&next<options.length)options[next].focus();
        else input.focus();
      }
    });
    function current(){
      const match=resolve(records,input.value,selected);
      if(match.state==='match'){
        choose(match.record);
        return origin(match.record);
      }
      const message={
        unavailable:'City directory could not load. Use my location instead.',
        empty:'Type a starting city first.',
        ambiguous:'More than one Michigan place has that name. Choose the intended place from the suggestions.',
        unknown:'No exact Michigan place found. Choose a suggested name rather than guessing.'
      }[match.state];
      publish(message||'Choose a verified Michigan place.');
      if(match.state==='ambiguous')show();
      return null;
    }
    async function selectById(id){
      await ready;
      const row=records?.find(item=>item.id===id);
      if(!row)return null;
      choose(row);
      return origin(row);
    }
    return {ready,current,selectById,get selected(){return selected;}};
  }
  return {URL,normalize,validate,resolve,suggest,origin,attach};
});
