'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const map = readFileSync(path.join(__dirname, '../public/assets/lake-superior-circle-tour-map.js'), 'utf8');

test('Circle Tour map renders Mackinac Bridge as a gateway, not stop 32', () => {
  assert.match(map, /const MACKINAC_GATEWAY/);
  assert.match(map, /coordinates:\s*\[-84\.72838,\s*45\.81501\]/);
  assert.match(map, /not a Circle Tour stop/);
  assert.match(map, /addSource\("route-gateways"/);
  assert.match(map, /id:"gateway-halo"/);
  assert.match(map, /id:"gateway-core"/);
  assert.match(map, /id:"gateway-label"/);
  assert.match(map, /Mackinac Bridge · gateway/);

  const routeOrder = map.match(/const ROUTE_ORDER = \[([^\]]+)\]/)?.[1] || '';
  assert.doesNotMatch(routeOrder, /mackinac|gateway|32/i);
});

test('Mackinac gateway exposes the bridge decisions without changing the Circle Tour route', () => {
  assert.match(map, /\/mackinac-bridge-live\//);
  assert.match(map, /\/mackinac-bridge-tolls\//);
  assert.match(map, /\/api\/mackinac/);
  assert.match(map, /map-gateway-open/);
  assert.match(map, /bounds:\s*\[\[-92\.5,45\.62\],\[-84\.0,49\.3\]\]/);
});
