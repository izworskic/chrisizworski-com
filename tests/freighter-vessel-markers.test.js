'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/assets/freighter-tracker.js','utf8');
const part=source.slice(source.indexOf('  function vesselShape('),source.indexOf('  function vesselMatchesSearch('));
const context={L:{divIcon:o=>o}};vm.createContext(context);vm.runInContext(part,context);
test('AIS types produce distinct broad silhouettes and size follows reported length',()=>{
 for(const [type,kind] of [[70,'cargo'],[80,'tanker'],[60,'passenger'],[31,'tug'],[52,'tug'],[30,'fishing'],[null,'other']]){
  const icon=context.shipIcon({shipType:type,lengthMeters:100,speedKnots:1});assert.match(icon.className,new RegExp('type-'+kind));assert.match(icon.html,/<svg/);assert.equal(icon.iconSize[0],38);
 }
 for(const [length,size,width] of [[250,'large',46],[100,'medium',38],[25,'small',30],[null,'unknown',34]]){const icon=context.shipIcon({shipType:70,lengthMeters:length,speedKnots:null});assert.match(icon.className,new RegExp('size-'+size));assert.match(icon.className,/is-unknown/);assert.equal(icon.iconSize[0],width)}
 assert.match(context.shipIcon({speedKnots:0,shipType:null,lengthMeters:null}).className,/is-stopped/);
 assert.match(context.shipIcon({speedKnots:3,shipType:null,lengthMeters:null}).className,/is-moving/);
});
