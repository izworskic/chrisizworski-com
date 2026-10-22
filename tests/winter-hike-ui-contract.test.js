'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../public/winter-hike-snowshoe-lab');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const js=fs.readFileSync(path.join(base,'app.js'),'utf8');
const css=fs.readFileSync(path.join(base,'style.css'),'utf8');
const vercel=require('../vercel.json');
test('lab is deliberately noindex and uses distinct, self-referencing canonical',()=>{
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/href="https:\/\/chrisizworski\.com\/winter-hike-snowshoe-lab\/"/);
 assert.ok(!html.includes('schema.org/FAQPage'));
});
test('location button is opt-in and cannot redirect outsiders out of the Michigan map',()=>{
 assert.match(html,/id="nearby"/);
 assert.match(js,/navigator\.geolocation\.getCurrentPosition/);
 assert.match(js,/pos\.coords\.latitude>=41&&pos\.coords\.latitude<=49/);
 assert.match(js,/drawUserLocation/);
});
test('CARTO is first choice, OpenFreeMap is a non-deceptive fallback',()=>{
 assert.match(js,/\/api\/carto-basemap-config/);
 assert.match(js,/basemaps\.cartocdn\.com\/gl\/voyager-gl-style/);
 assert.match(js,/tiles\.openfreemap\.org\/styles\/liberty/);
 assert.match(html,/maplibre-gl@5\.16\.0/);
});
test('clicking actual map reference icons filters explanatory route cards, not directions',()=>{
 assert.match(js,/map\.on\('click','winter-area-ring'/);
 assert.match(js,/selectGroup\(id\)/);
 assert.match(js,/state\.filtered/);
 assert.ok(!js.includes('google.com/maps/dir'));
});
test('map line coloring distinguishes official mapped closures from unverified segments',()=>{
 assert.match(js,/winter-lines-closed/);
 assert.match(js,/closed-segment/);
 assert.match(js,/winter-lines-normal/);
 assert.match(html,/Lines are \*partial official GIS segments\*/);
});
test('weather charts are explicitly sourced as NWS forecasts, never surface observations',()=>{
 assert.match(js,/function timelineChart/);
 assert.match(js,/Hourly NWS forecast temperature/);
 assert.match(js,/Forecast, not a trail observation/);
});
test('the page groups content in few substantial sections and avoids inline ad slots',()=>{
 assert.match(html,/class="hero"/);assert.match(html,/class="workbench"/);
 assert.match(html,/class="explore"/);assert.match(html,/class="results"/);
 assert.match(html,/class="explain"/);
 assert.ok(!html.includes('<ins class="adsbygoogle"'));
 assert.ok(css.length>1000);
});
test('the isolated preview API has enough runtime for bounded NOAA/NWS and DNR requests',()=>{
 assert.equal(vercel.functions['api/winter-hike-lab.js'].maxDuration,30);
});
