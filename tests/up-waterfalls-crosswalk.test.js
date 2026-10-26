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
