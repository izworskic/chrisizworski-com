'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const evidence=require('../public/rockhounding-lab/ndbc-45004-2026.json');
test('noindex research page maintains source-vs-simulation labeling',()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.match(html,/NOT LIVE WEATHER/);
 assert.match(html,/Observed offshore wave events/);
 assert.match(html,/not.*waves measured at Agate Beach/i);
});
test('historical visible view has three selectable NOAA episodes',()=>{
 assert.match(html,/id="historical-evidence"/);
 const buttons=[...html.matchAll(/<button type="button" data-case-index="\d"/g)];
 assert.equal(buttons.length,3);
 assert.ok(html.includes('id="observedChart"'));
 assert.ok(html.includes('ndbc-45004-2026.json'));
});
test('observed event payload preserves buoy identity, times, and sample provenance',()=>{
 assert.equal(evidence.station.id,'45004');
 assert.equal(evidence.events.length,3);
 assert.ok(evidence.samples.length>100);
 assert.equal(evidence.source.observedVariable,'wave_height');
 assert.ok(evidence.events.every(x=>evidence.samples.some(s=>s.t===x.peakAt&&s.hM===x.peakSignificantWaveHeightM)));
});
test('historical UI does not treat an unavailable data fetch as a benign event',()=>{
 assert.match(html,/Historical source currently unavailable/);
 assert.match(html,/No estimates are substituted/);
 assert.match(html,/The archived NOAA data file could not be loaded/);
});
test('script never interpolates gaps greater than nine hours',()=>{
 assert.match(html,/stamp-prev<=\(9\*H\)/);
});
test('visual preview remains keyless and does not insert native ad scripts or a public canonical',()=>{
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication|Mapbox|mapbox|leaflet/);
 assert.doesNotMatch(html,/<link rel="canonical"/);
 assert.ok((html.match(/<script>/g)||[]).length>=2);
});
