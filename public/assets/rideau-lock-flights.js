/* Rideau lock-flight elevations: interpretive chamber states, not a navigation chart. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){
    root.RideauFlights=api;
    if(root.document){
      if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>api.mount(root.document));
      else api.mount(root.document);
    }
  }
})(typeof window==='object'?window:null,function(){
  'use strict';
  const OTTAWA='https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation/ecluse-lock-ottawa';
  const JONES='https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation/ecluse-lock-jones-falls';
  const sites=Object.freeze({
    ottawa:Object.freeze({
      id:'ottawa',name:'Ottawa Locks',lower:'Ottawa River',upper:'Upper Rideau Canal',
      lift:'24.1 m',source:OTTAWA,
      overview:'Eight connected chambers climb directly from the Ottawa River. Follow the boat one step at a time to see why this staircase is the great engineering landmark below Parliament Hill.',
      note:'An uninterrupted staircase: each chamber meets the next at a shared gate. The diagram shows the climb from the river, not operating water levels at a particular moment.',
      locks:Object.freeze([
        {number:1,label:'The river entrance',story:'This is where a boat from the Ottawa River first enters the staircase. Look for the enormous masonry walls around the lowest chamber.'},
        {number:2,label:'The second step',story:'Once the first chamber is ready, the boat can move into the next. The same gates-and-gravity sequence is repeated at each step.'},
        {number:3,label:'A rhythm of gates',story:'From the walkway above, the short distance between gates reveals how tightly the chambers fit together.'},
        {number:4,label:'Halfway up',story:'The boat is climbing through the middle of the flight. Each change in level is a separate lock operation, not a continuous ramp.'},
        {number:5,label:'The climb continues',story:'Notice how a chamber is separated from its neighbours by heavy timber gates set in stonework.'},
        {number:6,label:'Watch the waterlines',story:'Different chambers can be at different stages of a lockage. The stepped water in this drawing only explains the overall rise.'},
        {number:7,label:'Near the upper reach',story:'Look down the staircase from the bridge and the full sequence of eight chambers comes into view.'},
        {number:8,label:'The upper canal',story:'At the final chamber, boats can continue into the upper canal when lock staff permit passage.'}
      ])
    }),
    jones:Object.freeze({
      id:'jones',name:'Jones Falls',lower:'Lower reach',upper:'Upper reach',
      lift:'17.4 m',source:JONES,
      overview:'Three lower locks climb together through the stonework. A turning basin separates them from the fourth, detached upper lock. That open water is part of the story.',
      note:'Three locks in flight, then a turning basin and one detached upper lock. The nearby Stone Arch Dam is a different structure, not a fifth lock.',
      locks:Object.freeze([
        {number:42,label:'First lower chamber',story:'From the lower reach, begin at Lock 42. This is the foot of the three-lock flight in the forested Jones Falls setting.'},
        {number:41,label:'Middle of the lower flight',story:'The middle chamber continues the ascent through the original stonework, with gates dividing the water into separate steps.'},
        {number:40,label:'Top of the lower flight',story:'Lock 40 finishes the three linked lower chambers. Beyond it, the boat enters a turning basin instead of another adjoining gate.'},
        {number:39,label:'The detached upper lock',story:'After crossing the turning basin, Lock 39 provides the last lift. It stands apart from the lower three chambers.'}
      ])
    })
  });
  const NS='http://www.w3.org/2000/svg';
  const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function clamp(site,index){
    const id=sites[site]?site:'ottawa',last=sites[id].locks.length-1;
    return Number.isInteger(index)?Math.max(0,Math.min(last,index)):0;
  }
  function geometry(id){
    const isJones=id==='jones';
    const xs=isJones?[126,293,460,829]:[126,241,356,471,586,701,816,931];
    const ys=isJones?[370,325,280,214]:[370,341,312,283,254,225,196,167];
    const widths=isJones?[167,167,150,164]:[115,115,115,115,115,115,115,115];
    return {xs,ys,widths,isJones};
  }
  function drawTree(x,y,k){
    return '<g opacity=".48" transform="translate('+x+' '+y+') scale('+k+')"><path d="M0 4V58" stroke="#64786c" stroke-width="5"/><path d="M0 -32l-25 54h50z" fill="#a4b8a8"/><path d="M0 -15l-31 48h62z" fill="#77998a"/></g>';
  }
  function drawBackdrop(id){
    const tree=id==='jones';
    let art='<path d="M0 417Q60 391 140 408T295 396T463 395T680 368T884 329T1200 308V510H0Z" fill="#d5ddd0"/>';
    art+='<path d="M0 467Q176 450 310 452T640 423T961 385T1200 365V510H0Z" fill="#b7cbbd" opacity=".55"/>';
    if(tree){
      for(const [x,y,k] of [[42,277,.72],[86,256,1.0],[1136,210,.76],[1177,224,.92],[1090,245,.66]])art+=drawTree(x,y,k);
      art+='<text x="47" y="103" class="flight-context">WOODLAND LOCKSTATION</text>';
    } else {
      art+='<g opacity=".34" fill="none" stroke="#54756e" stroke-width="2"><path d="M18 140h90M34 140V104h16v-32h16v32h15v36M46 104h57M1133 130h36V96h12v34M1090 155h110"/></g>';
      art+='<text x="47" y="103" class="flight-context">OTTAWA RIVER ENTRANCE</text>';
    }
    return art;
  }
  function drawWater(x,y,w,depth,highlight){
    const fill=highlight?'#71bac7':'#84b8c0';
    const ripples=[];
    for(let i=0;i<2;i++)ripples.push('<path d="M'+(x+16+i*36)+' '+(y+8+i*12)+'h25" fill="none" stroke="#d9f2ee" stroke-width="2.5" opacity=".72"/>');
    return '<rect x="'+(x+7)+'" y="'+y+'" width="'+(w-14)+'" height="'+depth+'" fill="'+fill+'"/>'+ripples.join('');
  }
  function drawBoat(x,y){
    return '<g class="flight-boat" transform="translate('+x+' '+(y-24)+')"><path d="M-24 0h52l-8 12h-37z" fill="#a95c39" stroke="#62432e" stroke-width="2"/><path d="M-9 -3v-19h23v19" fill="#fff7e8" stroke="#5c6f6f" stroke-width="2"/><path d="M-4 -17h13" stroke="#65a1ad" stroke-width="5"/><path d="M-19 -4h41" stroke="#eed6af" stroke-width="2"/></g>';
  }
  function drawGate(x,y){
    return '<g class="flight-gate"><path d="M'+x+' '+(y-42)+'v110" stroke="#463f33" stroke-width="9"/><path d="M'+(x+2)+' '+(y-42)+'v110" stroke="#ad8157" stroke-width="5"/><path d="M'+(x-7)+' '+(y+9)+'h14M'+(x-7)+' '+(y+31)+'h14" stroke="#d8b187" stroke-width="3"/></g>';
  }
  function chamber(site,i,active){
    const g=geometry(site.id),x=g.xs[i],y=g.ys[i],w=g.widths[i],n=site.locks[i].number;
    const floor=y+72,selected=active===i;
    let chunk='<g class="flight-chamber'+(selected?' is-selected':'')+'" data-chamber="'+n+'" data-chamber-index="'+i+'" tabindex="0" role="button" aria-pressed="'+selected+'" aria-label="Select lock '+n+', chamber '+(i+1)+' of '+site.locks.length+'">';
    chunk+='<path d="M'+x+' '+(y-38)+'h'+w+'v'+(floor-y+54)+'h-'+w+'z" fill="#81928a" stroke="#596e69" stroke-width="2.5"/>';
    chunk+='<path d="M'+(x+7)+' '+(y-31)+'h'+(w-14)+'v'+(floor-y+32)+'h-'+(w-14)+'z" fill="#e0e7e0"/>';
    chunk+=drawWater(x,y,w,72,selected);
    chunk+='<path d="M'+x+' '+(y-38)+'h'+w+' M'+x+' '+(floor+5)+'h'+w+'" stroke="#526864" stroke-width="5" fill="none"/>';
    chunk+='<path d="M'+(x+10)+' '+(floor+17)+'h'+(w-20)+' M'+(x+18)+' '+(floor+29)+'h'+(w-36)+'" stroke="#637a72" stroke-width="2" opacity=".65"/>';
    chunk+=drawGate(x+6,y);
    chunk+=drawGate(x+w-5,y);
    chunk+='<rect class="flight-hit" x="'+x+'" y="'+(y-70)+'" width="'+w+'" height="158" fill="transparent"/>';
    if(selected)chunk+=drawBoat(x+w*.51,y);
    chunk+='<g class="flight-number"><circle cx="'+(x+w/2)+'" cy="'+(y-60)+'" r="23" fill="'+(selected?'#144351':'#f5f5e8')+'" stroke="'+(selected?'#144351':'#627d79')+'" stroke-width="2.5"/><text x="'+(x+w/2)+'" y="'+(y-53)+'" text-anchor="middle" font-size="19" font-weight="800" fill="'+(selected?'#fff':'#264e56')+'">'+n+'</text></g>';
    chunk+='</g>';
    return chunk;
  }
  function drawBasin(){
    return '<g class="flight-basin"><path d="M610 280h218v120q-60 14-116 5t-102 0z" fill="#b3c6bd" opacity=".68"/><path d="M610 280h218v42H610Z" fill="#83b8c1"/><path d="M620 284h45m30 0h32m42 0h44" stroke="#e8f2e8" stroke-width="2" opacity=".8"/><path d="M610 262h218" stroke="#6d867b" stroke-width="8"/><text x="721" y="227" text-anchor="middle" fill="#1e4b55" font-weight="800" font-size="19">TURNING BASIN</text><text x="721" y="250" text-anchor="middle" fill="#385d61" font-size="17">open water between flights</text></g>';
  }
  function renderSvg(id,index){
    const site=sites[id]||sites.ottawa,selected=clamp(site.id,index),g=geometry(site.id);
    let svg='<svg xmlns="'+NS+'" viewBox="0 0 1200 510" width="1200" height="510" class="rideau-flight__svg" role="img" aria-labelledby="flight-drawing-title flight-drawing-desc">';
    svg+='<title id="flight-drawing-title">'+esc(site.name)+' side-elevation lock diagram</title>';
    svg+='<desc id="flight-drawing-desc">'+esc(site.id==='ottawa'?'Eight connected lock chambers rise from the Ottawa River, with one chamber highlighted.':'Three linked lower chambers, a separate turning basin, and one detached upper lock. One chamber is highlighted.')+'</desc>';
    svg+='<defs><linearGradient id="flight-sky" x2="0" y2="1"><stop stop-color="#f7f8ef"/><stop offset="1" stop-color="#e4eeea"/></linearGradient><marker id="flight-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1l7 4-7 4z" fill="#b36d43"/></marker></defs>';
    svg+='<rect width="1200" height="510" fill="url(#flight-sky)"/>'+drawBackdrop(site.id);
    svg+='<path d="M16 '+g.ys[0]+'h'+(g.xs[0]-16)+'v63H0z" fill="#89bdc6" opacity=".95"/>';
    const last=g.ys.length-1,end=g.xs[last]+g.widths[last];
    svg+='<rect x="'+end+'" y="'+g.ys[last]+'" width="'+(1200-end)+'" height="72" fill="#89bdc6"/>';
    svg+='<text x="24" y="'+(g.ys[0]-16)+'" font-size="18" font-weight="700" fill="#31545c">'+esc(site.lower)+'</text>';
    svg+='<text x="'+(end-10)+'" y="'+(g.ys[last]-19)+'" font-size="18" font-weight="700" fill="#31545c">'+esc(site.upper)+'</text>';
    if(g.isJones)svg+=drawBasin();
    for(let i=0;i<site.locks.length;i++)svg+=chamber(site,i,selected);
    svg+='<path d="M147 140h310" stroke="#b36d43" stroke-width="3" stroke-dasharray="8 7" marker-end="url(#flight-arrow)" fill="none"/>';
    svg+='<text x="147" y="130" fill="#74492e" font-size="19" font-weight="800">FOLLOW THE BOAT UPSTREAM</text>';
    svg+='<text x="24" y="477" font-size="17" fill="#395a5e">Teaching elevation only. Chamber heights and distances not to scale. Not a navigational model.</text>';
    svg+='</svg>';
    return svg;
  }
  function mount(doc){
    const get=id=>doc.getElementById(id),stage=get('rideau-flight-stage');
    if(!stage||!get('rideau-flight-enhanced'))return;
    const state={site:'ottawa',selected:{ottawa:0,jones:0}};
    const buttons=Array.from(doc.querySelectorAll('[data-rideau-flight-site]'));
    const strip=get('rideau-flight-chambers');
    const source=get('rideau-flight-source');
    const back=get('rideau-flight-prev'),next=get('rideau-flight-next');
    const scroller=get('rideau-flight-scroll');
    function select(site,index){
      state.site=sites[site]?site:'ottawa';
      state.selected[state.site]=clamp(state.site,index);
      redraw();
    }
    function redraw(){
      const site=sites[state.site],i=state.selected[state.site];
      stage.innerHTML=renderSvg(state.site,i);
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-rideau-flight-site')===state.site)));
      get('rideau-flight-count').textContent='Chamber '+(i+1)+' of '+site.locks.length+' | Lock '+site.locks[i].number;
      get('rideau-flight-title').textContent=site.locks[i].label;
      get('rideau-flight-story').textContent=site.locks[i].story;
      get('rideau-flight-overview').textContent=site.overview;
      get('rideau-flight-location-note').textContent=site.note;
      get('rideau-flight-lift').textContent=site.lift+' combined lift';
      source.href=site.source;
      strip.replaceChildren();
      site.locks.forEach((lock,n)=>{
        const chip=doc.createElement('button');
        chip.type='button';chip.textContent='Lock '+lock.number;
        chip.setAttribute('aria-pressed',String(n===i));
        chip.className='rideau-flight__chip';
        chip.addEventListener('click',()=>select(state.site,n));
        strip.append(chip);
      });
      back.disabled=i===0;next.disabled=i===site.locks.length-1;
      const active=stage.querySelector('[data-chamber-index="'+i+'"]');
      if(active&&scroller){
        const box=active.getBBox(),width=scroller.clientWidth||1200;
        const scale=stage.firstElementChild.getBoundingClientRect().width/1200||1;
        const target=(box.x+box.width/2)*scale-width/2;
        scroller.scrollLeft=Math.max(0,target);
      }
    }
    buttons.forEach(b=>b.addEventListener('click',()=>select(b.getAttribute('data-rideau-flight-site'),state.selected[b.getAttribute('data-rideau-flight-site')]||0)));
    stage.addEventListener('click',event=>{
      const node=event.target.closest('[data-chamber-index]');
      if(node)select(state.site,Number(node.getAttribute('data-chamber-index')));
    });
    stage.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const node=event.target.closest('[data-chamber-index]');
      if(!node)return;
      event.preventDefault();
      const selected=Number(node.getAttribute('data-chamber-index'));
      select(state.site,selected);
      stage.querySelector('[data-chamber-index="'+selected+'"]')?.focus({preventScroll:true});
    });
    back.addEventListener('click',()=>select(state.site,state.selected[state.site]-1));
    next.addEventListener('click',()=>select(state.site,state.selected[state.site]+1));
    get('rideau-flight-reset').addEventListener('click',()=>select(state.site,0));
    get('rideau-flight-fallback').hidden=true;
    get('rideau-flight-enhanced').hidden=false;
    redraw();
  }
  return Object.freeze({sites,clamp,geometry,renderSvg,mount});
});
