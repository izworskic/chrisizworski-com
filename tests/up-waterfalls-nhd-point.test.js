import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('data/up-waterfall-nhd-point-audit.json','utf8'));
const g=JSON.parse(fs.readFileSync('public/assets/up-waterfalls-geography.json','utf8'));
const script=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
test('USGS NHD 2026 waterfall point audit preserves distinct research-only provenance',()=>{
 assert.equal(a.source,'USGS The National Map NHD Point (FTYPE=487 waterfall)');
 assert.equal(a.publication,'research-only');
 assert.equal(a.stats.regionalPointRecords,97);
 assert.equal(a.stats.named,30);
 assert.equal(a.stats.unnamed,67);
 assert.equal(new Set(a.points.map(p=>p.objectId)).size,97);
 assert.ok(a.points.every(p=>p.ftype===487&&p.recordType.includes('not-certified-Michigan')));
 assert.ok(a.warning.includes('never generates pages'));
});
test('crosscheck only publishes agreement within 250 m and rejects same-name distant falls',()=>{
 const close=a.matches.filter(x=>x.quality==='agreement-within-250m');
 assert.equal(close.length,20);
 assert.ok(close.every(x=>x.distanceMeters<=250&&x.publication==='research-only'));
 assert.equal(a.matches.filter(x=>x.quality==='review-251-to-1000m').length,2);
 assert.equal(a.matches.filter(x=>x.quality==='reject-distant-namesake').length,2);
 assert.ok(a.matches.some(x=>x.usgsName==='Silver Falls'&&x.distanceMeters>100000&&x.quality==='reject-distant-namesake'));
 assert.ok(a.matches.some(x=>x.usgsName==='Cascade Falls'&&x.distanceMeters>300000&&x.quality==='reject-distant-namesake'));
 const attached=g.points.filter(p=>p.nhdPointEvidence);
 assert.equal(attached.length,20);
 const byGis=new Map(close.map(x=>[x.stateGisObjectId,x]));
 for(const p of attached){const m=byGis.get(p.oid);assert.ok(m);assert.equal(p.nhdPointEvidence.objectId,m.nhdObjectId);assert.equal(p.nhdPointEvidence.distanceMeters,m.distanceMeters);assert.equal(p.nhdPointEvidence.accessVerified,false)}
 assert.ok(!attached.some(p=>p.oid===110));
 assert.match(script,/National Hydrography Dataset/);
 assert.match(script,/NOT proof of legal public access/);
});
