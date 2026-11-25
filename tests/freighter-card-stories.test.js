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
 const ids=new Set();for(const s of catalog.stories){assert.ok(!ids.has(s.mmsi));ids.add(s.mmsi);assert.equal(s.identitySources.length,2);if(s.image){assert.ok(fs.existsSync('public'+s.image));assert.ok(s.photoSource.startsWith('https://'));assert.ok(s.photoCredit&&s.imageAlt);}else{assert.equal(s.photoCredit,undefined);assert.equal(s.photoSource,undefined);}if(s.storyUrl.startsWith('/'))assert.ok(fs.existsSync('public'+s.storyUrl+'index.html'));else assert.equal(s.storyUrl,s.historySource);assert.ok(s.historySource.startsWith('https://'));assert.ok(s.specs.source.startsWith('https://www.interlakesteamship.com/our-fleet/'));assert.ok(s.specs.lengthFeet>0&&s.specs.capacityGrossTons>0&&s.specs.built>1900);assert.ok(s.lookFor&&s.displayName);}
});

test('Expanded catalog preserves strict identity, dated reviews and exact profile ownership',()=>{
 assert.equal(catalog.stories.length,8);
 const now=Date.parse('2026-11-25T00:00:00Z');
 for(const s of catalog.stories){assert.equal(ctx.storyFor(catalog,{mmsi:s.mmsi,name:s.displayName},now).imo,s.imo);assert.equal(ctx.storyFor(catalog,{mmsi:s.mmsi,name:'WRONG NAME'},now),null);}
 const paul=catalog.stories.find(s=>s.mmsi==='366904940');assert.equal(paul.specs.lengthFeet,1013.5);assert.equal(paul.specs.capacityGrossTons,68000);assert.equal(ctx.storyFor(catalog,{mmsi:paul.mmsi,name:paul.aisName},Date.parse('2026-11-03')),null);
 assert.equal(ctx.storyFor(catalog,{mmsi:'366904950',name:''},now),null);
 const hub=fs.readFileSync('public/freighters/index.html','utf8');for(const s of catalog.stories){assert.ok(hub.includes('data-library-mmsi="'+s.mmsi+'"'));assert.ok(hub.includes('data-hub-find-ship="'+s.mmsi+'"'));assert.ok(hub.includes('value="'+s.specs.lengthFeet+'"'));}
});

test('catalog fetch failure permits a retry for both hub and dedicated tracker',async()=>{
 const render=js.slice(js.indexOf('  function renderStory('),js.indexOf('  function showShip('));
 for(const hubShipDesk of [false,true]){
  let attempts=0;const storyBox={dataset:{},hidden:true,replaceChildren(){},append(){}};
  const v={mmsi:'366904950',name:'LEE A. TREGURTHA'};
  const context={storyBox,hubShipDesk,storyRequest:0,storyPromise:null,selectedMmsi:v.mmsi,selectedName:v.name,inspector:{hidden:false},normalizedShipName:n=>n,storyFor:()=>null,node:()=>({}),fetch:async()=>{attempts++;if(attempts===1)throw Error('temporary outage');return {ok:true,json:async()=>({schemaVersion:1,stories:[]})};}};
  vm.runInNewContext(render,context);context.renderStory(v);await context.storyPromise;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(storyBox.dataset.storyKey,undefined);context.renderStory(v);await context.storyPromise;await new Promise(resolve=>setImmediate(resolve));assert.equal(attempts,2);
 }
});
