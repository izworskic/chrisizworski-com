const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const live=read('public/mackinac-bridge-live/index.html');
const toll=read('public/mackinac-bridge-tolls/index.html');
const logic=read('public/assets/mackinac-toll-calculator.js');
const sitemap=read('public/sitemap.xml');
test('official status comes before editorial Gazette and retains source safeguards',()=>{
  const direct=live.indexOf('id="mackinac-conditions-answer"');
  const status=live.indexOf('id="statusCard"');
  const gazette=live.indexOf('class="gazette-daily"');
  assert.ok(direct>=0&&status>direct&&gazette>status,'Authority status immediately precedes secondary journalism');
  assert.match(live,/will not infer an .open. answer if that official source is unavailable/i);
  assert.match(live,/id="officialUpdated"/);
  assert.match(live,/id="refreshButton"/);
  assert.match(live,/class="toll-section"/);
  assert.match(live,/<title>Mackinac Bridge Conditions Today: Live Status &amp; Wind<\/title>/);
  assert.match(live,/href="https:\/\/chrisizworski.com\/mackinac-bridge-live\/"/);
});
test('toll route presents standard dynamic return journey without inventing MacPass benefit',()=>{
  assert.match(toll,/<title>Mackinac Bridge Toll: \$4 Car \| Calculator \| Chris Izworski<\/title>/);
  assert.match(toll,/id="guideTollTotal"/);
  assert.match(toll,/id="guideRoundTripTotal"/);
  assert.match(toll,/id="guideMotorhomeAuto"/);
  assert.match(toll,/before any MacPass discount/);
  assert.match(toll,/Eligible MacPass passenger vehicles may qualify/);
  assert.match(logic,/byId\("guideTollTotal"\)\.textContent/);
  assert.match(logic,/standardReturn\.textContent = "\$" \+ \(2 \* result\.total\)\.toFixed\(2\)/);
  assert.match(toll,/href="\/mackinac-bridge-live\/"/);
  assert.match(live,/href="\/mackinac-bridge-tolls\/"/);
});
test('only genuinely revised bridge canonical dates advance',()=>{
  const liveStamp = live.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
  const tollStamp = toll.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
  assert.ok(liveStamp >= '2026-10-26', 'live status should be dated no earlier than initial source review');
  assert.equal(tollStamp, '2026-10-26', 'unchanged toll page keeps its Oct 26 source review');
  for(const [slug,stamp] of [['mackinac-bridge-live',liveStamp],['mackinac-bridge-tolls',tollStamp]]){
    const pattern = new RegExp('https:\\/\\/chrisizworski\\.com\\/'+slug+'\\/<\\/loc>\\s*<lastmod>'+stamp+'<\\/lastmod>');
    assert.match(sitemap,pattern,'sitemap lastmod must match '+slug+' source date');
  }
});
