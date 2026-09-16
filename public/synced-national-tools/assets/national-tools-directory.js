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

  function apply(){
    const query=(search.value||'').trim().toLowerCase();
    let visible=0;
    cards.forEach(card=>{
      const haystack=((card.dataset.tags||'')+' '+(card.textContent||'')).toLowerCase();
      const personas=(card.dataset.personas||'').split(/\s+/);
      const show=(!query||haystack.includes(query))
        &&(filter==='all'||personas.includes(filter))
        &&(!seasonOnly||inSeason(card));
      card.hidden=!show;
      if(show)visible+=1;
    });
    groups.forEach(group=>{group.hidden=!group.querySelector('[data-search-card]:not([hidden])');});
    empty.style.display=visible?'none':'block';
    count.textContent=visible+(visible===1?' tool shown':' tools shown');
  }

  buttons.forEach(button=>button.addEventListener('click',()=>{
    filter=button.dataset.filter;
    buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    apply();
  }));
  seasonButton.addEventListener('click',()=>{
    seasonOnly=!seasonOnly;
    seasonButton.setAttribute('aria-pressed',String(seasonOnly));
    apply();
  });
  search.addEventListener('input',apply);
  apply();
})();
