'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const plantNow=require('../lib/plant-now/index.js'),kit=globalThis.GardenKit,frost=globalThis.MIFrost;
const harvest=require('../public/assets/garden-tools/garden-harvest.js'),history=require('../public/assets/garden-tools/garden-history.js'),S=require('../public/assets/garden-tools/garden-succession.js');
const archive=require('../public/assets/garden-tools/garden-daymet-2021-2025.json');
const planting={date:'2026-05-25',siteId:'bay-city',productivity:{group:'tomatoes',closedOn:'2026-07-14'}};
const base={plantNow,kit,frost,harvest,history,archive,planting,availableDate:'2026-07-15',bufferDays:14,bedFree:true,previousCrop:'tomatoes'};
const candidate=(cropId,packetDays,modelId=null)=>({cropId,packetDays,modelId});
test('reuse station and fall plan, rank shorter crops, rotation and packet unknown',()=>{
 const r=S.evaluate({...base,candidates:[candidate('radishes',30),candidate('lettuce',80),candidate('beans',null)]});
 const rad=r.rows.find(x=>x.cropId==='radishes');assert.equal(rad.frostDate,'2026-10-03');assert.equal(rad.deadline,'2026-09-19');assert.equal(rad.packetDate,'2026-08-14');assert.equal(rad.status,'CALENDAR_FITS');
 assert.equal(r.rows[0].cropId,'radishes');assert.equal(r.rows.find(x=>x.cropId==='lettuce').status,'SHORT_WINDOW');assert.equal(r.rows.find(x=>x.cropId==='beans').status,'PACKET_NEEDED');
 assert.equal(S.evaluate({...base,candidates:[candidate('tomatoes',30)]}).rows[0].rotation,'SAME_FAMILY');
});
test('bed overlap, season boundary, mismatched models and unsupported packet dates fail closed',()=>{
 const candidates=[candidate('radishes',30)];
 assert.equal(S.evaluate({...base,bedFree:false,candidates}).rows[0].status,'BED_NOT_CONFIRMED');
 assert.equal(S.evaluate({...base,availableDate:'2026-07-14',candidates}).rows[0].status,'BED_NOT_CONFIRMED');
 assert.equal(S.evaluate({...base,availableDate:'2026-11-24',candidates}).rows[0].status,'PAST_FROST_REFERENCE');
 assert.equal(S.evaluate({...base,availableDate:'2027-01-15',candidates}).rows[0].status,'OUTSIDE_OUTDOOR_SEASON');
 assert.throws(()=>S.evaluate({...base,candidates:[candidate('radishes',30,'big-beef')]}));
 assert.throws(()=>S.evaluate({...base,candidates:[candidate('beans',0)]}));
});
test('exact historical heat replay uses cutoff, more buffer never improves fit',()=>{
 const candidates=[candidate('beans',50,'provider')];
 const r=S.evaluate({...base,candidates}),s=S.evaluate({...base,candidates,bufferDays:30});
 assert.equal(r.rows[0].thermal.years.length,5);assert.ok(s.rows[0].thermal.count<=r.rows[0].thermal.count);
 assert.equal(S.evaluate({...base,archive:null,candidates}).rows[0].thermal,null);
 for(const siteId of Object.keys(S.stationIds)){const p={...planting,siteId};assert.equal(S.evaluate({...base,planting:p,candidates}).rows[0].thermal.years.length,5);}
});
