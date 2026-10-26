import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';

test('FIELD_GUIDE_V1 reusable standard validates as a standalone package',()=>{
  const root=path.resolve('design-systems/field-guide-v1');
  const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
  const manifest=JSON.parse(readFileSync(path.join(root,'manifest.json'),'utf8'));
  assert.equal(pkg.name,'field-guide-editorial-system');
  assert.equal(manifest.id,'FIELD_GUIDE_V1');
  const run=spawnSync(process.execPath,[path.join(root,'scripts/check.mjs')],{encoding:'utf8',timeout:30000});
  assert.equal(run.status,0,(run.stdout||'')+'\n'+(run.stderr||''));
});
