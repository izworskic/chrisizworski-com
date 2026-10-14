'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const BF=require('../lib/shorefeel/beach-forecast.js');
const beach={key:'b',name:'Test beach',cell:{j:10,i:10},ref:{j:11,i:10}};
const f2c=f=>(f-32)*5/9;
const grid=(refF,cellF)=>({'11,10':f2c(refF),'10,10':f2c(cellF)});
const level={kind:'satellite',tempF:60,observedAt:'2026-10-12T12:00:00.000Z'};
const lead=(h,refF,cellF)=>({leadH:h,startsAt:'x',grid:grid(refF,cellF)});

test('forecast = measured level + model change + capped shallow offset; model absolute is never used',()=>{
 const f=BF.beachForecast(beach,level,grid(70,70),[lead(0,70,70),lead(24,68,68)]);
 assert.equal(f.points[0].tempF,60);            // model says 70F but level is 60F: level wins
 assert.equal(f.points[1].tempF,58);            // -2F model change applied to the level
 assert.equal(f.shallowApplied,false);
});
test('shallow offset is capped at 2F and widens the range',()=>{
 const f=BF.beachForecast(beach,level,grid(60,60),[lead(0,60,70)]);
 assert.equal(f.points[0].shallowF,2);assert.equal(f.points[0].tempF,62);
 assert.equal(f.points[0].high-f.points[0].low,6); // half-width 2 + 1
 assert.equal(f.shallowApplied,true);
});
test('missing evidence returns null, never an estimate',()=>{
 assert.equal(BF.beachForecast(beach,null,grid(60,60),[lead(0,60,60)]),null);
 assert.equal(BF.beachForecast(beach,{tempF:NaN},grid(60,60),[lead(0,60,60)]),null);
 assert.equal(BF.beachForecast(beach,level,{},[lead(0,60,60)]),null);
 assert.equal(BF.beachForecast(beach,level,grid(60,60),[]),null);
 assert.equal(BF.beachForecast(beach,level,grid(60,60),[{leadH:0,grid:{}}]),null);
});
test('cooling tiers use the 24h change measured from now and match the backtest thresholds',()=>{
 const run=d=>BF.beachForecast(beach,level,grid(60,60),[lead(0,60,60),lead(24,60+d,60+d)]).cooling;
 assert.equal(run(-1.0),null);
 assert.equal(run(-1.6).tier,'watch');
 assert.equal(run(-3.2).tier,'sharp');
 assert.equal(run(+4),null);                      // no warming alert: backtest skill was weak
 assert.match(run(-1.6).text,/never missed/);
});
test('ranges follow backtest half-widths',()=>{
 const f=BF.beachForecast(beach,level,grid(60,60),[lead(0,60,60),lead(24,60,60),lead(48,60,60)]);
 assert.deepEqual(f.points.map(p=>p.high-p.low),[4,4,6]);
});
test('parseBox reads OPeNDAP ascii rows and drops fill values',()=>{
 const raw='Dataset {\n Float32 temp[time = 1][depth = 1][ny = 2][nx = 3];\n} x;\n---\ntemp.temp, [1][1][2][3]\n[0][0][0], 10, 11, -99999\n[0][0][1], 12, 1e30, 14\n';
 const g=BF.parseBox(raw,{j0:5,j1:6,i0:20,i1:22});
 assert.equal(g['5,20'],10);assert.equal(g['5,21'],11);assert.equal(g['6,22'],14);
 assert.equal(g['5,22'],undefined);assert.equal(g['6,21'],undefined);
 assert.deepEqual(BF.parseBox('<html>nope',{j0:0,j1:0,i0:0,i1:0}),{});
});
test('model cycle selection respects publication lag and builds the right URL',()=>{
 const c=BF.cycleCandidates(new Date('2026-10-14T02:00:00Z'));
 assert.equal(c[0].time.toISOString(),'2026-10-13T18:00:00.000Z');
 assert.equal(BF.cycleCandidates(new Date('2026-10-14T06:30:00Z'))[0].time.toISOString(),'2026-10-14T00:00:00.000Z');
 const r=BF.cycleFor(new Date('2026-10-12T12:00:00Z'));
 assert.equal(r.hour,0);
 assert.ok(r.url(r.hour).endsWith('/2026/10/12/lmhofs.t12z.20261012.regulargrid.f000.nc'));
 assert.equal(BF.boxQuery({j0:1,j1:2,i0:3,i1:4}),'.ascii?temp%5B0:0%5D%5B0:0%5D%5B1:2%5D%5B3:4%5D');
});
