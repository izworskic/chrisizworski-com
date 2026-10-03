#!/usr/bin/env node
// The repository gate. Same steps as before, same strictness, two changes in how it reports:
//
//   1. It runs EVERY step and lists every failure at the end, instead of stopping at the first
//      one. The old `a && b && c && ...` chain meant an agent fixed one failure, reran, found the
//      next, and so on; the gate looked like a moving target ("multiple issues") when it was really
//      a fixed list. Exit code is still non-zero if anything failed.
//
//   2. It refuses to call a shallow clone green. The freshness step derives dates from git
//      history and is meaningless on a shallow clone (hundreds of false mismatches). The gate
//      tries `git fetch --unshallow` first; if the clone is still shallow it skips freshness, says
//      so, and exits non-zero as INCOMPLETE. CI checks out full history, so it is unaffected.
//
// Usage: npm run verify:all            (what CI runs)
//        npm run verify:all -- --fail-fast   (old behaviour, stop at first failure)
//
// The step list is the "verify:all" script in package.json. Do not remove or weaken a step to make
// a branch pass: fix the code, or fix the assertion in a commit whose message says so (AGENTS.md §6c).

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const FAIL_FAST = process.argv.includes('--fail-fast');

// The step list lives in package.json ("verify:all": "node scripts/verify-all.mjs test verify ...")
// so that each benchmark's own "am I still in the gate?" guard keeps working, and so an agent
// reading package.json still sees the whole gate. A token starting with "--" is an argument to the
// step before it. Add a step by adding it there, not here.
const STEPS = [];
for (const tok of process.argv.slice(2)) {
  if (tok === '--fail-fast') continue;
  if (tok.startsWith('--')) STEPS[STEPS.length - 1].push(tok);
  else STEPS.push([tok]);
}
if (!STEPS.length) {
  console.error('verify-all: no steps given. Run it via `npm run verify:all`.');
  process.exit(2);
}
for (const s of STEPS) if (s[0] === 'freshness') s.push({ needsHistory: true });

// Show what failed, not the last 25 lines of a 6,000-line TAP log: for node --test output pull
// each "not ok" with its location/assertion block; otherwise fall back to the tail.
function excerpt(out) {
  const lines = out.split('\n');
  const picked = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*not ok /.test(lines[i])) {
      picked.push(lines[i]);
      for (let j = i + 1; j < Math.min(lines.length, i + 40); j++) {
        if (/^\s*(ok|not ok|# Subtest) /.test(lines[j]) || /^\s*\.\.\.\s*$/.test(lines[j])) break;
        if (/location:|error:|The expression|expected|actual|operator|^\s{6,}\S/.test(lines[j])) picked.push(lines[j]);
      }
      picked.push('');
    }
  }
  if (picked.length) return picked.join('\n').trim();
  return lines.filter((l) => l.trim()).slice(-25).join('\n');
}

function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

function isShallow() {
  return git(['rev-parse', '--is-shallow-repository']).stdout.trim() === 'true';
}

let shallow = isShallow();
if (shallow) {
  console.log('Shallow clone detected; fetching full history so freshness can be checked...');
  git(['fetch', '--unshallow', '--quiet']);
  shallow = isShallow();
  if (shallow) console.log('  could not unshallow (no network or no remote). Freshness will be skipped.\n');
}

const failures = [];
let skippedFreshness = false;
const started = Date.now();

for (const step of STEPS) {
  const opts = typeof step[step.length - 1] === 'object' ? step[step.length - 1] : {};
  const parts = step.filter((p) => typeof p === 'string');
  const [script, ...extra] = parts;
  const label = parts.join(' ');

  if (opts.needsHistory && shallow) {
    skippedFreshness = true;
    console.log(`SKIP  ${label}  (shallow clone; CI will run it with full history)`);
    continue;
  }

  const args = ['run', script, ...(extra.length ? ['--', ...extra] : [])];
  const t = Date.now();
  const r = spawnSync('npm', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (r.status === 0) {
    console.log(`ok    ${label}  (${secs}s)`);
  } else {
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    failures.push({ label, tail: excerpt(out) });
    console.log(`FAIL  ${label}  (${secs}s)`);
    if (FAIL_FAST) break;
  }
}

const total = ((Date.now() - started) / 1000).toFixed(0);
console.log(`\n${'='.repeat(78)}`);
if (failures.length) {
  console.log(`REPOSITORY GATE: ${failures.length} of ${STEPS.length} steps failed (${total}s). All failures:\n`);
  for (const f of failures) {
    console.log(`--- ${f.label} ---`);
    console.log(f.tail.replace(/^/gm, '    '));
    console.log();
  }
  console.log('Fix the code, or fix an assertion in a commit whose message says why. Do not skip a step.');
}
if (skippedFreshness) {
  console.log('REPOSITORY GATE: INCOMPLETE. Freshness was not checked (shallow clone). Run `git fetch --unshallow` and rerun, or let CI decide.');
}
if (!failures.length && !skippedFreshness) {
  console.log(`REPOSITORY GATE: all ${STEPS.length} steps passed (${total}s).`);
}
process.exit(failures.length || skippedFreshness ? 1 : 0);
