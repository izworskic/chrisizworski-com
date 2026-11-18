/* "Your tools": star any tool card to keep it at the top of a tools directory.
 * Stars live only in this browser (localStorage); nothing is sent anywhere except
 * an anonymous tool_star event with the tool id. Without JavaScript or storage the
 * page is unchanged: the section stays hidden and no star buttons appear.
 */
(function(){
  'use strict';
  const section=document.querySelector('[data-tool-stars]');
  if(!section)return;
  const KEY='ciz:starred-tools:v1';
  const cardSel=section.dataset.cards||'[data-tool-id]';
  const titleSel=section.dataset.title||'a[href]';
  const linkSel=section.dataset.link||titleSel;
  const list=section.querySelector('[data-stars-list]');
  const hint=section.querySelector('[data-stars-hint]');
  let store=null;
  try{const t='__ciz_probe';localStorage.setItem(t,'1');localStorage.removeItem(t);store=localStorage;}catch{store=null;}
  if(!store||!list)return;
  const read=()=>{try{const v=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,40):[];}catch{return[];}};
  const write=ids=>{try{store.setItem(KEY,JSON.stringify(ids));}catch{}};
  const cards=()=>[...document.querySelectorAll(cardSel)];
  // data-id="href" keys cards without a tool id by their link (e.g. garden guide cards).
  const idOf=c=>c.dataset.toolId||(section.dataset.id==='href'?(c.querySelector(linkSel)||{}).getAttribute?.('href')||'':'');
  const byId=id=>cards().find(c=>idOf(c)===id);
  const titleOf=c=>{const a=c.querySelector(titleSel);return a?a.textContent.replace(/\s+/g,' ').trim():c.dataset.toolId;};
  const hrefOf=c=>{const a=c.querySelector(linkSel);return a?a.getAttribute('href'):'#';};
  const track=(id,action)=>{if(typeof window.gtag==='function')window.gtag('event','tool_star',{tool_id:id,action,placement:section.dataset.placement||'tools-directory'});};

  function toggle(id){
    const ids=read();const at=ids.indexOf(id);
    if(at>-1)ids.splice(at,1);else ids.unshift(id);
    write(ids);track(id,at>-1?'remove':'add');render();
  }
  function decorate(card){
    if(card.querySelector('.tool-star'))return;
    const id=idOf(card);if(!id)return;
    const b=document.createElement('button');
    b.type='button';b.className='tool-star';
    b.addEventListener('click',e=>{e.preventDefault();toggle(id);});
    card.classList.add('has-star');
    card.prepend(b);
  }
  function render(){
    const ids=read();
    for(const c of cards()){
      decorate(c);
      if(!idOf(c))continue;
      const on=ids.includes(idOf(c));
      const b=c.querySelector('.tool-star');
      b.setAttribute('aria-pressed',String(on));
      b.setAttribute('aria-label',(on?'Remove ':'Save ')+titleOf(c)+(on?' from your tools':' to your tools'));
      b.textContent=on?'★':'☆';
    }
    list.replaceChildren();
    const saved=ids.map(byId).filter(Boolean);
    for(const c of saved){
      const li=document.createElement('li');
      const a=document.createElement('a');a.href=hrefOf(c);a.textContent=titleOf(c);
      const rm=document.createElement('button');rm.type='button';rm.className='starred-tools__remove';
      rm.setAttribute('aria-label','Remove '+titleOf(c)+' from your tools');rm.textContent='✕';
      rm.addEventListener('click',()=>toggle(idOf(c)));
      li.append(a,rm);list.append(li);
    }
    list.hidden=saved.length===0;
    if(hint)hint.hidden=saved.length>0;
    section.hidden=false;
  }
  render();
  // Cards added later (e.g. by decision-network.js) get a star too.
  new MutationObserver(()=>{if(cards().some(c=>idOf(c)&&!c.querySelector('.tool-star')))render();})
    .observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
})();
