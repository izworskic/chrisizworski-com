const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>readFileSync(path.join(root,f),'utf8');

test('contextual trip stack covers eight Michigan region families',()=>{
  const js=read('public/assets/contextual-trip-stack.js');
  for(const id of ['wup','eup','tip','nwl','nel','cen','swl','sel']) assert.ok(js.includes(`${id}:{title:`),id);
  for(const route of ['porcupine-mountains-fall-color','keweenaw-peninsula-fall-color','tahquamenon-falls-fall-color','mackinac-island-fall-color','sleeping-bear-dunes-fall-color','au-sable-river-fall-color','ann-arbor-irish-hills-fall-color']) assert.ok(js.includes(route),route);
});

test('trip stack analytics are symbolic and privacy limited',()=>{
  const js=read('public/assets/contextual-trip-stack.js');
  assert.ok(js.includes("emit('Contextual Tool Handoff'"));
  assert.ok(js.includes("emit('Network Amplification Exposure'"));
  assert.doesNotMatch(js,/Network Experiment|fall-river-window-v1|data-network-experiment/i);
  assert.doesNotMatch(js,/geolocation|latitude|longitude|localStorage|sessionStorage|document\.cookie|fingerprint/i);
  assert.ok(js.includes("const destination=a.dataset.tripStackLink||'unknown'"));
});

test('fall loader and Manistee loader reuse one shared trip stack',()=>{
  const fall=read('public/assets/field-camera.js');
  const manistee=read('public/assets/manistee-river-coverage-ui.js');
  assert.ok(fall.includes('/assets/contextual-trip-stack.js'));
  assert.ok(manistee.includes('/assets/contextual-trip-stack.js'));
});

test('Circle Tour route asset loads the shared network layer and repairs border-wait isolation',()=>{
  const routeAsset=read('public/assets/lake-superior-circle-tour.js');
  const stack=read('public/assets/contextual-trip-stack.js');
  const html=read('public/lake-superior-circle-tour/index.html');
  assert.ok(html.includes('/assets/lake-superior-circle-tour.js'));
  assert.ok(routeAsset.includes('loadContextualTripStack'));
  assert.ok(routeAsset.includes('/assets/contextual-trip-stack.js?v=20260820-registry1'));
  assert.ok(stack.includes("border:{label:'U.S.–Canada border wait times'"));
  assert.ok(stack.includes("const CIRCLE={title:'Before the next Circle Tour leg',keys:['border','soo','pictured','aurora']}"));
  assert.ok(stack.includes("path==='/lake-superior-circle-tour'"));
});

test('fall river standalone candidate stays shelved and no experiment runtime remains',()=>{
  const js=read('public/assets/contextual-trip-stack.js');
  const registry=JSON.parse(read('benchmarks/tool-network-registry.json'));
  const candidate=registry.expansionOpportunities.find(e=>e.id==='fall-river-window');
  assert.equal(candidate?.status,'shelved');
  assert.equal(require('node:fs').existsSync(path.join(root,'public','fall-river-window','index.html')),false);
  assert.doesNotMatch(js,/fall-river-window-v1|mountFallRiverExperiment|Network Experiment/);
});

test('fall weekend page keeps crawlable cross-tool fallback links',()=>{
  const html=read('public/fall-color/this-weekend/index.html');
  assert.ok(html.includes('data-contextual-trip-stack="fall-weekend"'));
  for(const href of ['/northern-lights-michigan/','/mackinac-bridge-live/','https://picturedrocks.chrisizworski.com/','https://ausable.chrisizworski.com/','/manistee-river-map/','https://tcwine.chrisizworski.com/']) assert.ok(html.includes(`href="${href}"`),href);
  assert.ok(html.includes("fall-weekend-ranked"));
});
