const test = require('node:test');
const assert = require('node:assert/strict');

const LPMS = 'https://ndc.ops.usace.army.mil/ords/lpms/lock_status_report_json?in_river_code=MI';
const NTNI = 'https://ndc.ops.usace.army.mil/ords/ntni/json_data/notices_by_district/MVS';
const WATER = 'https://water.usace.army.mil/office/mvs/reports/chart?basin=Mississippi&tsid1=Mel+Price+TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&type=macro';

test('inspect Melvin Price upstream source shapes', { timeout: 45000 }, async () => {
  const headers = { 'user-agent':'MelvinPriceUpstreamDiagnostic/1.0', 'cache-control':'no-cache' };
  const [lpmsR, ntniR, waterR] = await Promise.all([
    fetch(LPMS, {headers, signal:AbortSignal.timeout(15000)}),
    fetch(NTNI, {headers, signal:AbortSignal.timeout(15000)}),
    fetch(WATER, {headers, signal:AbortSignal.timeout(15000)}),
  ]);
  const [lpms, ntni, water] = await Promise.all([lpmsR.text(), ntniR.text(), waterR.text()]);
  console.log(`LPMS_DIAG status=${lpmsR.status} len=${lpms.length}`);
  const pos = 733;
  const lo = Math.max(0,pos-180), hi=Math.min(lpms.length,pos+220);
  console.log('LPMS_AROUND_BAD_CHAR ' + JSON.stringify(lpms.slice(lo,hi)));
  console.log('LPMS_CHAR_CODES ' + JSON.stringify([...lpms.slice(pos-20,pos+20)].map(c=>c.charCodeAt(0))));

  console.log(`NTNI_DIAG status=${ntniR.status} len=${ntni.length}`);
  try {
    const data=JSON.parse(ntni); const items=Array.isArray(data)?data:(data.items||data.notices||data.results||[]);
    const rel=items.filter(x=>JSON.stringify(x).toLowerCase().match(/melvin price|mel price|mi26|mi 26|200\.5|pool_26|pool 26/));
    console.log('NTNI_RELEVANT ' + JSON.stringify(rel.slice(0,3),null,2));
  } catch(e) { console.log('NTNI_PARSE_ERROR '+e.message+' '+ntni.slice(0,1200)); }

  console.log(`WATER_DIAG status=${waterR.status} len=${water.length}`);
  const snippets=[]; let i=0;
  while((i=water.toLowerCase().indexOf('mel price tw',i))>=0 && snippets.length<15){snippets.push(water.slice(Math.max(0,i-400),Math.min(water.length,i+800)));i+=10;}
  console.log('WATER_MEL_PRICE_SNIPPETS '+JSON.stringify(snippets));
  const tsids=[...water.matchAll(/tsid1=([^&"'<>\s]+)/gi)].map(m=>{try{return decodeURIComponent(m[1].replace(/\+/g,' '));}catch{return m[1];}});
  console.log('WATER_TSIDS '+JSON.stringify([...new Set(tsids.filter(x=>/mel price/i.test(x)))]));
  assert.ok(lpmsR.ok && ntniR.ok && waterR.ok);
});
