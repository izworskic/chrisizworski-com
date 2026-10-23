'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Exercise actual browser event handlers with a minimal DOM, independent of upstream APIs.
function fixture(){
 const elements=new Map();
 function element(){return {value:'0',style:{},children:[],attrs:{},listeners:{},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){(this.listeners[k]??=[]).push(f)},textContent:'',className:''}}
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 get('passageDirection').value='up';get('passageTrack').children=Array.from({length:5},element);
 const doc={getElementById:get,querySelectorAll:()=>[],createElement:element,createElementNS:element,createTextNode:t=>({textContent:t})};
 vm.runInNewContext(fs.readFileSync('public/assets/john-day-lock.js','utf8'),{document:doc,window:{},Intl,Date,URLSearchParams,AbortSignal,fetch:async()=>{throw Error('offline')}});
 return {get,act:(id,event='click')=>{for(const f of get(id).listeners[event]||[])f()}};
}
test('five upstream stages reach upper water, bound navigation and reset',()=>{
 const {get,act}=fixture();assert.equal(get('passageBack').disabled,true);assert.equal(get('lift').value,10);
 for(let i=0;i<4;i++)act('passageNext');
 assert.match(get('passageTitle').textContent,/Leave at the upper/);assert.equal(get('lift').value,95);assert.equal(get('passageNext').disabled,true);
 act('passageNext');assert.match(get('passageCount').textContent,/Step 5/);
 act('passageReset');assert.equal(get('lift').value,10);assert.match(get('passageCount').textContent,/Step 1/);
});
test('downstream reverses water movement and manual control leaves narrative mode',()=>{
 const {get,act}=fixture();get('passageDirection').value='down';act('passageDirection','change');assert.equal(get('lift').value,95);
 for(let i=0;i<3;i++)act('passageNext');assert.equal(get('lift').value,10);assert.match(get('passageTitle').textContent,/Descend/);
 get('lift').value='50';act('lift','input');assert.match(get('passageCount').textContent,/Free exploration/);
 assert.ok(get('passageTrack').children.every(el=>!el.attrs['aria-current']));
 act('passageReset');assert.equal(get('lift').value,95);assert.match(get('passageCount').textContent,/Step 1/);
});

test('approach and departure place the vessel outside, while chamber stages and manual exploration put it inside',()=>{
 for(const direction of ['up','down']){
  const {get,act}=fixture();get('passageDirection').value=direction;act('passageDirection','change');
  assert.equal(get('boatShape').hidden,true);assert.equal(get('passageOutside').hidden,false);
  assert.equal(get('passageOutside').style.left,direction==='up'?'3%':'77%');
  act('passageNext');assert.equal(get('boatShape').hidden,false);assert.equal(get('passageOutside').hidden,true);
  for(let i=0;i<3;i++)act('passageNext');
  assert.equal(get('boatShape').hidden,true);assert.equal(get('passageOutside').hidden,false);
  assert.equal(get('passageOutside').style.left,direction==='up'?'77%':'3%');
  act('fillBtn');assert.equal(get('boatShape').hidden,false);assert.equal(get('passageOutside').hidden,true);
 }
});
