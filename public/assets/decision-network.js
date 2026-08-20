(()=>{'use strict';
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-decision-network]');if(!a)return;try{window.va?.('event',{name:'Decision Network Handoff',lane:a.dataset.lane||'unknown',destination:a.dataset.decisionNetwork||'unknown',surface:a.dataset.surface||'unknown'});}catch{}});

function addManisteeTool(){
  if(document.body?.dataset.analyticsPage!=='tools')return;
  const grid=document.querySelector('#trip-planners-group .tool-grid');
  if(!grid||grid.querySelector('[data-manistee-tool]'))return;
  const card=document.createElement('div');
  card.className='tool-card';
  card.dataset.tags='planning fishing boating';
  card.dataset.months='4,5,6,7,8,9,10,11';
  card.dataset.manisteeTool='true';
  card.innerHTML='<div class="tk">Live data<span class="tk-season" hidden> / in season now</span></div><div class="tool-title"><a href="/manistee-river-map/">Manistee River Field Map, Access, Camps, Live Gauges, and Trip Planner</a></div><div class="tool-desc">53 access points, camps, trails, landmarks and river stops across the Upper, Middle and Lower Manistee plus Pine River. Includes live USGS flow and temperature, put-in and takeout planning, guides and liveries, and Google directions.</div>';
  const first=grid.querySelector('.tool-card');
  if(first)first.after(card);else grid.appendChild(card);
  patchToolsSchema();
  syncToolsFinder();
  const search=document.getElementById('tool-search');
  search?.addEventListener('input',syncToolsFinder);
  document.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',syncToolsFinder));
}

function patchToolsSchema(){
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
    try{
      const json=JSON.parse(script.textContent||'{}');
      const graph=Array.isArray(json['@graph'])?json['@graph']:[];
      const list=graph.find(x=>x?.['@type']==='ItemList'&&x?.['@id']==='https://chrisizworski.com/tools/#toollist');
      if(!list)continue;
      const items=Array.isArray(list.itemListElement)?list.itemListElement:[];
      if(!items.some(x=>x?.item?.url==='https://chrisizworski.com/manistee-river-map/')){
        items.push({'@type':'ListItem',position:items.length+1,item:{'@type':'WebApplication',name:'Manistee River Field Map',url:'https://chrisizworski.com/manistee-river-map/',description:'Interactive Manistee River map with access points, campgrounds, trails, live USGS conditions and a river trip planner.',applicationCategory:'TravelApplication',isAccessibleForFree:true,author:{'@id':'https://chrisizworski.com/#person'}}});
        list.itemListElement=items;
        list.numberOfItems=items.length;
        const page=graph.find(x=>x?.['@type']==='CollectionPage'&&x?.['@id']==='https://chrisizworski.com/tools/');
        if(page)page.dateModified='2026-08-20';
        script.textContent=JSON.stringify(json);
      }
      break;
    }catch{}
  }
}

function syncToolsFinder(){
  if(document.body?.dataset.analyticsPage!=='tools')return;
  const cards=[...document.querySelectorAll('.tool-card[data-tags]')];
  const chips=[...document.querySelectorAll('.chip')];
  const active=chips.find(ch=>ch.classList.contains('is-on'))?.dataset.filter||'all';
  const search=document.getElementById('tool-search');
  const q=(search?.value||'').trim().toLowerCase();
  const month=new Date().getMonth()+1;
  let shown=0,inSeason=0;
  cards.forEach(card=>{
    const months=(card.dataset.months||'').split(',').filter(Boolean).map(Number);
    const on=months.includes(month);
    card.dataset.inseason=on?'1':'0';
    const badge=card.querySelector('.tk-season');if(badge)badge.hidden=!on;
    if(on)inSeason++;
    const tags=(card.dataset.tags||'').split(/\s+/);
    const filterOk=active==='all'||(active==='season'?on:tags.includes(active));
    const searchOk=!q||card.textContent.toLowerCase().includes(q);
    card.hidden=!(filterOk&&searchOk);
    if(!card.hidden)shown++;
  });
  document.querySelectorAll('.tool-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.tool-card[data-tags]')].some(card=>!card.hidden);});
  const seasonChip=document.querySelector('.chip[data-filter="season"]');if(seasonChip)seasonChip.textContent=`In season now (${inSeason})`;
  const count=document.getElementById('finder-count');
  if(count){
    const monthName=['January','February','March','April','May','June','July','August','September','October','November','December'][month-1];
    if(shown===cards.length)count.textContent=`Showing all ${cards.length} tools.`;
    else if(active==='season')count.textContent=`Showing ${shown} of ${cards.length} tools most useful in ${monthName}.`;
    else count.textContent=`Showing ${shown} of ${cards.length} tools.`;
  }
  const none=document.getElementById('no-results');if(none)none.hidden=shown>0;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addManisteeTool,{once:true});else addManisteeTool();
})();