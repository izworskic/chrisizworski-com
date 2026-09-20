const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/saginaw-bay-ecology/index.html'),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/saginaw-bay-authority-next-wave-2026-09-20.json'),'utf8'));

test('Saginaw Bay next-wave treatment preserves the winning depth owner',()=>{
  assert.match(html,/<title>How Deep Is Saginaw Bay\? Depth, Ecology &amp; Fishing<\/title>/);
  assert.match(html,/<meta name="description" content="Saginaw Bay is about 19 feet deep in the Inner Bay and exceeds 100 feet in the Outer Bay\. Compare its basins, fishing areas, ecology, and water quality\.">/);
  assert.match(html,/<h1>How Deep Is Saginaw Bay\? Depth, Ecology &amp; Fishing Areas<\/h1>/);
  assert.match(html,/id="saginaw-depth-answer"/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/saginaw-bay-ecology\/">/);
});

test('Saginaw Bay adds original depth explanation and official navigation boundary',()=>{
  assert.match(html,/id="depth-profile-title"/);
  assert.match(html,/Simplified depth profile from the Saginaw River/);
  assert.match(html,/not a navigation chart/i);
  assert.match(html,/nauticalcharts\.noaa\.gov\/charts\/noaa-custom-charts\.html/);
  assert.match(html,/For real navigation/);
});

test('Saginaw Bay page now hands authority into relevant live decisions',()=>{
  for(const href of [
    'https://saginawbay.chrisizworski.com/map.html',
    '/michigan-boat-launches/saginaw-bay/',
    '/great-lakes-beaches/saginaw-bay/',
    '/great-lakes-buoys/'
  ]) assert.ok(html.includes('href="'+href+'"'),href);
});

test('Saginaw Bay release gate remains AdSense-safe and avoids query doorway expansion',()=>{
  let score=0;
  score+=html.includes('id="depth-profile-title"')?30:0;
  score+=html.includes('How Deep Is Saginaw Bay?')&&html.includes('id="saginaw-depth-answer"')?25:0;
  score+=html.includes('nauticalcharts.noaa.gov/charts/noaa-custom-charts.html')?20:0;
  score+=cfg.treatment.add.length>=5?15:0;
  score+=cfg.treatment.noNewIndexablePage===true&&cfg.treatment.adDensityChange===false&&!html.includes('data-ad-slot="1011148508"')?10:0;
  assert.equal(score,100);
  assert.ok(score>=cfg.valueFunction.releaseThreshold);
});
