'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const get=name=>fs.readFileSync(path.join(root,name),'utf8');
const catalog=JSON.parse(get('public/synced-national-tools/rocket-launch-live/visual-catalog.json'));
const html=get('public/synced-national-tools/rocket-launch-live/index.html');
const js=get('public/synced-national-tools/rocket-launch-live/app.js');
const css=get('public/synced-national-tools/rocket-launch-live/styles.css');
const media=require('../lib/space-coast-media');

test('all pre-approved photo items show NASA credit, exact image source and clear prior-mission contexts',()=>{
  assert.equal(catalog.schemaVersion,1);
  assert.equal(catalog.source,'NASA Image and Video Library');
  const images=[...Object.values(catalog.rockets),...Object.values(catalog.payloads)];
  let verified=0;
  for(const item of images){
    if(!item.imageUrl)continue;
    verified++;
    assert.match(item.credit,/^NASA(?:\/|$)/i);
    assert.doesNotMatch(item.credit,/SpaceX|Blue Origin|courtesy|copyright/i);
    assert.equal(item.sourceUrl,'https://images.nasa.gov/details/'+item.nasaId);
    assert.equal(item.imageUrl,
      'https://images-assets.nasa.gov/image/'+item.nasaId+'/'+item.nasaId+'~medium.jpg');
    assert.ok(item.context.length>=45, 'historic/representative image context required');
  }
  assert.ok(verified>=5);
  assert.equal(catalog.rockets['new-glenn'].imageUrl,null,
    'No unrelated or third-party New Glenn photo is silently substituted');
  assert.ok(catalog.payloads.imap.summary.includes('Interstellar'));
  assert.ok(catalog.payloads.escapade.summary.includes('Mars'));
});

test('Python NASA metadata matching and copyright rejection are verified without external network',t=>{
  const run=spawnSync('python3',['scripts/rocket_launch_visual_catalog.py','--test'],
    {cwd:root,encoding:'utf8',timeout:12000});
  if(run.error&&run.error.code==='ENOENT'){
    t.skip('Python missing locally; dedicated CI has a pinned Python runtime');
    return;
  }
  assert.equal(run.status,0,run.stderr||run.error?.message);
  assert.match(run.stderr,/Ran 8 tests/);
  assert.match(run.stderr,/OK/);
});

test('the visitor gets an image-rich mission explainer with honest matching boundaries',()=>{
  assert.match(html,/id="rocket-visuals"/);
  assert.match(html,/id="rl-visual-rocket-photo"/);
  assert.match(html,/id="rl-visual-payload-photo"/);
  assert.match(html,/id="rl-visual-family-gallery"/);
  assert.match(html,/These NASA archive photos show the rocket family/);
  assert.match(html,/id="mission-watch"/);
  assert.match(html,/v=20261110-voice-v1/);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\/"/);
  assert.match(js,/function visualImageApproved\(item\)/);
  assert.match(js,/function rocketFamily\(launch\)/);
  assert.match(js,/function matchedPayload\(launch,catalog\)/);
  assert.match(js,/function renderVisuals\(data\)/);
  assert.match(js,/loadVisualCatalog\(\);/);
  assert.match(js,/renderVisuals\(data\)/);
  assert.match(js,/visualPhoto\(payloadHost,null,/);
  assert.doesNotMatch(js,/fetch\(['"]https:\/\/images-api\.nasa\.gov/);
  assert.match(js,/NASA_CREDIT/);
  assert.match(css,/\.rl-visual-feature/);
  assert.match(css,/@media\(max-width:590px\)/);
});

test('official SpaceX YouTube channel is navigational, never falsely promoted as live webcast',()=>{
  const provider=media.operatorDirectory('SpaceX');
  assert.equal(provider.videoChannelUrl,'https://www.youtube.com/@SpaceX');
  assert.match(provider.videoChannelLabel,/not a verified stream/i);
  const fallback=media.operatorDirectory('United Launch Alliance');
  assert.equal(fallback.videoChannelUrl,undefined);
  assert.match(js,/desk\.operator\?\.videoChannelUrl/);
  assert.match(js,/desk\.operator\.videoChannelLabel/);
  assert.match(js,/youtube-nocookie\.com\/embed/);
  assert.doesNotMatch(html,/<iframe/i);
});

test('weekly Python refresh avoids duplicate APIs and only commits real content changes',()=>{
  const collector=get('scripts/rocket_launch_visual_catalog.py');
  const action=get('.github/workflows/rocket-visual-nasa-catalog.yml');
  assert.match(collector,/https:\/\/images-api\.nasa\.gov\/search/);
  assert.match(collector,/NASA_CENTERS/);
  assert.match(collector,/EXCLUDED_CREDIT/);
  assert.match(collector,/MAX_RESPONSE=1_500_000/);
  assert.match(collector,/if before!=after:/);
  assert.match(action,/cron: '26 7 \* \* 1'/);
  assert.match(action,/python3 scripts\/rocket_launch_visual_catalog\.py --test/);
  assert.match(action,/python3 scripts\/rocket_launch_visual_catalog\.py --build/);
  assert.match(action,/git diff --quiet/);
  assert.doesNotMatch(js,/images-api\.nasa\.gov/);
});
