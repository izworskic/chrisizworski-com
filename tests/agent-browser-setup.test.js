'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { spawnSync }=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('pinned local installer supports a non-mutating dry run',()=>{
  const out=spawnSync(process.execPath,['scripts/setup-agent-browser.mjs','--dry-run'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(out.status,0,out.stderr);
  const plan=JSON.parse(out.stdout);
  assert.equal(plan.version,'0.43.0');
  assert.match(plan.mode,/DRY RUN/);
  assert.ok(plan.binary.includes('.agent-tools'));
  assert.ok(plan.steps.some(([exe,args])=>exe==='npm' && args.includes('agent-browser@0.43.0')));
  assert.ok(plan.steps.some(([,args])=>args[0]==='install'));
});

test('browser commands use isolated binaries and leave production dependencies alone',()=>{
  const install=read('scripts/setup-agent-browser.mjs'), smoke=read('scripts/agent-browser-smoke.mjs');
  const proxy=read('scripts/agent-browser.mjs'), ignore=read('.gitignore');
  assert.match(install,/package-lock=false/);
  assert.match(install,/--include=optional/);
  assert.match(smoke,/localBrowser/);
  assert.match(proxy,/\.agent-tools/);
  assert.match(ignore,/^\.agent-tools\/$/m);
  assert.doesNotMatch(install,/npm install -g/);
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.['agent-browser'],undefined);
  assert.equal(pkg.devDependencies?.['agent-browser'],undefined);
});

test('browser workflow installs real Chrome without exporting unsanitized captures',()=>{
  const yaml=read('.github/workflows/agent-browser-qa.yml');
  assert.match(yaml,/workflow_dispatch:/);
  assert.match(yaml,/pull_request:/);
  assert.match(yaml,/node-version: '24'/);
  assert.match(yaml,/run: node scripts\/setup-agent-browser\.mjs/);
  assert.match(yaml,/node scripts\/agent-browser-smoke\.mjs --url https:\/\/chrisizworski\.com/);
  assert.match(yaml,/mobile\.png/);
  assert.match(yaml,/desktop\.png/);
  assert.doesNotMatch(yaml,/upload-artifact@/);
});
