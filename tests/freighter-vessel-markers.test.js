'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/assets/freighter-tracker.js','utf8');
const part=source.slice(source.indexOf('  function vesselShape('),source.indexOf('  function vesselMatchesSearch('));
const context={L:{divIcon:o=>o}};vm.createContext(context);vm.runInContext(part,context);
test('AIS types produce distinct broad silhouettes and size follows reported length',()=>{
 for(const [type,kind] of [[70,'cargo'],[80,'tanker'],[60,'passenger'],[31,'tug'],[52,'tug'],[30,'fishing'],[null,'other']]){
  const icon=context.shipIcon({shipType:type,lengthMeters:100,speedKnots:1});assert.match(icon.className,new RegExp('type-'+kind));assert.match(icon.html,/<svg/);assert.equal(icon.iconSize[0],50);
 }
 for(const [length,size,width] of [[250,'large',60],[100,'medium',50],[25,'small',40],[null,'unknown',44]]){const icon=context.shipIcon({shipType:70,lengthMeters:length,speedKnots:null});assert.match(icon.className,new RegExp('size-'+size));assert.match(icon.className,/is-unknown/);assert.equal(icon.iconSize[0],width)}
 assert.match(context.shipIcon({speedKnots:0,shipType:null,lengthMeters:null}).className,/is-stopped/);
 assert.match(context.shipIcon({speedKnots:3,shipType:null,lengthMeters:null}).className,/is-moving/);
});

const fleetPart=source.slice(source.indexOf('  function fleetCounts('),source.indexOf('  function updateHubFleet('));
vm.runInContext(fleetPart,context);
test('Fleet counts partition the exact candidate reports and match marker classifications',()=>{
 const reports=[70,79,80,31,52,60,30,null,37].map((shipType,i)=>({mmsi:i,shipType,lengthMeters:null,speedKnots:null}));
 const counts=context.fleetCounts(reports);
 assert.equal(counts.all,9);
 assert.deepEqual({...counts},{all:9,cargo:2,tanker:1,tug:2,passenger:1,fishing:1,other:2});
 for(const kind of ['cargo','tanker','tug','passenger','fishing','other']){
  const result=context.filterFleet(reports,kind);
  assert.equal(result.length,counts[kind]);
  assert.ok(result.every(v=>context.shipIcon(v).className.includes('type-'+kind+' ')));
 }
 assert.equal(context.filterFleet(reports,'all'),reports);
 assert.equal(reports.length,9);
 assert.equal(context.fleetCounts([]).all,0);
 assert.equal(context.filterFleet(reports,'not-a-type').length,0);
});
