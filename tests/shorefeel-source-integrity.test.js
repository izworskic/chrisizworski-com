'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {decode}=require('../lib/shorefeel/nearshore-noaa.js');
const beach={lat:44,lon:-85},now=new Date('2026-07-15T12:00:00Z');
const header='time,latitude,longitude,sst\nUTC,degrees_north,degrees_east,degree_C\n';
const row=(stamp,lat,temp)=>[stamp,lat,-85,temp].join(',');
const fresh='2026-07-15T11:00:00Z';
const csv=(...rows)=>header+rows.join('\n');
test('source freshness is checked before selecting nearest water pixel',()=>{
 for(const bad of ['2026-07-13T23:00:00Z','2026-07-15T12:30:00Z']){
  const result=decode(csv(row(bad,44.001,10),row(fresh,44.01,20)),beach,now);
  assert.equal(result?.tempF,68);
  assert.equal(result?.observedAt,'2026-07-15T11:00:00.000Z');
 }
 assert.equal(decode(csv(row('2026-07-14T00:00:00Z',44.01,20)),beach,now)?.tempF,68);
 assert.equal(decode(csv(row('2026-07-13T23:59:59Z',44.01,20)),beach,now),null);
 assert.equal(decode(csv(row('2026-07-15T12:00:00Z',44.01,20)),beach,now)?.tempF,68);
});
test('unknown units, missing units, local time and impossible dates are not water evidence',()=>{
 const valid=csv(row(fresh,44.01,20));
 for(const unit of ['degree_F','kelvin',''])assert.equal(decode(valid.replace('degree_C',unit),beach,now),null);
 assert.equal(decode(valid.replace('degrees_east','degrees_west'),beach,now),null);
 assert.equal(decode(valid.replace('UTC,degrees_north,degrees_east,degree_C\n',''),beach,now),null);
 for(const stamp of ['2026-07-15T11:00:00','2026-07-15T12:00:01Z','2026-07-14T24:00:00Z']){
  assert.equal(decode(csv(row(stamp,44.01,20)),beach,now),null);
 }
});
test('conflicting duplicates are quarantined; exact duplicates and valid independent pixels survive',()=>{
 const a=row(fresh,44.001,10),b=row(fresh,44.001,20),c=row(fresh,44.01,15);
 assert.equal(decode(csv(a,b),beach,now),null);
 assert.equal(decode(csv(a,a),beach,now)?.tempF,50);
 for(const rows of [[a,b,c],[c,b,a],[b,a,c]])assert.equal(decode(csv(...rows),beach,now)?.tempF,59);
});
test('seeded source integrity properties: invalid nearest pixels cannot hide valid water',()=>{
 let seed=0x5a17fe01;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<256;i++){
  const value=Math.floor(rand()*37)-1;
  const good=row(fresh,44.01+rand()*.01,value);
  const bad=[row('2026-07-13T23:59:59Z',44.001,10),
    row('2026-07-15T12:00:01Z',44.002,12),row(fresh,44.003,'NaN'),
    row(fresh,44.004,-9999),row(fresh,44.005,''),
    row(fresh,44.006,5),row(fresh,44.006,6),row(fresh,44.2,22)];
  const rows=[good,...bad];
  for(let j=rows.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[rows[j],rows[k]]=[rows[k],rows[j]];}
  const result=decode(csv(...rows),beach,now);
  assert.equal(result?.tempF,Math.round((value*9/5+32)*10)/10,'case '+i);
  assert.equal(result?.observedAt,'2026-07-15T11:00:00.000Z','case '+i);
  assert.ok(result.distanceKm>0&&result.distanceKm<=4);
 }
});
