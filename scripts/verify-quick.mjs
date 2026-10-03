#!/usr/bin/env node
// Fast pre-flight (~30s). Runs the handful of checks that most often turn main red, so an agent
// finds out before pushing instead of after it has deployed.
//
//   npm run verify:quick
//
// This is NOT a substitute for `npm run verify:all`, which stays the merge gate. It is the
// cheap check to run first, and after every fix, while you work.
//
// What each step catches (each of these has broken main in practice):
//   - API contract: a new /api route that forgot X-Robots-Tag.
//   - Registry tests + benchmark: a card added to /tools/ with no tool-network registry node.
//   - Creator contract: a tool on a separate host not listed in creator-entity-contract.json.
//   - Freshness: a sitemap lastmod that disagrees with the page's dateModified.
//
// Freshness derives each page's real date from git history, so on a shallow clone it reports a
// false failure for hundreds of pages (and running the stamper there would rewrite them wrongly).
// It is skipped, loudly, on a shallow clone. Run `git fetch --unshallow` first to include it.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
}

const shallow = run('git', ['rev-parse', '--is-shallow-repository']).stdout.trim() === 'true';

const steps = [
  ['API contract (noindex on every /api route)', ['node', '--test', 'tests/api-contract.test.js']],
  ['Tool-network registry tests', ['node', '--test', 'tests/tool-network-registry.test.js', 'tests/tool-network-repair.test.js']],
  ['Registry benchmark (every Tools card is registered)', ['node', 'scripts/benchmark-tool-network-registry.mjs', '--check']],
  ['Creator-entity contract (every separate-host tool is covered)', ['node', '--test', 'tests/creator-entity-contract.test.js']],
  ['Freshness (sitemap lastmod vs dateModified)', ['node', 'scripts/stamp-freshness.mjs', '--check'], { needsHistory: true }],
];

let failed = 0;
let skipped = 0;
const started = Date.now();

for (const [name, cmd, opts = {}] of steps) {
  if (opts.needsHistory && shallow) {
    skipped += 1;
    console.log(`SKIP  ${name}\n      shallow clone: dates come from git history. Run \`git fetch --unshallow\` to include this check.`);
    continue;
  }
  const t = Date.now();
  const r = run(cmd[0], cmd.slice(1));
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (r.status === 0) {
    console.log(`PASS  ${name} (${secs}s)`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name} (${secs}s)`);
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    const interesting = out.filter((l) => /not ok|error:|Fatal gaps|FAIL|FAILED|Unregistered|^\s+- |missing|must /i.test(l));
    console.log((interesting.length ? interesting : out.slice(-12)).slice(0, 14).map((l) => `      ${l}`).join('\n'));
  }
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log('');
if (failed) {
  console.log(`verify:quick FAILED: ${failed} check(s) red (${total}s). Fix these before pushing.`);
  process.exit(1);
}
console.log(`verify:quick passed (${total}s)${skipped ? `, ${skipped} skipped` : ''}.`);
console.log('This is a pre-flight only. `npm run verify:all` is still the gate that must be green before a PR.');
