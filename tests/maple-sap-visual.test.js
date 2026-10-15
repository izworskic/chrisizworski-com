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
 assert.match(html,/<h1>When will the maple sap run\?<\/h1>/);
 assert.match(html,/id="sapForecastChart"/);assert.match(html,/id="chartState"/);
 assert.match(html,/id="venueRegion"/);assert.match(html,/id="venueType"/);
 assert.match(html,/id="forecastDays"/);assert.match(html,/id="regionalBoard"/);
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
test('Real image files are tracked and a chart stylesheet is present',()=>{
 for(const x of ['sugarbush-buckets.jpg','syrup-evaporator.jpg','tree-bucket.jpg']){
  const data=fs.readFileSync(path.join(root,'public/michigan-maple-sap-run/images',x));
  assert.ok(data.length>15000);
  assert.equal(data[0],0xff);assert.equal(data[1],0xd8);
 }
 const css=file('public/michigan-maple-sap-run/premium.css');
 assert.match(css,/@media\(max-width:550px\)/);
 assert.match(css,/\.hero-photo/);assert.match(css,/\.sap-svg/);
});
