const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Freighter and Mackinac put the live answer before the Gazette editorial block at runtime', () => {
  const gazette = read('public/assets/gazette-latest.js');
  const freighter = read('public/great-lakes-freighter-tracking/index.html');
  const mackinac = read('public/mackinac-bridge-live/index.html');

  assert.ok(freighter.includes('id="live-map"'));
  assert.ok(freighter.includes('data-gazette-placement="freighter-tracker"'));
  assert.ok(mackinac.includes('id="statusCard"'));
  assert.ok(mackinac.includes('data-gazette-placement="mackinac-conditions"'));

  assert.match(gazette, /location\.pathname === "\/great-lakes-freighter-tracking\/"/);
  assert.match(gazette, /liveMap\.insertAdjacentElement\("afterend", widget\)/);
  assert.match(gazette, /location\.pathname === "\/mackinac-bridge-live\/"/);
  assert.match(gazette, /statusCard\.insertAdjacentElement\("afterend", widget\)/);
});

test('Boat Launch near-me flow is explicit, session-only, and reuses the existing finder', () => {
  const ranking = read('public/assets/boat-launch-ranking.js');
  const html = read('public/michigan-boat-launches/index.html');

  assert.ok(html.indexOf('/assets/boat-launch-ranking.js') < html.indexOf('/assets/boat-launch-finder.js'));
  assert.match(ranking, /Use my location/);
  assert.match(ranking, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(ranking, /displayName: 'Your location'/);
  assert.match(ranking, /form\.requestSubmit/);
  assert.doesNotMatch(ranking, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(ranking, /latitude=.*searchParams|longitude=.*searchParams/);
});

test('Ballard winner remains protected on its existing canonical decision surface', () => {
  const ballard = read('public/ballard-locks/index.html');
  const pkg = JSON.parse(read('package.json'));

  assert.match(ballard, /https:\/\/chrisizworski\.com\/ballard-locks\//);
  assert.match(ballard, /Ballard Locks salmon activity/);
  assert.match(ballard, /NOAA Tides &amp; Currents/);
  assert.match(ballard, /not an official lockage count/i);
  assert.equal(pkg.dependencies['national-ballard-locks'], 'github:izworskic/national-ballard-locks#c0d0db1726dff6922efd059e3bf4da2091c01108');
});

test('Gordie Howe winner is protected because its existing page already carries the intended decision stack', () => {
  const gordie = read('public/gordie-howe-bridge-wait-time/index.html');
  const hub = read('public/michigan-border-wait-times/index.html');

  assert.match(gordie, /Official wait for your selection/);
  assert.match(gordie, /Gordie Howe Bridge Live Approach Camera/);
  assert.match(gordie, /Compare Detroit crossings/);
  assert.match(gordie, /Gordie Howe toll and payment/);
  assert.match(gordie, /Ambassador Bridge/);
  assert.match(gordie, /Detroit–Windsor Tunnel/);
  assert.match(hub, /Today vs\. Typical Hourly Waits/);
});
