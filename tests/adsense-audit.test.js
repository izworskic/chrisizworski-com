const test=require('node:test'), assert=require('node:assert/strict');
const {classify}=require('../lib/adsense-audit');
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
test('an intentional exception cannot mask failed HTTP requests or duplicate network loaders',()=>{
 const route='https://chrisizworski.com/isle-royale-ferry/';
 const network='<script defer src="https://chrisizworski.com/assets/network-ads-v1.js"></script>';
 assert.equal(classify(wrap(''),route,503).state,'http-error');
 assert.equal(classify(wrap(network+network),route).state,'duplicate-loader');
 assert.equal(classify(wrap(network+tag),route).state,'exception-loader-present');
});
