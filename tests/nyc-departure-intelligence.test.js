'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {compareDepartures}=require('../lib/nyc-crossing/departure');
const root=path.join(__dirname,'..');
const now=new Date('2026-11-07T14:15:00Z'); // Saturday, 09:15 New York
const slot=(min)=>({typicalMinutes:min,lowerMinutes:min-1,upperMinutes:min+2,
                      trainingDays:16,holdoutDays:4});
const fixture=()=>({
 schemaVersion:'nyc-departure-evidence-v1',state:'AVAILABLE',
 generatedAt:'2026-11-07T14:00:00Z',
 source:{url:'https://data.cityofnewyork.us/resource/i4gi-tjb9.json',
   latestObservationDate:'2026-11-07'},
 crossings:{'queens-midtown':{linkId:'4456510',scope:'CROSSING_ONLY',
   direction:'Toward Manhattan',
   slots:{'weekend:9':slot(15),'weekend:10':slot(11),'weekend:11':slot(10)},
   holdout:{gainFraction:.15,intervalCoverage:.72,observedHourRows:120,
     maeMinutes:2.4,naiveMaeMinutes:2.9}}},
});
test('only validated same-segment windows can reveal historic relative timing',()=>{
 const out=compareDepartures('queens-midtown',now,fixture());
 assert.equal(out.state,'AVAILABLE');
 assert.deepEqual(out.windows.map(w=>w.inMinutes),[0,60,120]);
 assert.deepEqual(out.windows.map(w=>w.clockLabel),['09:00','10:00','11:00']);
 assert.equal(out.historicallyLighterInMinutes,120);
 assert.match(out.disclaimer,/not a live forecast/);
});
test('unmodeled sources never impersonate an NYC DOT historical link',()=>{
 assert.equal(compareDepartures('gwb',now,fixture()).state,'NOT_COVERED');
 assert.equal(compareDepartures('lincoln',now,fixture()).state,'NOT_COVERED');
 const wrong=fixture();wrong.crossings['queens-midtown'].linkId='45555';
 assert.equal(compareDepartures('queens-midtown',now,wrong).state,'UNAVAILABLE');
 const wrongScope=fixture();wrongScope.crossings['queens-midtown'].scope='CROSSING_APPROACH';
 assert.equal(compareDepartures('queens-midtown',now,wrongScope).state,'UNAVAILABLE');
});
test('stale artifact or official archive cannot create departure advice',()=>{
 const older=fixture();older.generatedAt='2026-11-03T10:00:00Z';
 assert.equal(compareDepartures('queens-midtown',now,older).state,'STALE');
 const oldArchive=fixture();oldArchive.source.latestObservationDate='2026-10-28';
 assert.equal(compareDepartures('queens-midtown',now,oldArchive).state,'STALE');
 const future=fixture();future.generatedAt='2026-11-09T10:00:00Z';
 assert.equal(compareDepartures('queens-midtown',now,future).state,'STALE');
});
test('missing hourly record or insufficient holdout blocks apparent precision',()=>{
 const missing=fixture();delete missing.crossings['queens-midtown'].slots['weekend:11'];
 assert.equal(compareDepartures('queens-midtown',now,missing).state,'PARTIAL');
 const badFit=fixture();badFit.crossings['queens-midtown'].holdout.gainFraction=.01;
 assert.equal(compareDepartures('queens-midtown',now,badFit).state,'UNAVAILABLE');
 const badRange=fixture();badRange.crossings['queens-midtown'].slots['weekend:10'].lowerMinutes=99;
 assert.equal(compareDepartures('queens-midtown',now,badRange).state,'PARTIAL');
});
test('first public model is explicitly unavailable, not synthetic sample output',()=>{
 const published=require('../lib/nyc-crossing/departure-intelligence.json');
 assert.equal(published.schemaVersion,'nyc-departure-evidence-v1');
 assert.ok(['UNAVAILABLE','PARTIAL','AVAILABLE'].includes(published.state));
 if(published.state==='UNAVAILABLE') assert.equal(Object.keys(published.crossings).length,0);
});
test('UI labels the limited historic segment, offers source and no-js alternative',()=>{
 const html=fs.readFileSync(path.join(root,'public/nyc-crossing/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/nyc-crossing.js'),'utf8');
 assert.match(html,/id="nyc-departure-timing"/);
 assert.match(html,/name="timingCrossing"/);
 assert.match(html,/not complete trips/);
 assert.match(html,/<noscript>/);
 assert.match(js,/renderDeparture\(data\.departure\)/);
 assert.match(js,/historically lighter/i);
 const api=fs.readFileSync(path.join(root,'api/nyc-crossing.js'),'utf8');
 assert.match(api,/compareDepartures/);
});
