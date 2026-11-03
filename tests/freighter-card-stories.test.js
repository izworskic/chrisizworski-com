const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('public/assets/freighter-tracker.js','utf8');
const catalog=JSON.parse(fs.readFileSync('public/assets/freighter-card-stories.json','utf8'));
const source=js.slice(js.indexOf('  function normalizedShipName('),js.indexOf('  function renderStory('));
const ctx={};vm.runInNewContext(source,ctx);
test('identity requires both current reviewed MMSI and matching AIS name',()=>{
 const now=Date.parse('2026-11-04T00:00:00Z');
 assert.equal(ctx.storyFor(catalog,{mmsi:'366904950',name:'LEE A. TREGURTHA'},now).imo,'5385625');
 assert.equal(ctx.storyFor(catalog,{mmsi:'366904950',name:'OTHER VESSEL'},now),null);
 assert.equal(ctx.storyFor(catalog,{mmsi:'000000000',name:'LEE A. TREGURTHA'},now),null);
 assert.equal(ctx.storyFor(catalog,{mmsi:'366904950',name:'LEE A. TREGURTHA'},Date.parse('2027-06-01')),null);
 assert.equal(ctx.storyFor({...catalog,stories:[catalog.stories[0],catalog.stories[0]]},{mmsi:'366904950',name:'LEE A. TREGURTHA'},now),null);
});
test('each story has corroboration, a local image, provenance and local history',()=>{
 const ids=new Set();for(const s of catalog.stories){assert.ok(!ids.has(s.mmsi));ids.add(s.mmsi);assert.equal(s.identitySources.length,2);assert.ok(fs.existsSync('public'+s.image));assert.ok(fs.existsSync('public'+s.storyUrl+'index.html'));assert.ok(s.historySource.startsWith('https://'));assert.ok(s.photoSource.startsWith('https://'));assert.ok(s.photoCredit&&s.imageAlt);}
});
