'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../public/winter-hike-snowshoe-lab');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const js=fs.readFileSync(path.join(base,'app.js'),'utf8');
const css=fs.readFileSync(path.join(base,'style.css'),'utf8');
const visuals=fs.readFileSync(path.join(base,'visuals.js'),'utf8');
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

test('visualization module loads before main UI and uses keyboard-accessible native buttons',()=>{
 const a=html.indexOf('/winter-hike-snowshoe-lab/visuals.js?v=2');
 const b=html.indexOf('/winter-hike-snowshoe-lab/app.js?v=2');
 assert.ok(a>0&&b>a);
 assert.match(visuals,/data-wx-day/);assert.match(visuals,/aria-pressed/);
 assert.match(visuals,/data-wx-hour/);
});
test('live dashboard binds its chart events to the persistent detail area, not a future child',()=>{
 assert.match(js,/WinterHikeVisuals\?\.bind\(\$\('detail'\)/);
 assert.match(js,/rememberTimeline\(\$\('detail'\),f\)/);
 assert.match(js,/onDayChange\(value\)/);
 assert.ok(!js.includes("bind($('weather-output')"));
});
test('snow gauge uses physically accurate tick locations for the displayed scale',()=>{
 assert.match(css,/wx-snow-ticks span:nth-child\(2\)\{left:16\.6667%\}/);
 assert.match(css,/wx-snow-ticks span:nth-child\(3\)\{left:50%\}/);
 assert.match(visuals,/12″\+/);
 assert.match(visuals,/not a trail measurement/);
});
test('charts describe source coverage and never replace missing NOAA data with a fabricated time series',()=>{
 assert.match(visuals,/Seven-day outlook unavailable/);
 assert.match(visuals,/NOAA MODEL SNAPSHOT/);
 assert.match(visuals,/FORECAST · NOT HISTORY/);
 assert.match(visuals,/ALL UNVERIFIED/);
 assert.ok(!visuals.includes('snowDepthHistory'));
});
