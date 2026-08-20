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
  assert.ok(js.includes("name:'Contextual Tool Handoff'"));
  assert.doesNotMatch(js,/geolocation|latitude|longitude|localStorage|sessionStorage|document\.cookie|fingerprint/i);
  assert.ok(js.includes("destination:a.dataset.tripStackLink"));
});

test('fall loader and Manistee loader reuse one shared trip stack',()=>{
  const fall=read('public/assets/field-camera.js');
  const manistee=read('public/assets/manistee-river-coverage-ui.js');
  assert.ok(fall.includes('/assets/contextual-trip-stack.js'));
  assert.ok(manistee.includes('/assets/contextual-trip-stack.js'));
});

test('fall weekend page keeps crawlable cross-tool fallback links',()=>{
  const html=read('public/fall-color/this-weekend/index.html');
  assert.ok(html.includes('data-contextual-trip-stack="fall-weekend"'));
  for(const href of ['/northern-lights-michigan/','/mackinac-bridge-live/','https://picturedrocks.chrisizworski.com/','https://ausable.chrisizworski.com/','/manistee-river-map/','https://tcwine.chrisizworski.com/']) assert.ok(html.includes(`href="${href}"`),href);
  assert.ok(html.includes("fall-weekend-ranked"));
});
