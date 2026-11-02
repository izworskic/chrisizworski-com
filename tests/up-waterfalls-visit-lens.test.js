import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls.css','utf8');
const lens=fs.readFileSync('public/assets/up-waterfalls-visit-lens.js','utf8');
const map=fs.readFileSync('public/assets/up-waterfalls.js','utf8');
const data=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const index=html.indexOf('id="visit-lens"');
test('B55 waterfall decision desk: visible before map and retains 72 source cards and canonical protections',()=>{
 assert.equal(data.length,72);
 assert.equal((html.match(/<article class="waterfall-card" data-fall /g)||[]).length,72);
 assert.ok(index>0&&index<html.indexOf('id="falls-map"'));
 for(const id of ['visit-region','visit-budget','visit-date','visit-verdict','visit-picks','visit-selection','visit-baseline'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.match(html,/72 curated visitor destinations/);assert.match(html,/72 curated waterfall profiles/);
 assert.match(html,/https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\//);
 assert.match(html,/Built by/);assert.match(html,/id="show-geo-candidates"/);
 assert.match(html,/assets\/up-waterfalls-visit-lens.js/);
 assert.match(html,/November 2, 2026/);
 assert.ok(!html.includes('71 researched visitor destinations'));
});
test('B55 conservative full-visit time gate and source-scoped closure safety',()=>{
 assert.match(lens,/\.max<=limit/);
 assert.match(lens,/const duration=c=>/);
 assert.match(lens,/status==='closed'/);assert.match(lens,/status==='research'/);
 assert.match(lens,/c.dataset.arrivalVerified!=='verified'/);
 assert.match(lens,/current road, gate and trail status remain unconfirmed/);
 assert.match(lens,/not confirmed-open trips/);
 assert.match(lens,/Travel between U.P. regions is NOT included/);
 for(const url of ['michigan.gov/recsearch/parks/porkies','michigan.gov/recsearch/parks/bondfalls','fs.usda.gov/r09/ottawa/alerts/black-river','nps.gov/places/munising-falls'])assert.ok(lens.includes(url));
 assert.match(map,/UPWaterfallFocus/);assert.match(map,/upfall:selected/);
 assert.match(map,/!\['closed','research'\]/);
 assert.match(css,/\.visit-lens/);assert.match(css,/focus-visible/);
 assert.match(css,/\.dot\.research/);
});
test('B55 publish no invented trip times or new guide URLs',()=>{
 assert.ok(html.includes('Travel time and weather are not calculated.'));
 assert.ok(!lens.includes('travelmode=driving'));
 assert.ok(!html.includes('href="/upper-peninsula-waterfalls/visitability-lens/"'));
 for(const c of data){assert.ok(c.id&&c.source,'curated source record incomplete');}
});
