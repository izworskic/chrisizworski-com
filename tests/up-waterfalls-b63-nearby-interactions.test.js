import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const nearby=fs.readFileSync('public/assets/up-waterfalls-nearby.js','utf8');
const explorer=fs.readFileSync('public/assets/up-waterfalls.js','utf8');

test('B63 browser scripts remain parseable and nearby actions reuse the original planner',()=>{
 assert.doesNotThrow(()=>new vm.Script(nearby));
 assert.doesNotThrow(()=>new vm.Script(explorer));
 assert.match(explorer,/upfall:shortlist-updated/);
 assert.match(nearby,/document\.addEventListener\('upfall:shortlist-updated',syncSaveButtons\)/);
 assert.match(nearby,/existing\.click\(\)/);
 assert.ok(!nearby.includes('google.com/maps/dir'),'map focus is not a driving route');
});

test('B63 nearby map reveal and add/remove controls stay synchronized across external shortlist clears',async()=>{
 class Elem{
  constructor(tag='div'){
   this.tagName=tag;this.dataset={};this.children=[];this.attrs={};this.events={};
   this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.scrolled=false;
  }
  appendChild(node){this.children.push(node);return node;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
  dispatchEvent(event){for(const handler of this.events[event.type]||[])handler(event);return true;}
  click(){this.dispatchEvent({type:'click'});}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  scrollIntoView(){this.scrolled=true;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){
   if(selector==='.save'&&this.save)return [this.save];
   const descendants=this.children.flatMap(x=>[x,...(typeof x.querySelectorAll==='function'?x.querySelectorAll(selector):[])]);
   if(selector==='[data-nearby-id]')return descendants.filter(x=>x.dataset?.nearbyId);
   if(selector==='.nearby-save-action')return descendants.filter(x=>x.className==='nearby-save-action');
   if(selector==='.nearby-map-action')return descendants.filter(x=>x.className==='nearby-map-action');
   return [];
  }
 }
 const elements=Object.fromEntries(['nearby-lab','nearby-origin','nearby-radius','nearby-status',
   'nearby-results','nearby-source-count','q','region','effort','access'].map(id=>[id,new Elem()]));
 const documentListeners={};
 const document={
  getElementById:id=>elements[id]||null,
  querySelectorAll:selector=>selector==='[data-fall][data-id]'?cards:[],
  createElement:tag=>new Elem(tag),
  addEventListener:(type,handler)=>(documentListeners[type]??=[]).push(handler),
  dispatchEvent:event=>{for(const handler of documentListeners[event.type]||[])handler(event);return true;}
 };
 class Event{constructor(type,options={}){this.type=type;this.bubbles=options.bubbles??false;}}
 const createCard=(id,name)=>{
  const card=new Elem('article');card.dataset={id,name,arrivalVerified:'verified',status:'verify',statusLabel:'Check conditions'};
  const save=new Elem('button');save.setAttribute('aria-pressed','false');card.save=save;
  save.addEventListener('click',()=>{
   save.setAttribute('aria-pressed',save.getAttribute('aria-pressed')==='true'?'false':'true');
   document.dispatchEvent(new Event('upfall:shortlist-updated'));
  });
  return card;
 };
 const cards=[createCard('wagner-falls','Wagner Falls'),createCard('miners-falls','Miners Falls')];
 const target=cards[1];target.hidden=true;
 const index={
  schemaVersion:1,method:'haversine-waterfall-coordinate-straight-line-not-driving',
  counts:{curated:74},reviewed:'2026-11-02',
  locations:[
   {id:'wagner-falls',name:'Wagner Falls',region:'Central U.P.',status:'verify',url:'/upper-peninsula-waterfalls/wagner-falls/',source:'https://www.michigan.gov/dnr'},
   {id:'miners-falls',name:'Miners Falls',region:'Pictured Rocks',status:'verify',url:'/upper-peninsula-waterfalls/miners-falls/',source:'https://www.nps.gov/piro'}
  ],
  nearby:{'wagner-falls':[{id:'miners-falls',miles:12.5}],'miners-falls':[{id:'wagner-falls',miles:12.5}]}
 };
 elements['nearby-radius'].value='25';
 elements.region.addEventListener('change',()=>{target.hidden=false;});
 const focused=[];
 const window={UPWaterfallFocus:id=>{if(cards.find(c=>c.dataset.id===id)?.hidden)return false;focused.push(id);return true;}};
 vm.runInNewContext(nearby,{document,window,Event,fetch:async()=>({ok:true,json:async()=>index})});
 await new Promise(resolve=>setImmediate(resolve));
 const result=elements['nearby-results'].querySelector('[data-nearby-id]');
 assert.ok(result,'nearby recommendation should render');
 const save=result.querySelector('.nearby-save-action');
 assert.equal(save.getAttribute('aria-pressed'),'false');
 assert.equal(save.textContent,'Save stop');
 save.click();
 assert.equal(cards[1].save.getAttribute('aria-pressed'),'true');
 assert.equal(save.getAttribute('aria-pressed'),'true');
 assert.equal(save.textContent,'Remove saved stop');
 save.click();
 assert.equal(cards[1].save.getAttribute('aria-pressed'),'false');
 assert.equal(save.textContent,'Save stop');
 cards[1].save.setAttribute('aria-pressed','true');
 document.dispatchEvent(new Event('upfall:shortlist-updated'));
 assert.equal(save.getAttribute('aria-pressed'),'true','external shortlist save must update nearby button');
 cards[1].save.setAttribute('aria-pressed','false');
 document.dispatchEvent(new Event('upfall:shortlist-updated'));
 assert.equal(save.getAttribute('aria-pressed'),'false','external clear must update nearby button');

 elements.q.value='Bond';
 elements.region.value='Western U.P.';
 elements.effort.value='moderate';
 elements.access.value='seasonal';
 target.hidden=true;
 result.querySelector('.nearby-map-action').click();
 assert.deepEqual(focused,['miners-falls'],'requested map destination must be shown');
 assert.equal(elements.q.value,'');
 assert.equal(elements.region.value,'all');
 assert.equal(elements.effort.value,'all');
 assert.equal(elements.access.value,'all');
 assert.match(elements['nearby-status'].textContent,/Map filters were cleared to display Miners Falls/);
});
