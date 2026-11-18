'use strict';
(function(){
  const search=document.getElementById('tool-search');
  const buttons=[...document.querySelectorAll('[data-filter]')];
  const seasonButton=document.querySelector('[data-season-toggle]');
  const cards=[...document.querySelectorAll('[data-search-card]')];
  const groups=[...document.querySelectorAll('[data-catalog-group]')];
  const count=document.getElementById('finder-count');
  const empty=document.getElementById('no-results');
  const month=String(new Date().getMonth()+1);
  let filter='all';
  let seasonOnly=false;

  function inSeason(card){
    return(card.dataset.months||'').split(',').includes(month);
  }

  cards.forEach(card=>{
    const label=card.querySelector('.season-label');
    if(label&&inSeason(card))label.hidden=false;
  });

  // data-peak="MM-DD/MM-DD[,MM-DD/MM-DD]" (from data/directory-peaks.json via
  // scripts/build-directory-peaks.py) marks the window when a seasonal tool is the
  // obvious answer. In-window cards lead their grid and fill "Worth checking now",
  // shortest (most time-sensitive) window first; tools starting within three weeks
  // follow as "Starts soon". Nothing hand-dated needs editing each season.
  const DAY=86400000;
  const now=new Date();
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  function windowsOf(card){
    return (card.dataset.peak||'').split(',').map(w=>{
      const m=/^(\d{2})-(\d{2})\/(\d{2})-(\d{2})$/.exec(w.trim());
      if(!m)return null;
      const y=now.getFullYear();
      let start=Date.UTC(y,m[1]-1,+m[2]),end=Date.UTC(y,m[3]-1,+m[4]);
      if(end<start){if(today<=end)start=Date.UTC(y-1,m[1]-1,+m[2]);else end=Date.UTC(y+1,m[3]-1,+m[4]);}
      if(today>end){start=Date.UTC(y+1,m[1]-1,+m[2]);end=Date.UTC(y+1,m[3]-1,+m[4]);if(end<start)end=Date.UTC(y+2,m[3]-1,+m[4]);}
      return {start,end,length:Math.round((end-start)/DAY)};
    }).filter(Boolean);
  }
  const fmt=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  const peakRows=[];
  cards.forEach((card,order)=>{
    for(const w of windowsOf(card)){
      if(today>=w.start&&today<=w.end)peakRows.push({card,order,rank:w.length,now:true,end:w.end});
      else if(w.start>today&&w.start-today<=21*DAY)peakRows.push({card,order,rank:1000+(w.start-today)/DAY,now:false,start:w.start});
    }
  });
  const seen=new Set();
  const picks=peakRows.sort((a,b)=>a.rank-b.rank||a.order-b.order).filter(r=>!seen.has(r.card)&&seen.add(r.card));
  picks.filter(r=>r.now).reverse().forEach(({card})=>{
    card.classList.add('is-peak');
    const label=card.querySelector('.season-label');
    if(label){label.textContent='Peak now';label.hidden=false;}
    if(card.parentElement)card.parentElement.prepend(card);
  });
  const peakSection=document.querySelector('[data-peak-now]');
  const peakList=peakSection&&peakSection.querySelector('[data-peak-list]');
  if(peakList&&picks.length){
    for(const r of picks.slice(0,5)){
      const c=r.card;const link=c.querySelector('a.primary-action')||c.querySelector('a[href]');
      const li=document.createElement('li');const a=document.createElement('a');a.href=link?link.getAttribute('href'):'#';
      const t=document.createElement('span');t.className='peak-title';t.textContent=(c.querySelector('h3')||c).textContent.trim();
      const meta=document.createElement('span');meta.className='peak-meta';
      meta.textContent=(r.now?'Through '+fmt(r.end):'Starts '+fmt(r.start))+' · '+(c.dataset.peakNote||'');
      a.append(t,meta);li.append(a);peakList.append(li);
      a.addEventListener('click',()=>{if(typeof window.gtag==='function')window.gtag('event','tool_open',{tool_id:c.dataset.toolId,placement:'peak-now',transport_type:'beacon'});});
    }
    peakSection.hidden=false;
  }

  function apply(){
    const query=(search.value||'').trim().toLowerCase();
    document.querySelectorAll('[data-directory-context]').forEach(block=>{block.hidden=!!query||filter!=='all'||seasonOnly;});
    let visible=0;
    cards.forEach(card=>{
      const haystack=((card.dataset.tags||'')+' '+(card.textContent||'')).toLowerCase();
      const personas=(card.dataset.personas||'').split(/\s+/);
      // Shared hub search (hub-search.js) ranks and decides text matches when present.
      const textOk=window.HubSearch?card.dataset.hubMatch!=='0':(!query||haystack.includes(query));
      const show=textOk
        &&(filter==='all'||personas.includes(filter))
        &&(!seasonOnly||inSeason(card));
      card.hidden=!show;
      if(show)visible+=1;
    });
    groups.forEach(group=>{group.hidden=!group.querySelector('[data-search-card]:not([hidden])');});
    empty.style.display=visible?'none':'block';
    count.textContent=visible+(visible===1?' tool shown':' tools shown');
  }

  // Measure discovery without sending typed places or search text to analytics.
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    const card=link?.closest('[data-search-card]');
    if(card&&typeof window.gtag==='function')window.gtag('event','tool_open',{tool_id:card.dataset.toolId,placement:'national-directory',transport_type:'beacon'});
  });
  buttons.forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.filter;
    if(typeof window.gtag==='function')window.gtag('event','tool_filter',{filter,placement:'national-directory'});
    buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    apply();
  }));
  seasonButton.addEventListener('click',()=>{
    seasonOnly=!seasonOnly;
    seasonButton.setAttribute('aria-pressed',String(seasonOnly));
    apply();
  });
  search.addEventListener(window.HubSearch?'hubsearch:change':'input',apply);
  apply();
})();
