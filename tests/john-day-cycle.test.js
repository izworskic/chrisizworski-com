'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(reduced=false){
 const els=new Map(),events={};let nextFrame=null,cancelled=false;
 const get=id=>{if(!els.has(id))els.set(id,{value:id==='passageDirection'?'up':'0',attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.listeners[k]=f}});return els.get(id)};
 const window={johnDaySetPassage:step=>window.johnDayRenderCycle?.([0,.18,.30,.70,1][step])};
 const doc={hidden:false,getElementById:get,addEventListener(k,f){events[k]=f}};
 vm.runInNewContext(fs.readFileSync('public/assets/john-day-cycle.js','utf8'),{document:doc,window,matchMedia:()=>({matches:reduced}),requestAnimationFrame:f=>{nextFrame=f;return 1},cancelAnimationFrame(){cancelled=true}});
 return {get,events,doc,act:(id,k='click')=>get(id).listeners[k](),tick:now=>nextFrame(now),cancelled:()=>cancelled};
}
test('scrubbing moves the tow, water and gates through a reversible deterministic sequence',()=>{
 const f=fixture();f.get('cycleProgress').value='500';f.act('cycleProgress','input');
 assert.equal(f.get('cycleWater').attrs.y,235);assert.match(f.get('cycleShip').attrs.transform,/425.0 235.0/);
 assert.equal(f.get('cycleLowerGate').attrs.y,190);assert.equal(f.get('cycleUpperGate').attrs.y,150);
 f.get('cycleProgress').value='1000';f.act('cycleProgress','input');assert.match(f.get('cycleShip').attrs.transform,/810.0 150.0/);
 f.get('passageDirection').value='down';f.act('passageDirection','change');assert.match(f.get('cycleShip').attrs.transform,/810.0 150.0/);
 f.get('cycleProgress').value='1000';f.act('cycleProgress','input');assert.match(f.get('cycleShip').attrs.transform,/60.0 320.0/);
});
test('play advances the animation and hidden pages stop it; reduced motion steps without a timer',()=>{
 const f=fixture();f.act('cyclePlay');for(let now=100;now<3000;now+=100)f.tick(now);
 assert.ok(Number(f.get('cycleProgress').value)>0);f.doc.hidden=true;f.events.visibilitychange();
 assert.equal(f.get('cyclePlay').attrs['aria-pressed'],'false');assert.equal(f.cancelled(),true);
 const r=fixture(true);r.act('cyclePlay');assert.match(r.get('cycleLabel').textContent,/Reduced motion/);r.act('cyclePlay');r.act('cyclePlay');r.act('cyclePlay');assert.equal(r.get('cycleProgress').value,1000);
});
