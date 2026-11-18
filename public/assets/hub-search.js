/* Hub search UI for the tool directories (/tools/, /national-tools/, /michigan-gardening/).
 * Ranks every card with HubSearchEngine (Rust/WASM verified against the JS oracle),
 * shows the best matches directly under the search box so phone visitors see the
 * answer without scrolling, filters and reorders the full grid below, and keeps
 * ?q= in the address bar so a search can be shared. Typed text never leaves the page.
 * Page filters stay in charge of visibility: they listen for `hubsearch:change`
 * and read card.dataset.hubMatch ('1' match, '0' no match).
 */
(function(){
  'use strict';
  const E=window.HubSearchEngine;
  const input=document.querySelector('input[data-hub-search]');
  if(!E||!input)return;
  const text=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
  const textWithout=(el,skip)=>{if(!el)return'';const c=el.cloneNode(true);c.querySelectorAll(skip).forEach(n=>n.remove());return text(c);};
  const ADAPTERS={
    national:{cards:'[data-search-card]',noun:['tool','tools'],reset:'[data-filter="all"]',
      fields:c=>({title:text(c.querySelector('h3')),tags:c.dataset.tags,place:text(c.querySelector('.place')),kind:text(c.querySelector('.kind')),
        description:text(c.querySelector('.description')),months:c.dataset.months,href:(c.querySelector('a.primary-action')||c.querySelector('a[href]'))?.getAttribute('href')||''})},
    tools:{cards:'.tool-card[data-tags]',noun:['tool','tools'],reset:'.chip[data-filter="all"]',
      fields:c=>({title:text(c.querySelector('.tool-title')),tags:c.dataset.tags,place:'',kind:textWithout(c.querySelector('.tk'),'.tk-season'),
        description:text(c.querySelector('.tool-desc')),months:c.dataset.months,href:c.querySelector('.tool-title a')?.getAttribute('href')||''})},
    garden:{cards:'[data-garden-result]',noun:['featured tool','featured tools'],ownsVisibility:true,
      fields:c=>({title:text(c.querySelector('strong'))||text(c),tags:c.getAttribute('data-terms')||'',place:'',
        kind:text(c.closest('[data-garden-category]')?.querySelector('h2,h3')),description:text(c.querySelector('span')),months:'',href:c.getAttribute('href')||''})}
  };
  const adapter=ADAPTERS[input.dataset.hubSearch];
  if(!adapter)return;
  const lexicon=window.HubSearchLexicon||'';
  const cache=new WeakMap();
  const docOf=c=>{let d=cache.get(c);if(!d){d=adapter.fields(c);cache.set(c,d);}return d;};
  let order=0;
  const MAX_TOP=5;

  let panel=document.querySelector('[data-hub-search-results]');
  if(!panel){
    panel=document.createElement('div');panel.setAttribute('data-hub-search-results','');
    const row=input.closest('.search-row')||input;
    row.after(panel);
  }
  panel.className='hub-search-results';panel.hidden=true;
  const status=document.createElement('p');status.className='hub-search-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=document.createElement('ol');list.className='hub-search-top';list.setAttribute('aria-label','Best matches');
  const actions=document.createElement('div');actions.className='hub-search-actions';
  panel.replaceChildren(status,list,actions);
  input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),'hub-search-status'].filter(Boolean).join(' '));
  status.id='hub-search-status';
  document.documentElement.setAttribute('data-hub-search','ready');

  const plural=n=>n===1?adapter.noun[0]:adapter.noun[1];
  function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n;}
  function button(label,onClick){const b=el('button','hub-search-link',label);b.type='button';b.addEventListener('click',onClick);return b;}

  // Wrap words in the title that match the query, built from DOM text nodes, never parsed markup.
  function highlighted(title,terms){
    const span=el('span','hub-search-title');
    if(!terms.length){span.textContent=title;return span;}
    for(const part of title.split(/(\s+)/)){
      const stems=E.normalize(part).split(' ').filter(Boolean).map(E.stem);
      const hit=stems.some(s=>terms.some(t=>s===t||(t.length>=3&&s.startsWith(t))));
      span.append(hit?el('mark',null,part):document.createTextNode(part));
    }
    return span;
  }

  function cardsNow(){
    const cards=[...document.querySelectorAll(adapter.cards)];
    for(const c of cards)if(!c.dataset.hubOrder)c.dataset.hubOrder=String(order++);
    return cards;
  }
  function restoreOrder(cards){
    const parents=new Set(cards.map(c=>c.parentElement).filter(Boolean));
    for(const p of parents){
      const kids=[...p.children].filter(c=>cards.includes(c)).sort((a,b)=>a.dataset.hubOrder-b.dataset.hubOrder);
      for(const k of kids)p.append(k);
    }
  }
  function rankOrder(cards,ranked){
    const pos=new Map(ranked.map((i,r)=>[cards[i],r]));
    const parents=new Set(cards.map(c=>c.parentElement).filter(Boolean));
    for(const p of parents){
      const kids=[...p.children].filter(c=>cards.includes(c));
      kids.sort((a,b)=>(pos.has(a)?pos.get(a):1e6+Number(a.dataset.hubOrder))-(pos.has(b)?pos.get(b):1e6+Number(b.dataset.hubOrder)));
      for(const k of kids)p.append(k);
    }
  }
  function ownVisibility(cards){
    if(!adapter.ownsVisibility)return;
    for(const c of cards)c.hidden=c.dataset.hubMatch==='0';
    document.querySelectorAll('[data-garden-category]').forEach(s=>{s.hidden=![...s.querySelectorAll(adapter.cards)].some(c=>!c.hidden);});
  }

  let urlTimer=0;
  function syncUrl(q){
    clearTimeout(urlTimer);
    urlTimer=setTimeout(()=>{
      try{const u=new URL(location.href);if(q)u.searchParams.set('q',q);else u.searchParams.delete('q');history.replaceState(history.state,'',u);}catch{}
    },400);
  }

  let last=null;
  function run(){
    const q=input.value;
    const cards=cardsNow();
    const docs=cards.map(docOf);
    let sel={mode:'all',order:[]},result=null;
    if(q.trim()){
      const ranked=E.rank(E.buildInput(q,lexicon,docs));
      result=ranked.result;sel=E.select(result);
      document.documentElement.setAttribute('data-hub-search-engine',ranked.engine);
    }
    const active=sel.mode!=='all';
    const hits=new Set(sel.order);
    cards.forEach((c,i)=>{c.dataset.hubMatch=!active||hits.has(i)?'1':'0';});
    if(active)rankOrder(cards,sel.order);else restoreOrder(cards);
    ownVisibility(cards);
    input.dispatchEvent(new CustomEvent('hubsearch:change',{bubbles:true,detail:{query:q,mode:sel.mode}}));
    last={q,cards,docs,sel};
    render();
    syncUrl(active?q.trim():'');
  }

  function render(){
    if(!last)return;
    const {q,cards,docs,sel}=last;
    list.replaceChildren();actions.replaceChildren();
    if(sel.mode==='all'){panel.hidden=true;status.textContent='';return;}
    panel.hidden=false;
    const terms=E.queryTerms(q);
    const shown=sel.order.filter(i=>!cards[i].hidden);
    const filtered=sel.order.length-shown.length;
    const quoted='“'+q.trim()+'”';
    const correction=E.suggest(q,docs);
    if(sel.mode==='none'){
      status.textContent='No '+adapter.noun[1]+' match '+quoted+'.';
      actions.append(el('p','hub-search-tip','Try a place (Zion, Mackinac), an activity (ice fishing, birding) or a month or season (December, winter).'));
    }else if(sel.mode==='partial'){
      status.textContent='Nothing matches every word in '+quoted+'. Closest '+adapter.noun[1]+':';
    }else if(correction){
      status.textContent=shown.length+' '+plural(shown.length)+' for “'+correction+'” (closest spelling to '+quoted+')';
    }else{
      status.textContent=shown.length+' '+plural(shown.length)+' match '+quoted;
    }
    for(const i of shown.slice(0,MAX_TOP)){
      const d=docs[i];
      const a=el('a');a.href=d.href||'#';
      a.append(highlighted(d.title,[...terms,...(correction?E.queryTerms(correction):[])]));
      const meta=[d.place,d.kind].filter(Boolean).join(' · ');
      if(meta)a.append(el('span','hub-search-meta',meta));
      const li=el('li');li.append(a);list.append(li);
      a.addEventListener('click',()=>{if(typeof window.gtag==='function')window.gtag('event','tool_open',{tool_id:cards[i].dataset.toolId||d.href,placement:'hub-search',transport_type:'beacon'});});
    }
    if(shown.length>MAX_TOP){
      actions.append(button('See all '+shown.length+' below',()=>{
        const first=cards[shown[0]];first.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        const link=first.matches('a')?first:first.querySelector('a[href]');if(link)link.focus({preventScroll:true});
      }));
    }
    if(filtered>0&&adapter.reset){
      actions.append(button(filtered+' more '+plural(filtered)+' hidden by a filter — show them',()=>{document.querySelector(adapter.reset)?.click();}));
    }
    if(sel.mode!=='full'||shown.length===0){
      actions.append(button('Clear search',()=>{input.value='';run();input.focus();}));
    }
  }

  input.addEventListener('input',run);
  input.addEventListener('focus',()=>{E.loadNative().then(ok=>{if(ok&&last&&last.sel.mode!=='all')run();});},{once:true});
  input.addEventListener('keydown',e=>{
    const first=list.querySelector('a');
    if((e.key==='Enter'||e.key==='ArrowDown')&&first){e.preventDefault();first.focus();}
    else if(e.key==='Enter')e.preventDefault();
    else if(e.key==='Escape'&&input.value){e.preventDefault();input.value='';run();}
  });
  list.addEventListener('keydown',e=>{
    const links=[...list.querySelectorAll('a')];const at=links.indexOf(document.activeElement);
    if(e.key==='ArrowDown'&&at>-1&&at<links.length-1){e.preventDefault();links[at+1].focus();}
    else if(e.key==='ArrowUp'){e.preventDefault();(at>0?links[at-1]:input).focus();}
    else if(e.key==='Escape'){e.preventDefault();input.focus();}
  });
  // Page filters change visibility after a click; refresh the match list to agree.
  document.addEventListener('click',e=>{if(e.target.closest('[data-filter],.chip,[data-season-toggle]'))requestAnimationFrame(render);});

  window.HubSearch={run,engine:()=>E.engine()};
  const initial=new URLSearchParams(location.search).get('q');
  if(initial){input.value=initial.slice(0,120);run();E.loadNative().then(ok=>{if(ok)run();});}
})();
