'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/michigan-winter-weekends/index.html');
const js=read('public/assets/michigan-winter-weekend-desk.js');
const css=read('public/assets/michigan-winter-weekends.css');
const sitemap=read('public/sitemap-winter.xml');
const planner=require('../public/assets/michigan-winter-weekend-desk.js');
const cards=[...html.matchAll(/<article class="wf-story" id="(stop-\d+)"([^>]*)>/g)].map(m=>({
 id:m[1],
 region:m[2].match(/data-region="([^"]+)"/)?.[1],
 windows:(m[2].match(/data-window="([^"]+)"/)?.[1]||'').split(',')
}));
const tuesday=Date.parse('2026-11-11T01:30:00Z'); // 8:30 PM Tuesday in Michigan
test('planner reuses exactly twelve real guide entries and preserves existing four-door experience',()=>{
 assert.equal(cards.length,12);
 assert.equal((html.match(/data-door="/g)||[]).length,4);
 assert.equal((html.match(/data-blueprint="/g)||[]).length,4);
 assert.equal((html.match(/<article class="wf-story"/g)||[]).length,12);
 assert.ok(html.includes('"numberOfItems":12'));
});
test('editorial shortlists use the actual regional and season flags and never invent candidates',()=>{
 assert.deepEqual(planner.shortlist(cards,{kind:'snowshoe'},tuesday).map(x=>x.id),['stop-2','stop-8','stop-11']);
 assert.deepEqual(planner.shortlist(cards,{kind:'downhill',region:'north'},tuesday).map(x=>x.id),['stop-10']);
 assert.deepEqual(planner.shortlist(cards,{kind:'ships',region:'south'},tuesday).map(x=>x.id),['stop-12']);
 assert.deepEqual(planner.shortlist(cards,{kind:'xc',region:'south'},tuesday),[]);
 assert.deepEqual(planner.shortlist(cards,{kind:'bogus'},tuesday),[]);
 assert.equal(planner.shortlist(cards,{kind:'snowshoe',when:'all'},tuesday).length,3);
 for(const mode of Object.keys(planner.MODES)){
   assert.ok(planner.shortlist(cards,{kind:mode,when:'all'},tuesday).every(x=>cards.some(y=>x.id===y.id)));
 }
});
test('Michigan calendar, weekend boundary and no out-of-season false recommendations',()=>{
 assert.deepEqual(planner.weekendInfo(tuesday),{label:'Nov 14–Nov 15',window:'early'});
 assert.deepEqual(planner.weekendInfo(Date.parse('2026-11-15T21:00:00Z')),{label:'Nov 21–Nov 22',window:'early'});
 assert.equal(planner.weekendInfo(Date.parse('2027-06-01T12:00:00Z')).window,'outside');
 assert.deepEqual(planner.shortlist(cards,{kind:'snowshoe'},Date.parse('2027-06-01T12:00:00Z')),[]);
});
test('optional origin is editable, private, validated, and never a claimed drive time',()=>{
 assert.equal(planner.depthUrl('Bay City'),'/michigan-snow-depth/?origin=Bay%20City');
 assert.equal(planner.depthUrl('48706'),'/michigan-snow-depth/?origin=48706');
 assert.equal(planner.depthUrl(''),'/michigan-snow-depth/');
 assert.equal(planner.validOrigin('Bay City'),true);
 assert.equal(planner.validOrigin('<script>'),false);
 assert.equal(planner.depthUrl('<script>'),'/michigan-snow-depth/');
 assert.ok(!js.includes('geolocation'));
 assert.ok(!js.includes('localStorage'));
 assert.ok(!js.includes('fetch('));
});
test('crawlable default and input/alert accessibility',()=>{
 for(const id of ['wkd-desk-form','wkd-desk-kind','wkd-desk-region','wkd-desk-when','wkd-desk-origin','wkd-desk-feedback','wkd-desk-results'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('form id="wkd-desk-form" class="wkd-desk-form" hidden'));
 assert.ok(html.includes('aria-live="polite"'));
 assert.ok(html.includes('planning ideas, not verified live openings'));
 assert.ok(html.includes('https://mdotjboss.state.mi.us/MiDrive/map'));
 assert.ok(html.includes('https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm'));
 assert.ok(html.includes('href="#stop-2"')&&html.includes('href="#stop-8"')&&html.includes('href="#stop-12"'));
 assert.ok(css.includes('.wkd-desk-form[hidden]')&&css.includes('@media(max-width:620px)'));
 assert.ok(js.includes('doc.getElementById(\'wf-reset\')?.click()'));
 assert.ok(!js.includes('/michigan-snowshoe-conditions/'));
 assert.ok(!js.includes('/winter-hike-snowshoe-lab/'));
});
test('preserve canonical, person attribution, original URL and winter sitemap stamp',()=>{
 assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/michigan-winter-weekends/"'));
 assert.ok(html.includes('https://chrisizworski.com/#person'));
 assert.ok(html.includes('"dateModified":"2026-11-10"'));
 assert.ok(sitemap.includes('<loc>https://chrisizworski.com/michigan-winter-weekends/</loc><lastmod>2026-11-10</lastmod>'));
 assert.equal((sitemap.match(/https:\/\/chrisizworski.com\/michigan-winter-weekends\//g)||[]).length,1);
 assert.ok(html.includes('/assets/michigan-winter-weekend-desk.js?v=20261110a'));
});
