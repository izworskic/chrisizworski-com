'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../lib/winter-hike-decision.cjs');
const seed=require('../data/winter-hike/michigan-dnr-candidates.json');
const now=Date.parse('2026-12-12T15:00:00Z');
const raw={ID:'trail-1',Title:'Sample trail',Latitude:44.7,Longitude:-84.6,LocationTypeTags:'Nonmotorized trail',ActivitiesTags:'Hiking, Snowshoeing',PageURL:'/recsearch/data/locations/trails-a-k/sample'};
const d=E.normalizePoint(raw);
const access={trail:'open',parking:'open',road:'open',managerConfirmed:true,checkedAt:'2026-12-12T14:00:00Z',sourceUrl:'https://www.michigan.gov/dnr/',winterSpecific:true};
const forecast={updatedAt:'2026-12-12T14:00:00Z',targetCovered:true,windMph:7,windChillF:15};
const snow={validAt:'2026-12-12T12:00:00Z',kind:'modeled',depthInches:8};
const run=(override={})=>E.interpret(d,{access,forecast,snow,...override},now);
test('official raw DNR candidate snapshot holds 40–70 research records',()=>assert.ok(seed.records.length>=40&&seed.records.length<=70));
test('snapshot has unique DNR IDs and bounded Michigan reference coordinates',()=>{
 assert.equal(new Set(seed.records.map(p=>p.ID)).size,seed.records.length);
 assert.ok(seed.records.every(p=>E.normalizePoint(p)));
 assert.ok(seed.records.every(p=>p.PageURL.startsWith('/recsearch/')));
 assert.ok(seed.records.every(p=>!('winterParking' in p)&&!('driveTime' in p)&&!('routeMiles' in p)));
});
test('snapshot spans all three Michigan latitude bands for research',()=>{
 assert.ok(seed.records.some(p=>p.Latitude>=45.75));
 assert.ok(seed.records.some(p=>p.Latitude>=44.3&&p.Latitude<45.75));
 assert.ok(seed.records.some(p=>p.Latitude<44.3));
});
test('normalization labels destination GPS as reference points, never parking',()=>{
 assert.equal(d.activities.snowshoe,true);assert.equal(d.winterParking,'unverified');
 assert.equal(d.routeMiles,null);assert.match(d.locationMeaning,/unverified/i);
});
test('rejects state parks, bogus GPS and non-trails',()=>{
 assert.equal(E.normalizePoint({...raw,LocationTypeTags:'State park'}),null);
 assert.equal(E.normalizePoint({...raw,Latitude:null}),null);
 assert.equal(E.normalizePoint({...raw,Longitude:-100}),null);
});
test('treats hiking and snowshoe activity permissions distinctly',()=>{
 assert.equal(E.normalizePoint({...raw,ActivitiesTags:'Hiking'}).activities.snowshoe,false);
 assert.equal(E.normalizePoint({...raw,ActivitiesTags:'Snowshoeing'}).activities.hike,false);
});
test('deduplicates by official DNR ID, not by title',()=>{
 assert.equal(E.buildInventory([raw,raw,{...raw,ID:'another'}]).length,2);
});
test('verified weather screening is not a guarantee of trail safety',()=>{
 const r=run();assert.equal(r.state,'candidate');assert.equal(r.activity,'snowshoe');
 assert.equal(r.confidence,'weather-screening-only');
});
test('an undated manager source is not verified winter access',()=>{
 const r=run({access:{trail:'open',parking:'open',road:'open'}});
 assert.equal(r.state,'verify');assert.equal(r.score,null);
});
test('stale manager validation blocks a positive result',()=>{
 assert.equal(run({access:{...access,checkedAt:'2026-11-30T00:00:00Z'}}).state,'verify');
});
test('no manager winter-specific access cannot become a recommendation',()=>{
 assert.equal(run({access:{...access,winterSpecific:false}}).state,'verify');
});
test('modeled bare snow can give a hiking fallback only on allowed trails',()=>{
 const r=run({snow:{...snow,depthInches:0}});assert.equal(r.activity,'hike');
 assert.match(r.reasons.join(' '),/boot hike/);
});
test('snowshoe-only request with bare snow is not promoted to hiking',()=>{
 const r=run({snow:{...snow,depthInches:0},activity:'snowshoe'});
 assert.equal(r.state,'verify');assert.equal(r.score,null);
});
test('missing and stale snow never equal zero',()=>{
 assert.equal(run({snow:{...snow,depthInches:null}}).state,'verify');
 assert.equal(run({snow:{...snow,validAt:'2026-12-07T00:00:00Z'}}).state,'verify');
 assert.equal(run({snow:{...snow,kind:'observed'}}).state,'verify');
});
test('missing and unscoped NWS forecast blocks candidates',()=>{
 assert.equal(run({forecast:{...forecast,updatedAt:'2026-12-10T12:00:00Z'}}).state,'verify');
 assert.equal(run({forecast:{...forecast,targetCovered:false}}).state,'verify');
});
test('manager closures and closed winter access exclude even in good snow',()=>{
 for(const key of ['trail','parking','road']){
  assert.equal(run({access:{...access,[key]:'closed'}}).state,'excluded');
 }
});
test('only confirmed matching closure geometry excludes a candidate',()=>{
 assert.equal(run({closure:{active:true,geometryVerified:true,matchesDestination:true}}).state,'excluded');
 const r=run({closure:{active:true,geometryVerified:false,matchesDestination:true}});
 assert.equal(r.state,'verify');assert.match(r.verification.join(' '),/geometry/);
});
test('severe warnings or extreme winter conditions put routine trip rankings on hold',()=>{
 assert.equal(run({forecast:{...forecast,alerts:['Blizzard Warning']}}).state,'weather-hold');
 assert.equal(run({forecast:{...forecast,freezingRain:true}}).state,'weather-hold');
 assert.equal(run({forecast:{...forecast,windChillF:-30}}).state,'weather-hold');
});
test('groomed ski tracks prevent a positive snowshoe recommendation until restrictions checked',()=>{
 const r=E.interpret({...d,groomedXC:true},{access,forecast,snow},now);
 assert.equal(r.state,'verify');assert.match(r.verification.join(' '),/groomed ski tracks/);
});
test('deep modeled snow does not promote a boot hike without a packing report',()=>{
 const r=run({activity:'hike',snow:{...snow,depthInches:15}});
 assert.equal(r.state,'verify');assert.equal(r.score,null);
});
test('ice risk reduces a provisional score without claiming observed ice',()=>{
 const base=run(),r=run({forecast:{...forecast,freezeThaw:true}});
 assert.ok(r.score<base.score);assert.match(r.reasons.join(' '),/not an observed/);
});
test('an excluded trail cannot outrank a candidate',()=>{
 const second=E.normalizePoint({...raw,ID:'b',Title:'B Trail'});
 const ranked=E.rankDestinations([d,second],{'trail-1':{access:{...access,trail:'closed'},snow,forecast},b:{access,snow,forecast}},'either',now);
 assert.equal(ranked[0].destination.id,'b');
});

test('legacy GIS path is not presented as a verified official public URL',()=>{
 assert.equal(d.officialPageCandidate,null);
 assert.equal(d.legacyPagePath,raw.PageURL);
});
const managerEvidence=require('../data/winter-hike/michigan-manager-evidence.json');
test('manager evidence preserves winter parking as unverified and records partial closure',()=>{
 assert.ok(managerEvidence.records.length>=3);
 assert.ok(managerEvidence.records.every(r=>r.winterParking.status==='unverified'));
 const x=managerEvidence.records.find(r=>r.id==='090650cb-9a90-4507-92c0-7520eca49af7');
 assert.equal(x.trailStatus,'partially-closed');
 assert.equal(run({access:{...access,trail:'partial-closure'}}).state,'verify');
});
