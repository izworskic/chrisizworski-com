const fs=require('node:fs');
const test=require('node:test'), assert=require('node:assert/strict');
const {classify,classifyRuntime}=require('../lib/adsense-audit');
const wrap=tag=>'<html><head>'+tag+'</head><body>Tool</body></html>';
const url='https://chrisizworski.com/new-tool/';
const tag='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script>';
test('coverage audit distinguishes installation, failures, and unverified browser state',()=>{
 assert.equal(classify(wrap(tag),url).state,'standard-code');
 assert.equal(classify(wrap(tag+tag),url).state,'duplicate-loader');
 assert.equal(classify(wrap(tag.replace('?client=ca-pub-8222782620788075','')),url).state,'legacy-or-wrong-publisher');
 assert.equal(classify(wrap(''),url).state,'missing-code');
 assert.equal(classify(wrap('<script>"adsbygoogle.js"</script>'),url).state,'client-rendered-needs-browser');
 assert.equal(classify(wrap(tag),url,500).state,'http-error');
 assert.equal(classify(wrap('<meta name="robots" content="noindex">'),url).state,'excluded-document');
});

test('existing owner exclusions are scoped to actual host and path, not entire projects',()=>{
 const config=require('../config/in-article-ads.json');
 for(const route of [
  'https://phenology.chrisizworski.com/bloom-tracker',
  'https://phenology.chrisizworski.com/wisconsin-bloom-tracker',
  'https://phenology.chrisizworski.com/wisconsin-bloom-tracker/door-county-cherries',
  'https://phenology.chrisizworski.com/wisconsin-bloom-tracker/uw-arboretum',
  'https://chrisizworski.com/isle-royale-ferry/'
 ]){
  assert.equal(classify(wrap(''),route).state,'page-exception',route);
  assert.equal(classify(wrap(tag),route).state,'exception-loader-present',route);
  assert.equal(classify(wrap('<script defer src="/assets/in-article-ads.js?v=1"></script>'),route).state,'exception-loader-present',route);
 }
 for(const route of [
  'https://phenology.chrisizworski.com/',
  'https://phenology.chrisizworski.com/bloom-tracker-other',
  'https://phenology.chrisizworski.com/wisconsin-bloom-tracker-other',
  'https://phenology.chrisizworski.com/firefly-tracker',
  'https://chrisizworski.com/isle-royale-map/',
  'https://chrisizworski.com/isle-royale-ferry-comparison/',
  'https://ausable.chrisizworski.com/'
 ]) {
  assert.equal(classify(wrap(''),route).state,'missing-code',route);
  assert.equal(classify(wrap(tag),route).state,'standard-code',route);
 }
 assert.equal(config.loaderMode,'standard');
 assert.equal(config.enabled,false);
});
test('an intentional exception cannot mask failed HTTP requests, duplicate loaders, or client-rendered markers',()=>{
 const route='https://chrisizworski.com/isle-royale-ferry/';
 const bloom='https://phenology.chrisizworski.com/wisconsin-bloom-tracker/door-county-cherries';
 const network='<script defer src="https://chrisizworski.com/assets/network-ads-v1.js"></script>';
 assert.equal(classify(wrap(''),route,503).state,'http-error');
 assert.equal(classify(wrap(network),route).state,'page-exception');
 assert.equal(classify(wrap(network+network),route).state,'duplicate-loader');
 assert.equal(classify(wrap(network+tag),route).state,'exception-loader-present');
 assert.equal(classify(wrap('<script>window.__loader="adsbygoogle.js"</script>'),bloom).state,'client-rendered-needs-browser');
 assert.equal(classify(wrap(network+'<script>import("/assets/in-article-ads.js")</script>'),route).state,'client-rendered-needs-browser');
 assert.equal(classify(wrap('<script>const s="network-ads-v1.js";</script>'),bloom).state,'client-rendered-needs-browser');
});

test('runtime audit requires deployed pageExceptions and manual-placement parity with central config',()=>{
 const built=fs.readFileSync('public/assets/network-ads-v1.js','utf8');
 assert.equal(classifyRuntime(built,200,'application/javascript; charset=utf-8').state,'standard-runtime');
 assert.equal(classifyRuntime(built,503,'application/javascript').state,'invalid-runtime');
 assert.equal(classifyRuntime(built,200,'text/html').state,'invalid-runtime');
 const staleExceptions=built.replace(',{"host":"chrisizworski.com","path":"/isle-royale-ferry"', '');
 const parsedStale=built.replace(/var settings = (\{[^\n]+\});/,(full,raw)=>{
  const next=JSON.parse(raw);
  next.pageExceptions=next.pageExceptions.slice(0,-1);
  return 'var settings = '+JSON.stringify(next)+';';
 });
 assert.equal(classifyRuntime(parsedStale,200,'application/javascript').state,'stale-runtime-policy');
 const staleEnabled=built.replace('"enabled":false','"enabled":true');
 assert.equal(classifyRuntime(staleEnabled,200,'application/javascript').state,'stale-runtime-policy');
 const wrongPub=built.replace('ca-pub-8222782620788075','ca-pub-0000000000000000');
 assert.equal(classifyRuntime(wrongPub,200,'application/javascript').state,'invalid-runtime');
 void staleExceptions;
});
