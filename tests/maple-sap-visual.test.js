'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const chart=require('../public/michigan-maple-sap-run/charts.js');
const file=x=>fs.readFileSync(path.join(root,x),'utf8');

test('Off-season graph is explicitly a hypothetical teaching diagram, not live forecast',()=>{
 const result=chart.renderSvg([], 'OFF_SEASON','Bay City');
 assert.equal(result.mode,'illustrative');
 assert.equal(result.entries.length,7);
 assert.match(result.html,/Example freeze and thaw temperatures — not current weather/);
 assert.match(result.html,/32°F freezing line/);
 assert.doesNotMatch(result.html,/\/100/);
 assert.equal(result.scoredDays,0);
});
test('Active graph uses actual supplied forecast days; missing index stays unavailable',()=>{
 const input=[
 {date:'2027-03-12',low:24,high:43,score:82,level:'FAVORABLE'},
 {date:'2027-03-13',low:34,high:47,score:null,level:'INSUFFICIENT'},
 {date:'2027-03-14',low:22,high:39,score:65,level:'POSSIBLE'}
 ];
 const result=chart.renderSvg(input,'WEATHER_WINDOW','Bay City');
 assert.equal(result.mode,'live');
 assert.equal(result.scoredDays,2);
 assert.deepEqual(result.entries.map(x=>x.score),[82,null,65]);
 assert.match(result.html,/82/);assert.match(result.html,/65/);
 assert.match(result.html,/n\/a/);assert.match(result.html,/Bay City/);
 assert.doesNotMatch(result.html,/teaching sketch|hypothetical/);
});
test('Graph handles a weather outage without inventing a score',()=>{
 const result=chart.renderSvg([], 'UNAVAILABLE','Bay City');
 assert.equal(result.mode,'illustrative');
 assert.equal(result.scoredDays,0);
 assert.match(result.html,/not current weather/);
});
test('Visual page keeps provider-linked truth labels, crawlable content and single canonical',()=>{
 const html=file('public/michigan-maple-sap-run/index.html');
 assert.match(html,/<h1><span class="hero-kicker">[^<]+<\/span>When will the maple sap run\?<\/h1>/);
 assert.match(html,/id="sapForecastChart"/);assert.match(html,/id="chartState"/);
 assert.match(html,/id="venueRegion"/);assert.match(html,/id="venueType"/);
 assert.match(html,/id="forecastDays"/);assert.match(html,/id="regionalBoard"/);
 const forecast=html.slice(html.indexOf('id="forecast-tool"'),html.indexOf('class="decision-grid"'));
 assert.ok(forecast.indexOf('class="controls"')<forecast.indexOf('class="section-head"'),'Location controls must precede the auto-ad-eligible heading');
 assert.match(html,/2027 confirmed|2027 dates confirmed/);
 assert.match(html,/Reference photo, not a live Michigan view/);
 assert.match(html,/Dave Pape, public domain/);
 assert.match(html,/premium\.css/);
 assert.match(html,/charts\.js/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
});
test('Frontend keeps one fetch per site and source-linked sugarhouse cards, not fabricated OPEN NOW',()=>{
 const app=file('public/michigan-maple-sap-run/app.js');
 assert.match(app,/MapleSapCharts\.render/);
 assert.match(app,/sourceYear/);
 assert.match(app,/showAllVenues/);
 assert.match(app,/Reference photo · not this venue/);
 assert.doesNotMatch(app,/OPEN NOW|THIS WEEKEND/);
});
test('Reference images are hosted at credited Wikimedia originals; no incomplete local images',()=>{
 const html=file('public/michigan-maple-sap-run/index.html');
 const app=file('public/michigan-maple-sap-run/app.js');
 const css=file('public/michigan-maple-sap-run/premium.css');
 assert.match(html,/https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/Maple_sap_buckets/);
 assert.match(html,/https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/Maple_syrup_evaporator/);
 assert.match(app,/Special:FilePath\/Maple_syrup_bucket/);
 assert.match(html,/Dave Pape, public domain/);
 assert.match(css,/@media\(max-width:550px\)/);
 assert.match(css,/\.hero-photo/);assert.match(css,/\.sap-svg/);
});

test('Map defaults to working CARTO-keyed Voyager tiles and has OSM fallback',()=>{
 const app=file('public/michigan-maple-sap-run/app.js');
 const wisconsin=file('public/michigan-maple-sap-run/index.html');
 assert.match(app,/basemaps\.cartocdn\.com\/rastertiles\/voyager/);
 assert.match(app,/\.png\?key=cb1_/);
 assert.match(app,/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
 assert.match(app,/CARTO<\/a>/);
 assert.match(app,/OpenStreetMap contributors/);
 assert.doesNotMatch(app,/new window\.IntersectionObserver\s*\(|observer\.observe\(host\)/);
 assert.match(app,/window\.requestAnimationFrame\(size\)/);
 assert.match(app,/ResizeObserver/);
 assert.match(app,/tileLayer\.on\('tileerror'/);
 assert.match(app,/map\.removeLayer\(tileLayer\)/);
 assert.match(app,/fallback\.hidden=false/);
 assert.match(app,/m\.on\('click',function\(\)\{selectSite\(x\.id\);\}\)/);
 assert.match(app,/markers\.set\(x\.id,m\)/);
 assert.match(wisconsin,/id="map"/);
});
