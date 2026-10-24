'use strict';
// Runs actual application event handlers with a minimal DOM. No browser, tiles or network.
const fs=require('node:fs'),vm=require('node:vm');
const model=require('../../public/assets/freighter-layup-model.js');
const registry=JSON.parse(fs.readFileSync('public/assets/freighter-layup-registry.json','utf8'));
const bios=JSON.parse(fs.readFileSync('public/assets/freighter-vessel-biographies.json','utf8'));
async function fixture({url='https://chrisizworski.com/great-lakes-freighter-winter-layup/',failures=0,stallBios=false}={}){
 const all=[],nodes=new Map(),listeners={};let active=null;
 class Node{
  constructor(tag='div',attrs={}){this.tagName=tag;this.attrs={};this.dataset={};this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';all.push(this);for(const [k,v]of Object.entries(attrs))this.setAttribute(k,v);}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='id'){this.id=v;nodes.set(v,this);}if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  append(...items){for(const n of items){n.parent=this;this.children.push(n);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  addEventListener(k,fn){this.listeners[k]=fn;}
  focus(){active=this;}scrollIntoView(){this.scrolled=true;}remove(){this.removed=true;}
  get innerHTML(){return this.html||'';}
  set innerHTML(s){this.html=s;this.children=[];for(const m of s.matchAll(/<(button|a|span|p)\b([^>]*)>([^]*?)<\/\1>/g)){
   const attrs={};for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];
   const n=new Node(m[1],attrs);n.textContent=m[3].replace(/<[^>]+>/g,'');this.append(n);
  }}
  matches(selector){if(selector==='a'||selector==='button')return this.tagName===selector;
   const a=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);if(a)return a[2]===undefined?a[1] in this.attrs:this.attrs[a[1]]===a[2];
   if(selector.startsWith('.'))return (this.attrs.class||'').split(' ').includes(selector.slice(1));return false;}
  querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  closest(s){return this.matches(s)?this:this.parent?.closest(s);}
 }
 const get=id=>{if(!nodes.has(id))new Node('div',{id});return nodes.get(id);};
 const html=fs.readFileSync('public/great-lakes-freighter-winter-layup/index.html','utf8');
 for(const m of html.matchAll(/id="([^"]+)"/g))get(m[1]);
 get('atlas-controls').disabled=true;get('layup-map').append(new Node('div',{class:'map-loading'}));
 for(const i of [0,1,2])new Node('button',{'data-work-step':String(i)});
 const location={href:url},entries=[url];let position=0,requests=0;
 const history={pushState(_a,_b,u){entries.splice(++position);entries.push(String(u));location.href=String(u);},replaceState(_a,_b,u){entries[position]=String(u);location.href=String(u);}};
 const document={readyState:'loading',getElementById:get,createElement:t=>new Node(t),createElementNS:(_ns,t)=>new Node(t),querySelectorAll:s=>all.filter(n=>n.matches(s)),addEventListener:(k,f)=>listeners[k]=f};
 const window={FreighterLayupModel:model,addEventListener:(k,f)=>listeners[k]=f};
 const ctx={document,window,location,history,URL,Date,AbortSignal,matchMedia:()=>({matches:true}),navigator:{},fetch:async u=>{
  if(u.includes('biographies'))return stallBios?new Promise(()=>{}):{ok:true,json:async()=>bios};
  requests++;return requests<=failures?{ok:false}:{ok:true,json:async()=>structuredClone(registry)};
 }};
 vm.runInNewContext(fs.readFileSync('public/assets/freighter-layup.js','utf8'),ctx);listeners.DOMContentLoaded();
 const settle=()=>new Promise(r=>setImmediate(r));await settle();
 const event=async(id,type,value)=>{if(value!==undefined)get(id).value=value;get(id).listeners[type]({target:get(id)});await settle();};
 const click=async(id,attrs)=>{const n=attrs?new Node('button',attrs):get(id);get(id).listeners.click({target:n});await settle();};
 return {get,model,registry,location,entries,event,click,focused:()=>active,requests:()=>requests,
  ship:async id=>click('ship-grid',{'data-ship':id}),back:async()=>{if(position){location.href=entries[--position];listeners.popstate();await settle();}},
  forward:async()=>{if(position+1<entries.length){location.href=entries[++position];listeners.popstate();await settle();}},
  read:()=>model.readState(registry,location.href),settle};
}
module.exports={fixture};
