import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/assets/frozen-lighthouse-watch.js',import.meta.url),'utf8');
async function render(data,status=200){
 const nodes=new Map(),events=[];
 const node=()=>({textContent:'',style:{setProperty(){}},append(){},replaceChildren(){},setAttribute(){},addEventListener(){}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,createTextNode:node};
 vm.runInNewContext(source,{document,window:{dispatchEvent:e=>events.push(e.type)},Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type){this.type=type;}},fetch:async()=>({ok:status===200,json:async()=>data}),Intl,Date});
 await new Promise(r=>setImmediate(r));
 return {events,headline:nodes.get('current-verdict').textContent,checked:nodes.get('feed-time').textContent};
}
const pier={id:'fixture',name:'Fixture Light',town:'Fixture',lightList:'1',available:false,hours:[],best:null,windows:[],water:null,ice:{coverage:'missing'},alerts:{status:'unavailable',events:[]}};
test('old, future, malformed and unavailable lighthouse packets cannot dispatch ready',async()=>{
 for(const generatedAt of [new Date(Date.now()-91*60000).toISOString(),new Date(Date.now()+60000).toISOString(),'unknown',null]){
  const x=await render({generatedAt,piers:[pier]});
  assert.deepEqual(x.events,['frozen-lighthouse-failed']);
  assert.match(x.headline,/cannot reach/i);
 }
 const x=await render({},503);assert.deepEqual(x.events,['frozen-lighthouse-failed']);
});
test('recent partial forecast packet still reaches the desk without an all-clear',async()=>{
 const x=await render({generatedAt:new Date(Date.now()-60*60000).toISOString(),piers:[pier]});
 assert.deepEqual(x.events,['frozen-lighthouse-ready']);assert.match(x.headline,/cannot make a reliable/i);assert.match(x.checked,/Weather checked/);
});
