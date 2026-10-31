const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const engineUrl=pathToFileURL(path.join(__dirname,'../public/assets/gooseberry-engine.mjs')).href;
const load=()=>import(engineUrl);

test('Gooseberry: 30-minute stop chooses source-backed shorter walk',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:30,season:'snow-free',mobility:'standard'});
 assert.equal(r.outing.id,'short');
 assert.match(r.why,/30–45/);
 assert.equal(r.parkAccess,'UNVERIFIED');
});
test('Gooseberry: a one-hour window chooses the conservative 30–45-minute route',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:60,mobility:'standard',interest:'waterfalls'});
 assert.equal(r.outing.id,'short');
 assert.match(r.why,/one-hour/);
 assert.match(r.alternatives.join(' '),/45–90-minute/);
});
test('Gooseberry: 90-minute standard walking fits the DNR falls loop',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:90,mobility:'standard',interest:'waterfalls'});
 assert.equal(r.outing.id,'loop');
 assert.match(r.outing.terrain,/Non-ADA/);
 assert.match(r.outing.minutes,/45–90/);
});
test('Gooseberry: accessible walk does not present non-ADA Lower Falls as accessible',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:90,mobility:'stepfree',interest:'waterfalls'});
 assert.equal(r.outing.id,'short');
 assert.match(r.why,/ADA-accessible/);
});
test('Gooseberry: snow-covered trip does not route through maintained three-falls loop',async()=>{
 const {chooseOuting}=await load();
 for(const mobility of ['standard','stepfree']){
  const r=chooseOuting({minutes:150,mobility,season:'snow-covered',interest:'waterfalls'});
  assert.equal(r.outing.id,'winter');
  assert.match(r.why,/not a maintained winter walk/);
  assert.match(r.warnings.join(' '),/River ice is never safe/);
 }
});
test('Gooseberry: Fifth Falls is a two-mile hike, not a fabricated ETA',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:150,interest:'long-hike',mobility:'standard'});
 assert.equal(r.outing.id,'fifth');
 assert.match(r.outing.minutes,/2-mile loop/);
 assert.match(r.warnings.join(' '),/Superior Hiking Trail/);
});
test('Gooseberry: shoreline outing discloses different parking permit',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:90,interest:'shoreline',mobility:'standard'});
 assert.equal(r.outing.id,'shoreline');
 assert.match(r.outing.permit,/permit is required/);
});
test('Gooseberry: accessibility takes priority over shoreline and backcountry intent',async()=>{
 const {chooseOuting}=await load();
 for(const interest of ['shoreline','long-hike']){
   const r=chooseOuting({minutes:150,interest,mobility:'stepfree'});
   assert.equal(r.outing.id,'short');
   assert.match(r.alternatives.join(' '),/not/);
 }
});
test('Gooseberry: serious NWS vicinity alert changes the warning but not trail status',async()=>{
 const {chooseOuting}=await load();
 const r=chooseOuting({minutes:60},{alerts:[{severity:'Severe',event:'Severe Thunderstorm Warning'}]});
 assert.equal(r.weatherAlert,'SERIOUS_REGIONAL_ALERT');
 assert.equal(r.parkAccess,'UNVERIFIED');
 assert.match(r.warnings[0],/NWS alert/);
});
test('Gooseberry: URL visitor preferences replay and invalid data is bounded',async()=>{
 const {serializeInputs,fromQuery}=await load();
 const before={minutes:90,season:'snow-covered',interest:'waterfalls',mobility:'stepfree'};
 const after=fromQuery('?'+serializeInputs(before));
 assert.deepEqual(after,before);
 assert.equal(fromQuery('?time=10000000&mobility=something').minutes,60);
});
test('Gooseberry page: useful source-backed HTML and Person canonical are present without scripts',()=>{
 const doc=fs.readFileSync(path.join(__dirname,'../public/gooseberry-falls/index.html'),'utf8');
 assert.match(doc,/Only have an hour\?/);
 assert.match(doc,/Current park trail access is not automatically verified/);
 assert.match(doc,/https:\/\/chrisizworski.com\/#person/);
 assert.match(doc,/https:\/\/chrisizworski.com\/gooseberry-falls\//);
 assert.match(doc,/Special:FilePath\/Goosberry_Falls\.jpg/);
 const blocks=[...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(blocks.length,1);
 assert.equal(JSON.parse(blocks[0][1])['@graph'][0]['@type'],'Person');
});
test('Gooseberry API: always says park access unverified and contains no invented gauge',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../api/gooseberry-conditions.js'),'utf8');
 assert.match(file,/parkAccess:'UNVERIFIED'/);
 assert.match(file,/flowMeasurement:'UNAVAILABLE_NO_CONTINUOUS_USGS_DATA'/);
 assert.match(file,/X-Robots-Tag/);
});

test('Gooseberry discovery: Tools card, ItemList schema, registry and sitemap all point to one canonical',()=>{
 const root=path.join(__dirname,'..');
 const toolsHtml=fs.readFileSync(path.join(root,'public/tools/index.html'),'utf8');
 const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
 const registry=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
 const circle=fs.readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
 const canonical='https://chrisizworski.com/gooseberry-falls/';
 assert.equal((toolsHtml.match(/data-tool-id="gooseberry-falls"/g)||[]).length,1);
 const script=toolsHtml.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/);
 assert.ok(script,'Tools JSON-LD is missing');
 const data=JSON.parse(script[1]);
 const list=data['@graph'].find(x=>x['@type']==='ItemList').itemListElement;
 assert.equal(list.filter(x=>x.item?.url===canonical).length,1);
 assert.equal((sitemap.match(/<loc>https:\\/\\/chrisizworski\\.com\\/gooseberry-falls\\/<\\/loc>/g)||[]).length,1);
 assert.equal(registry.tools.filter(x=>x.canonical===canonical).length,1);
 assert.ok(circle.includes('href="/gooseberry-falls/"'));
});
