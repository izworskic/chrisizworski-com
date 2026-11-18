'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const policy=require('../public/assets/rideau-skateway-policy.js');
const archive=require('../data/rideau-skateway/official-sections-v1.json');
const load=()=>archive.sections.map(x=>({attributes:{ID:x.id,From_:x.from,To_:x.to,Length_KM:x.km+' km',Status:'Good'}}));
const fresh=new Date('2027-01-21T15:00:00Z'),ts=Date.parse('2027-01-21T11:00:00Z');
const meta={editingInfo:{dataLastEditDate:ts}};
function res(features=load(),metadata=meta,when=fresh){return policy.assess(archive,metadata,{features},when)}
test('audited NCC topology, exact source mirroring and positional meaning',()=>{
 assert.equal(archive.sections.length,14);
 assert.deepEqual(archive.sections.map(x=>x.id),Array.from({length:14},(_,i)=>i+1));
 assert.equal(fs.readFileSync('data/rideau-skateway/official-sections-v1.json','utf8'),fs.readFileSync('public/assets/rideau-skateway-sections.json','utf8'));
 assert.ok(archive.positionMeaning.includes('not entry'));
 assert.equal(archive.sourceLastEditUtc,'2026-03-05T03:02:37.286Z');
 assert.equal(archive.license,'Open Government Licence - Canada');
});
test('fresh official source statuses may be displayed but are not a safety promise',()=>{
 const r=res();
 assert.equal(r.verified,true);
 assert.equal(r.state,'current');
 assert.equal(r.totals.reportedOpenSections,14);
 assert.equal(r.totals.reportedOpenKm,archive.sections.reduce((s,x)=>s+x.km,0).toFixed(2)*1);
 assert.equal(policy.select(r,1).labelStatus,'Good');
 assert.match(r.reason,/not an independent ice-safety judgment/);
});
test('stale, off-season, future timestamps, missing data and unknown IDs fail closed',()=>{
 for(const [metadata,date] of [[{editingInfo:{dataLastEditDate:ts-2*86400000}},fresh],[meta,new Date('2027-05-12T15:00:00Z')],[{editingInfo:{dataLastEditDate:ts+86400000}},fresh],[null,fresh]]){
  let x=res(load(),metadata,date);assert.equal(x.verified,false);assert.equal(x.totals.reportedOpenSections,null);assert.ok(x.sections.every(s=>s.status===null));
 }
 const partial=res(load().slice(0,13));assert.equal(partial.state,'partial');assert.equal(partial.verified,false);
 const duplicate=load();duplicate[0].attributes.ID=2;assert.equal(res(duplicate).state,'partial');
 const bad=load();bad[7].attributes.Status='Current snow prediction';assert.equal(res(bad).state,'partial');
 const rename=load();rename[1].attributes.From_='An invented access';assert.equal(res(rename).state,'partial');
});
test('source distinguishes open ice from walking-only, snow and closed',()=>{
 const f=load();f[0].attributes.Status='Poor';f[1].attributes.Status='Walking Only (Skateway closed) ';f[2].attributes.Status='Snow Covered';f[3].attributes.Status='Closed';
 const r=res(f);assert.equal(r.verified,true);assert.equal(r.totals.reportedOpenSections,11);
 assert.equal(r.sections[0].skatingReportedOpen,true);
 assert.equal(r.sections[1].skatingReportedOpen,false);
 assert.equal(r.sections[2].skatingReportedOpen,false);
 assert.equal(r.sections[3].skatingReportedOpen,false);
 assert.equal(policy.normalizeStatus('Walking Only (Skateway closed) '),'Walking Only (Skateway closed)');
});
test('selected section is stable, not an entrance or track location',()=>{
 const r=res();assert.equal(policy.select(r,11).id,11);
 assert.equal(policy.select(r,900).id,1);
 const entrances=[{name:'Bronson',googleSearch:'https://www.google.com/maps/search/?api=1&query=Bronson'}];
 assert.equal(policy.entrancesFor(11,entrances)[0].name,'Bronson');
 assert.deepEqual(policy.entrancesFor(8,entrances),[]);
});
test('static page keeps NCC status truth, rights and 14 usable source-linked sections',()=>{
 const h=fs.readFileSync('public/rideau-canal-skateway/index.html','utf8');
 assert.ok(h.includes('noindex,follow'));
 assert.ok(h.includes('https://ncc-ccn.gc.ca/places/skateway-ice-conditions'));
 assert.ok(h.includes('Open Government Licence'));
 assert.ok(h.includes('Credit: Ahunt'));
 assert.ok(h.includes('id="static-sections"'));
 assert.ok(h.includes('id="section-list"'));
 assert.ok(h.includes('/assets/rideau-skateway-policy.js'));
 assert.ok(h.includes('id="skateway-map"'));
 assert.ok(!h.includes(String.fromCharCode(8212)));
});
