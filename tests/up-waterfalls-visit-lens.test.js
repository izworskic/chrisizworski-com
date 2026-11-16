import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls.css','utf8');
const lens=fs.readFileSync('public/assets/up-waterfalls-visit-lens.js','utf8');
const map=fs.readFileSync('public/assets/up-waterfalls.js','utf8');
const data=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const index=html.indexOf('id="visit-lens"');
test('B55 waterfall decision desk: visible before map and retains 75 source guide references and canonical protections',()=>{
 assert.equal(data.length,80);
 assert.equal((html.match(/<article class="waterfall-card" data-fall /g)||[]).length,80);
 assert.ok(index>0&&index<html.indexOf('id="falls-map"'));
 for(const id of ['visit-region','visit-budget','visit-date','visit-verdict','visit-picks','visit-selection','visit-baseline'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.match(html,/Explore 80 waterfall destinations and scenic stops/);assert.match(html,/80 waterfalls and scenic stops to explore/);
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
 assert.match(lens,/Check the latest park trail and road notes/);
 assert.match(lens,/const materialCaution=notice\.length>0/,'access ranking must not depend on the visitor-facing sentence');
 assert.doesNotMatch(lens,/startsWith\('No closure encoded/);
 assert.match(lens,/check each park guide for current conditions/);
 assert.match(lens,/driving between U.P. regions is a separate part of the day/);
 for(const url of ['michigan.gov/recsearch/parks/porkies','michigan.gov/recsearch/parks/bondfalls','fs.usda.gov/r09/ottawa/alerts/black-river','nps.gov/places/munising-falls'])assert.ok(lens.includes(url));
 assert.match(map,/UPWaterfallFocus/);assert.match(map,/upfall:selected/);
 assert.match(map,/\/api\/carto-basemap-config/);assert.match(map,/tile.openstreetmap.org/);
 assert.ok(!map.includes("L.tileLayer('https://basemaps.cartocdn.com/light_all/"),'keyless CARTO watermark must never load');
 assert.match(html,/id="falls-basemap-status"/);
 assert.match(map,/!\['closed','research'\]/);
 assert.match(css,/\.visit-lens/);assert.match(css,/focus-visible/);
 assert.match(css,/\.dot\.research/);
});
test('B55 publish no invented trip times or new guide URLs',()=>{
 assert.ok(html.includes('Allow extra time for driving, weather, and the unexpected stop along the way.'));
 assert.ok(!lens.includes('travelmode=driving'));
 assert.ok(!html.includes('href="/upper-peninsula-waterfalls/visitability-lens/"'));
 for(const c of data){assert.ok(c.id&&c.source,'curated source record incomplete');}
});

test('every waterfall map action offers Google Maps feature viewing, separate from verified parking directions',()=>{
 const near=fs.readFileSync('public/assets/up-waterfalls-nearby.js','utf8');
 const detail=fs.readFileSync('public/assets/up-fall-detail.js','utf8');
 const styles=fs.readFileSync('public/assets/up-waterfalls.css','utf8');
 for(const [name,source] of [['visit matcher',lens],['nearby falls',near],['interactive map',map],['individual guide',detail]]){
  assert.match(source,/google\.com\/maps\/search\//,name+' must link to a geographic Google Maps view');
  assert.match(source,/encodeURIComponent\(/,name+' must safely encode the known feature coordinate');
  assert.match(source,/noopener noreferrer/,name+' must protect external navigation');
 }
 assert.match(lens,/row\.appendChild\(google\)/);
 assert.match(near,/actions\.appendChild\(google\)/);
 assert.match(map,/p\.appendChild\(google\)/);
 assert.match(detail,/insertAdjacentElement\('afterend',paragraph\)/);
 assert.doesNotMatch(lens,/google\.com\/maps\/dir\//);
 assert.doesNotMatch(near,/google\.com\/maps\/dir\//);
 assert.doesNotMatch(detail,/google\.com\/maps\/dir\//);
 assert.match(map,/Google Maps directions to verified visitor parking/);
 assert.match(map,/c\.dataset\.arrivalVerified==='verified'/);
 assert.match(styles,/\.waterfall-google-link:focus-visible/);
 const guideDir='public/upper-peninsula-waterfalls';
 const mappedGuides=fs.readdirSync(guideDir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>guideDir+'/'+e.name+'/index.html').filter(p=>fs.existsSync(p)&&fs.readFileSync(p,'utf8').includes('id="mini-map"'));
 assert.ok(mappedGuides.length>=60,'shared link must cover the mapped waterfall guide pages');
 for(const filename of mappedGuides)assert.match(fs.readFileSync(filename,'utf8'),/\/assets\/up-fall-detail\.js/,filename+' must load the shared Google Maps location-link implementation');
});
