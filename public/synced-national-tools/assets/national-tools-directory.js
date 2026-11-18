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

  // data-peak="MM-DD/MM-DD" marks the short window when a seasonal tool is the
  // obvious answer (White Christmas before Dec 25). During it the card moves to the
  // front of its grid, so nothing hand-dated has to be edited each season.
  const now=new Date();
  const todayKey=(now.getMonth()+1)*100+now.getDate();
  function dayKey(text){const m=/^(\d{2})-(\d{2})$/.exec(text||'');return m?Number(m[1])*100+Number(m[2]):null;}
  function inPeak(card){
    const parts=(card.dataset.peak||'').split('/');
    const start=dayKey(parts[0]),end=dayKey(parts[1]);
    if(start===null||end===null)return false;
    return start<=end?todayKey>=start&&todayKey<=end:todayKey>=start||todayKey<=end;
  }
  cards.filter(inPeak).reverse().forEach(card=>{
    card.classList.add('is-peak');
    const label=card.querySelector('.season-label');
    if(label){label.textContent='Peak now';label.hidden=false;}
    if(card.parentElement)card.parentElement.prepend(card);
  });

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
