/* Source-backed Michigan snowmobile place search. No inference from text or weather. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SnowmobileCitySearch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STATES=['MI','WI','OH','IN','IL','MN','PA','NY'];
  let loading=null;
  function norm(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/\b(?:st|ste)\.?\b/g,'saint').replace(/\bmt\.?\b/g,'mount')
      .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function queryParts(query){
    const raw=String(query||'').trim(),matched=raw.match(/^(.*?)[,\s]+(MI|WI|OH|IN|IL|MN|PA|NY)\.?$/i);
    return {term:norm(matched?matched[1]:raw),state:matched?matched[2].toUpperCase():null};
  }
  function makeRecords(census,trail){
    if(census?.schemaVersion!==1||!Array.isArray(census.places)||census.places.length<9000||
       trail?.schemaVersion!==1||!Array.isArray(trail.towns)||trail.towns.length!==27){
      throw Error('The verified city or trail-town reference data is unavailable');
    }
    const records=[],ids=new Set(),knownMichigan=new Set();
    for(const r of census.places){
      if(!Array.isArray(r)||r.length!==5)throw Error('Malformed Census place record');
      const [id,name,state,lat,lon]=r;
      if(!/^[a-z]{2}-\d{7}$/.test(id)||typeof name!=='string'||!STATES.includes(state)||
         !Number.isFinite(lat)||!Number.isFinite(lon)||lat<24||lat>50||lon< -100||lon> -66||ids.has(id)){
        throw Error('Invalid or duplicate Census place reference');
      }
      ids.add(id);
      records.push({id,name,state,lat,lon,label:name+', '+state,point:lat.toFixed(5)+','+lon.toFixed(5),source:'Census place',key:norm(name)});
      if(state==='MI')knownMichigan.add(norm(name));
    }
    const towns=[];
    for(const t of trail.towns){
      if(!t||typeof t.name!=='string'||typeof t.region!=='string'||
         !/^\/snowmobile\/regions\/[a-z-]+\.html#trail-conditions-near-[a-z0-9-]+$/.test(t.url)||
         !Number.isFinite(t.lat)||!Number.isFinite(t.lon)||t.dnrRadiusKm!==5){
        throw Error('Unverified trail-town search entry');
      }
      towns.push({id:'town-'+t.region+'-'+norm(t.name).replace(/\s+/g,'-'),name:t.name,state:'MI',
        lat:t.lat,lon:t.lon,label:t.name+', MI',url:t.url,region:t.region,key:norm(t.name)});
      // Census doesn't include unincorporated riding communities such as Frederic.
      if(!knownMichigan.has(norm(t.name))){
        const id='mi-trail-'+norm(t.name).replace(/\s+/g,'-');
        if(ids.has(id))throw Error('Duplicate verified trail-town origin');
        ids.add(id);knownMichigan.add(norm(t.name));
        records.push({id,name:t.name,state:'MI',lat:t.lat,lon:t.lon,label:t.name+', MI',
          point:t.lat.toFixed(5)+','+t.lon.toFixed(5),source:'DNR-verified riding town reference',key:norm(t.name)});
      }
    }
    return {places:records,towns};
  }
  function score(item,term){
    const key=item.key||norm(item.name);
    if(key===term)return 0;
    if(key.startsWith(term))return 1;
    if(key.includes(' '+term))return 2;
    if(key.includes(term))return 3;
    // Conservative typo support, suggestions only. A typo is never silently selected.
    if(term.length>=5&&Math.abs(key.length-term.length)<=2){
      let previous=Array.from({length:key.length+1},(_,i)=>i);
      for(let i=1;i<=term.length;i++){
        const next=[i];for(let j=1;j<=key.length;j++)next[j]=Math.min(
          next[j-1]+1,previous[j]+1,previous[j-1]+(term[i-1]===key[j-1]?0:1));
        previous=next;
      }
      if(previous[key.length]<=2)return 4+previous[key.length];
    }
    return Infinity;
  }
  function match(records,query,limit=8){
    const p=queryParts(query);
    if(p.term.length<2)return [];
    return records.filter(x=>!p.state||x.state===p.state).map(x=>({item:x,rank:score(x,p.term)}))
      .filter(x=>Number.isFinite(x.rank))
      .sort((a,b)=>a.rank-b.rank||(a.item.state==='MI'?-1:1)-(b.item.state==='MI'?-1:1)||
        a.item.name.localeCompare(b.item.name)||a.item.state.localeCompare(b.item.state)||a.item.id.localeCompare(b.item.id))
      .slice(0,limit).map(x=>x.item);
  }
  function exact(records,query){
    const p=queryParts(query);
    const hits=records.filter(x=>(!p.state||x.state===p.state)&&(x.key||norm(x.name))===p.term);
    return hits.length===1?hits[0]:null;
  }
  function load(){
    if(!loading)loading=Promise.all([
      fetch('/data/snowmobile-origin-places.json').then(r=>{if(!r.ok)throw Error('City index unavailable');return r.json();}),
      fetch('/data/snowmobile-trail-towns.json').then(r=>{if(!r.ok)throw Error('Town index unavailable');return r.json();})
    ]).then(([c,t])=>makeRecords(c,t)).catch(e=>{loading=null;throw e;});
    return loading;
  }
  function attach(input,results,config={}){
    if(!input||!results)throw Error('Search input or accessible results missing');
    const mode=config.mode==='towns'?'towns':'places';
    let items=null,selected=null,candidates=[],active=-1,nonce=0;
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-haspopup','listbox');
    input.setAttribute('aria-expanded','false');
    results.setAttribute('role','listbox');
    const close=()=>{candidates=[];active=-1;results.replaceChildren();input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
    function choose(item){
      selected=item;input.value=item.label;close();config.onSelect?.(item);
    }
    function highlight(index){
      active=index;const buttons=[...results.querySelectorAll('[role="option"]')];
      buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));
      const id=buttons[active]?.id;
      if(id)input.setAttribute('aria-activedescendant',id);
      else input.removeAttribute('aria-activedescendant');
    }
    function message(value){results.replaceChildren();const note=document.createElement('div');note.className='snow-city-search-note';note.textContent=value;results.append(note);input.setAttribute('aria-expanded','true');}
    function render(){
      if(!items)return;
      if(selected&&input.value===selected.label){close();return;}
      if(queryParts(input.value).term.length<2){close();return;}
      candidates=match(items,input.value,8);active=-1;results.replaceChildren();
      if(!candidates.length){message(mode==='towns'?'No verified DNR trail town matches. Try a nearby town or open a regional trail map.':'No matching place in Michigan or the seven nearby states. Try a different spelling or use your location.');return;}
      candidates.forEach((item,i)=>{
        const button=document.createElement('button');
        button.type='button';button.className='snow-city-option';button.setAttribute('role','option');
        button.id=results.id+'-choice-'+i;button.setAttribute('aria-selected','false');
        button.textContent=item.label+(mode==='towns'?' · trail evidence':'');
        button.addEventListener('mousedown',e=>e.preventDefault());
        button.addEventListener('click',()=>choose(item));results.append(button);
      });
      input.setAttribute('aria-expanded','true');
    }
    async function ensure(){
      if(items)return items;
      const token=++nonce;message('Loading verified place names…');
      try{
        const data=await load();if(token!==nonce)return null;
        items=data[mode];render();return items;
      }catch{
        if(token===nonce)message('Place search is unavailable. Try again or use your device location.');
        return null;
      }
    }
    input.addEventListener('focus',()=>{ensure().then(()=>render());});
    input.addEventListener('input',()=>{
      selected=null;config.onClear?.();
      if(items)render();else ensure();
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        if(!candidates.length)return;e.preventDefault();highlight((active+(e.key==='ArrowDown'?1:candidates.length-1))%candidates.length);return;
      }
      if(e.key==='Enter'){
        if(candidates.length&&active>=0){e.preventDefault();choose(candidates[active]);return;}
        if(items){const unique=exact(items,input.value);if(unique){e.preventDefault();choose(unique);return;}}
        // Never route from unselected or ambiguous user text.
        if(config.onInvalid){e.preventDefault();config.onInvalid('Choose a matching place from the suggestions.');}
      }
    });
    input.addEventListener('blur',()=>{setTimeout(close,150);});
    return {
      getSelected:()=>selected,
      async selectById(id){
        const data=await ensure();if(!data)return null;
        const item=data.find(x=>x.id===id)||null;
        if(item)choose(item);
        return item;
      },
      getItems:()=>items
    };
  }
  return {norm,queryParts,makeRecords,match,exact,load,attach};
});
