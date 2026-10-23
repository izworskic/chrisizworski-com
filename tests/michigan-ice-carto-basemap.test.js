import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('public/michigan-ice/freeze-up.js','utf8');
test('Great Lakes freeze-up map uses public CARTO config, never keyless CARTO, and provides OSM fallback',()=>{
  execFileSync(process.execPath,['--check','public/michigan-ice/freeze-up.js']);
  assert.match(source,/fetch\('\/api\/carto-basemap-config'/);
  assert.match(source,/rastertiles\/voyager\/\{z\}\/\{x\}\/\{y\}\{r\}\.png\?key=/);
  assert.match(source,/encodeURIComponent\(config\.key\.trim\(\)\)/);
  assert.match(source,/tile\.openstreetmap\.org/);
  assert.match(source,/basemap\.on\('tileerror'/);
  assert.match(source,/CARTO basemap unavailable; showing OpenStreetMap instead/);
  assert.doesNotMatch(source,/basemaps\.cartocdn\.com\/light_all/);
  assert.match(source,/Not a safe-ice assessment/);
});
