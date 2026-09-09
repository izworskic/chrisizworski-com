from pathlib import Path
import json, re

OLD='be4bfe2cd3a1a35339049e7c4faa74b62c4a8e80'
NEW='e742334d61e9856be77fc613c642e845a4f3227a'

# Pin authoritative Ballard package.
p=Path('package.json')
data=json.loads(p.read_text())
cur=data['dependencies']['national-ballard-locks']
if OLD not in cur:
    raise SystemExit(f'expected Ballard pin {OLD}, got {cur}')
data['dependencies']['national-ballard-locks']=f'github:izworskic/national-ballard-locks#{NEW}'
p.write_text(json.dumps(data,indent=2)+'\n')

# Teach the production sync about the new AIS API route.
sync=Path('scripts/sync-ballard-locks.mjs')
s=sync.read_text()
s=s.replace("const sourceApi = path.join(sourceRoot, 'api', 'ballard-locks.js');\n", "const sourceApi = path.join(sourceRoot, 'api', 'ballard-locks.js');\nconst sourceAisApi = path.join(sourceRoot, 'api', 'ballard-ais.js');\n",1)
s=s.replace("const destApi = path.resolve('api/ballard-locks.js');\n", "const destApi = path.resolve('api/ballard-locks.js');\nconst destAisApi = path.resolve('api/ballard-ais.js');\n",1)
s=s.replace("if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);\n", "if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);\nif (!fs.existsSync(sourceAisApi)) throw new Error(`Ballard sync: missing ${sourceAisApi}`);\n",1)
s=s.replace("fs.copyFileSync(sourceApi, destApi);\n", "fs.copyFileSync(sourceApi, destApi);\nfs.copyFileSync(sourceAisApi, destAisApi);\n",1)
s=s.replace("if (!tourPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: tour live API hook missing');\n", "if (!tourPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: tour live API hook missing');\nif (!tourPage.includes('/api/ballard-ais')) throw new Error('Ballard sync: tour AIS API hook missing');\n",1)
sync.write_text(s)

# Replace extracted integration contract with the single-map architecture.
t=Path('tests/ballard-locks-extracted.test.js')
t.write_text(r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const pagePath = path.join(root, 'public', 'ballard-locks', 'index.html');
const tourPath = path.join(root, 'public', 'ballard-locks', 'tour', 'index.html');
const apiPath = path.join(root, 'api', 'ballard-locks.js');
const aisApiPath = path.join(root, 'api', 'ballard-ais.js');
const syncPath = path.join(root, 'scripts', 'sync-ballard-locks.mjs');

test('Ballard Locks implementation is pinned to its authoritative repository', () => {
  assert.equal(pkg.dependencies['national-ballard-locks'], 'github:izworskic/national-ballard-locks#e742334d61e9856be77fc613c642e845a4f3227a');
});

test('committed Ballard deployment mirror preserves canonical and traffic truth', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /https:\/\/chrisizworski\.com\/ballard-locks\//);
  assert.match(page, /AIS map does not represent every pleasure boat/i);
  assert.match(page, /not an official lockage count/i);
  assert.match(page, /Ballard Locks salmon activity/);
  assert.match(page, /NOAA Tides &amp; Currents/);
});

test('Ballard APIs preserve public-source boundaries and live AIS proxy', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  const ais = fs.readFileSync(aisApiPath, 'utf8');
  assert.match(source, /Washington Department of Fish & Wildlife|WDFW/);
  assert.match(source, /NOAA Tides & Currents/);
  assert.match(source, /National Weather Service/);
  assert.match(source, /USACE|U\.S\. Army Corps of Engineers/);
  assert.match(source, /ageDays|dataAgeDays/);
  assert.match(ais, /ais\.openwaters\.io\/v1\/vessels/);
  assert.match(ais, /FeatureCollection/);
  assert.match(ais, /X-Robots-Tag/);
});

test('main-site build sync installs both Ballard APIs and tour', () => {
  const sync = fs.readFileSync(syncPath, 'utf8');
  assert.match(sync, /node_modules\/national-ballard-locks/);
  assert.match(sync, /api\/ballard-locks\.js/);
  assert.match(sync, /api\/ballard-ais\.js/);
  assert.match(sync, /public\/ballard-locks/);
  assert.match(sync, /public\/sitemap\.xml/);
});

test('committed tour uses one MapLibre map for basemap, AIS, routes and stops', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const tour = fs.readFileSync(tourPath, 'utf8');
  assert.ok(page.includes('https://chrisizworski.com/ballard-locks/tour/'));
  for (const phrase of ['20 min · Essentials','45 min · Full Locks','75 min · + Ballard']) assert.ok(tour.includes(phrase));
  assert.ok(tour.includes('id="tour-map" class="map map-overlay"'));
  assert.ok(tour.includes('https://tiles.openfreemap.org/styles/liberty'));
  assert.ok(tour.includes('/api/ballard-ais'));
  assert.ok(tour.includes("map.addSource('ais-vessels'"));
  assert.ok(tour.includes("id:'ais-vessels'"));
  assert.ok(tour.includes('setInterval(loadAis,15000)'));
  assert.ok(tour.includes('interactive:true'));
  assert.ok(tour.includes('data-live-panel="fish"'));
  assert.ok(tour.includes('data-live-panel="camera"'));
  assert.ok(tour.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe'));
  assert.ok(tour.includes("closeOnClick:false"));
  assert.ok(tour.includes("map.panBy([shiftX,shiftY]"));
  assert.ok(tour.includes('map.jumpTo({center:v.center,zoom:v.zoom})'));
  assert.ok(!tour.includes('id="tour-ais-underlay"'));
  assert.ok(!tour.includes('embed.myshiptracking.com'));
  assert.ok(!tour.includes('syncAisToMap'));
  assert.ok(!tour.includes('data-live-panel="ais"'));
  assert.ok(!tour.includes('What this map adds'));
});
''')

# Strengthen permanent production smoke for the new architecture + AIS API.
smoke=Path('scripts/ballard-production-smoke.mjs')
ss=smoke.read_text()
ss=ss.replace("const API = 'https://chrisizworski.com/api/ballard-locks';\n", "const API = 'https://chrisizworski.com/api/ballard-locks';\nconst AIS_API = 'https://chrisizworski.com/api/ballard-ais';\n",1)

new_tour=r'''async function waitForTour() {
  let last;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      last = await fetchText(TOUR + '?smoke=' + Date.now(), 15000);
      const ready = last.response.ok
        && last.text.includes('Ballard Locks Self-Guided Tour Map')
        && last.text.includes('20 min · Essentials')
        && last.text.includes('45 min · Full Locks')
        && last.text.includes('75 min · + Ballard')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('/api/ballard-ais')
        && last.text.includes('activePopup=null')
        && last.text.includes('if(activePopup&&activePopup!==popup)activePopup.remove()')
        && last.text.includes('id="tour-map" class="map map-overlay"')
        && last.text.includes('https://tiles.openfreemap.org/styles/liberty')
        && last.text.includes("map.addSource('ais-vessels'")
        && last.text.includes("id:'ais-vessels'")
        && last.text.includes('setInterval(loadAis,15000)')
        && last.text.includes('interactive:true')
        && last.text.includes('id="map-live-dock"')
        && last.text.includes('data-live-panel="fish"')
        && !last.text.includes('data-live-panel="ais"')
        && last.text.includes('data-live-panel="camera"')
        && last.text.includes("closeOnClick:false")
        && last.text.includes("map.panBy([shiftX,shiftY")
        && last.text.includes('map.jumpTo({center:v.center,zoom:v.zoom})')
        && last.text.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe')
        && last.text.includes('Sockeye')
        && last.text.includes('Chinook')
        && last.text.includes('Coho')
        && !last.text.includes('id="tour-ais-underlay"')
        && !last.text.includes('embed.myshiptracking.com')
        && !last.text.includes('syncAisToMap')
        && !last.text.includes('What this map adds');
      if (ready) return last;
      console.log('Ballard tour not ready (attempt ' + attempt + '/18, HTTP ' + last.response.status + '); retrying.');
    } catch (error) {
      console.log('Ballard tour attempt ' + attempt + '/18 failed: ' + error.message);
    }
    await sleep(5000);
  }
  throw new Error('Ballard tour did not become ready' + (last ? ' (last HTTP ' + last.response.status + ')' : ''));
}

async function waitForAisContract() {
  let last;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const aisApi = await fetchText(`${AIS_API}?smoke=${Date.now()}`, 20000);
      const aisData = parseJson(aisApi.text);
      last = { aisApi, aisData };
      const features = aisData?.featureCollection?.features;
      const generated = Date.parse(aisData?.generatedAt || '');
      const fresh = Number.isFinite(generated) && Math.abs(Date.now() - generated) <= 10 * 60 * 1000;
      const countMatches = Array.isArray(features) && Number.isFinite(aisData?.count) && aisData.count === features.length;
      if (aisApi.response.ok && aisData?.ok && aisData?.source === 'Open Waters AIS' && aisData?.featureCollection?.type === 'FeatureCollection' && countMatches && fresh) {
        const robots = String(aisApi.response.headers.get('x-robots-tag') || '').toLowerCase();
        if (!robots.includes('noindex')) throw new Error(`Ballard AIS API missing noindex header: ${robots || '(none)'}`);
        if (features.length) {
          const f = features[0];
          const c = f?.geometry?.coordinates;
          if (f?.geometry?.type !== 'Point' || !Array.isArray(c) || !Number.isFinite(Number(c[0])) || !Number.isFinite(Number(c[1]))) throw new Error('Ballard AIS API returned invalid vessel geometry');
        }
        return last;
      }
      console.log(`Ballard AIS contract not ready (attempt ${attempt}/24, HTTP ${aisApi.response.status}, count=${aisData?.count ?? 'n/a'}); retrying.`);
    } catch (error) {
      console.log(`Ballard AIS readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Ballard production AIS API did not become ready${last ? `; last payload: ${last.aisApi.text.slice(0,500)}` : ''}`);
}
'''
pattern=r'async function waitForTour\(\) \{[\s\S]*?\n\}\n\nasync function waitForApiContract\(\)'
m=re.search(pattern,ss)
if not m:
    raise SystemExit('waitForTour smoke block not found')
ss=ss[:m.start()]+new_tour+'\nasync function waitForApiContract()'+ss[m.end():]

ss=ss.replace("const page = await waitForPage();\nconst tour = await waitForTour();\n", "const page = await waitForPage();\nconst tour = await waitForTour();\nconst { aisApi, aisData } = await waitForAisContract();\n",1)
ss=ss.replace("  apiStatus: api.response.status,\n  apiMs: api.elapsedMs,\n", "  apiStatus: api.response.status,\n  apiMs: api.elapsedMs,\n  aisStatus: aisApi.response.status,\n  aisMs: aisApi.elapsedMs,\n  aisCount: aisData.count,\n",1)
smoke.write_text(ss)
