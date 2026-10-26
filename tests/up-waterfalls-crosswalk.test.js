import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('USGS record-level ingest is research only and never produces published visitor pages',()=>{
 const importer=fs.readFileSync('scripts/stage-up-waterfall-usgs.mjs','utf8');
 assert.match(importer,/matching-name-and-400m-distance/);
 assert.match(importer,/No hydrography feature provides permission/);
 const pipeline=fs.readFileSync('.github/workflows/import-up-waterfalls-usgs.yml','utf8');
 assert.match(pipeline,/sciencebase.gov/);
 assert.match(pipeline,/data\/up-waterfall-usgs-crosswalk.json/);
 assert.ok(!pipeline.includes('git push origin HEAD:main'));
});

test('public USGS source crosswalk only exposes scientific matches, never visitor access or routes',()=>{
 const source=fs.readFileSync('scripts/stage-up-waterfall-usgs.mjs','utf8');
 const layer=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
 assert.match(source,/publicCrosswalk/);
 assert.match(source,/up-waterfalls-usgs-matches.json/);
 assert.match(layer,/nhdComid/);
 assert.match(layer,/Neither source establishes legal access/);
 assert.match(layer,/box.addEventListener\('change',render\)/);
 assert.ok(!layer.includes('parking.href='));
 const file='public/assets/up-waterfalls-usgs-matches.json';
 if(fs.existsSync(file)){const j=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(j.researchOnly,true);assert.ok(j.matches.every(x=>Number.isInteger(x.oid)&&!('parking' in x)&&!('landManager' in x)&&!('trail' in x)&&!('publicAccess' in x)));}
});
