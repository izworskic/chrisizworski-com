'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {cluster,temperature}=require('../public/assets/shorefeel-map-geometry.js');
test('screen-space clusters preserve all records and never overlap marker anchors',()=>{
 const input=Array.from({length:1050},(_,i)=>({x:(i*37)%450,y:(i*83)%340,id:i}));
 const groups=cluster(input);
 assert.equal(groups.flatMap(g=>g.members).length,input.length);
 assert.equal(new Set(groups.flatMap(g=>g.members.map(x=>x.id))).size,input.length);
 for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)
  assert.ok(Math.hypot(groups[i].x-groups[j].x,groups[i].y-groups[j].y)>=68);
 for(const g of groups)assert.ok(g.members.every(p=>Math.hypot(p.x-g.x,p.y-g.y)<68));
});
test('coincident distinct beach records remain selectable within one group',()=>{
 const points=[{x:20,y:20,id:'A'},{x:20,y:20,id:'B'},{x:89,y:20,id:'C'}];
 const groups=cluster(points);
 assert.equal(groups.length,2);
 assert.deepEqual(groups[0].members.map(p=>p.id),['A','B']);
});
test('temperature marker shows only a current source period, not upcoming or expired values',()=>{
 const t=Date.parse('2026-11-24T12:30:00Z');
 const row={status:'forecast-based',feelsLikeF:32,validAt:'2026-11-24T12:00:00Z',validUntil:'2026-11-24T13:00:00Z'};
 assert.equal(temperature(row,t),32);
 assert.equal(temperature({...row,feelsLikeF:0},t),0);
 assert.equal(temperature(row,t+3600000),null);
 assert.equal(temperature({...row,status:'upcoming'},t),null);
 assert.equal(temperature({...row,validAt:'2026-11-24T13:00:00Z'},t),null);
 assert.equal(temperature({...row,feelsLikeF:null},t),null);
 assert.equal(temperature(null,t),null);
});
