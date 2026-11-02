const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const page = fs.readFileSync('public/national-park-phenomena-field-guide/index.html','utf8');
const client = fs.readFileSync('public/assets/national-park-phenomena-field-guide.js','utf8');
const windowStub = {};
vm.runInNewContext(client,{window:windowStub,document:{addEventListener(){}}});
const atlas = windowStub.NP_PHENOMENA_DATA;
const get = id => atlas.phenomena.find(x=>x.id===id);
const sections = id => page.split('id="'+id+'"')[1].split('</article>')[0];
test('Glacier 2026: no vehicle permit, Logan Pass shuttle and parking separated',()=>{
 const glacier=get('glacier-going-to-the-sun-opening');
 assert.equal(glacier.permitType,'open');
 assert.equal(glacier.accessRules.entrance,'NOT_REQUIRED');
 assert.equal(glacier.accessRules.shuttle,'TICKET_REQUIRED');
 assert.equal(glacier.accessRules.parking,'THREE_HOUR_LIMIT');
 assert.deepEqual(Array.from(glacier.accessRules.dateRange),['2026-07-01','2026-09-07']);
 assert.match(sections(glacier.id),/No 2026 Vehicle Reservation/);
 assert.match(sections(glacier.id),/three.hour private.car parking/i);
 assert.match(sections(glacier.id),/2027 rules are unconfirmed/);
 assert.doesNotMatch(sections(glacier.id),/120.Day Rolling|timed.entry reservations are strictly required/i);
});
test('Yosemite Firefall February 2026: no entrance reservation, separate traffic controls',()=>{
 const yose=get('yosemite-horsetail-firefall');
 assert.equal(yose.permitType,'open');
 assert.equal(yose.accessRules.entrance,'NOT_REQUIRED');
 assert.equal(yose.accessRules.parking,'RESTRICTED');
 assert.match(sections(yose.id),/no reservation to enter Yosemite or visit Horsetail Fall/i);
 assert.match(sections(yose.id),/Northside Drive/i);
 assert.match(sections(yose.id),/2027 rules are not confirmed/i);
 assert.doesNotMatch(sections(yose.id),/weekend vehicle timed.entry/i);
});
test('2027 cannot inherit 2026 rule for any park in map or calendar engine',()=>{
 for(const p of atlas.phenomena){
  assert.equal(atlas.getSeasonPolicy(p,2027).status,'UNCONFIRMED');
  assert.match(atlas.getSeasonPolicy(p,2027).text,/unconfirmed/i);
 }
 assert.equal(atlas.getSeasonPolicy(get('glacier-going-to-the-sun-opening'),2026).status,'HISTORICAL_2026');
 assert.doesNotMatch(client,/120.day rolling vehicle reservations|February Yosemite Firefall weekend vehicle reservations/i);
});
test('structured data FAQ and visible FAQ agree, canonical unaffected',()=>{
 const json=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=json['@graph'].find(x=>x['@type']==='FAQPage').mainEntity[0].acceptedAnswer.text;
 assert.match(faq,/Glacier had no vehicle reservation/i);
 assert.match(faq,/2027 are not confirmed/i);
 assert.ok(page.includes(faq));
 assert.match(page,/<link rel="canonical" href="https:\/\/chrisizworski.com\/national-park-phenomena-field-guide\/"/);
 assert.match(page,/phenomenon-leaflet-map/);
 assert.match(client,/carto-basemap-config/);
});
