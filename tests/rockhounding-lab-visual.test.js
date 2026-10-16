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

test('research page labels the source-backed NNW chart normal and two piers without asserting beach safety',()=>{
 assert.match(html,/id="charted-geography"/);
 assert.match(html,/337°/);
 assert.match(html,/2 <span[^>]*>charted piers<\/span>/);
 assert.match(html,/not a surveyed 2026 shoreline normal/);
 assert.match(html,/Neither beach has a validated wave or safety verdict/);
 assert.match(html,/No device location, personal data/);
 assert.doesNotMatch(html,/guaranteed.*agate|harbor is safe/i);
});

test('historic harbor depth evidence is explicitly labeled as dated overlapping chart coverage, not current safe surf',()=>{
 assert.match(html,/What NOAA actually charts beneath the harbor/);
 assert.match(html,/Inner southwest harbor/);
 assert.match(html,/Depth contours/);
 assert.match(html,/2004–2020/);
 assert.match(html,/record counts cannot be added together/);
 assert.match(html,/cannot establish current harbor depths, navigable clearance, wave shelter/);
 assert.doesNotMatch(html,/safe for swimming today|guaranteed agates after storms/i);
});

test('original USACE 2026 17,804 XYZ elevation rows are explicitly not portrayed as current beach depths',()=>{
 assert.match(html,/17,804 numerical XYZ elevations/);
 assert.match(html,/IGLD 1985/);
 assert.match(html,/not current water depths/);
 assert.match(html,/outside both Agate Beach and Bayshore Park research footprints/);
 assert.match(html,/Neither beach has a validated wave or safety verdict/);
});
