#!/usr/bin/env node
'use strict';
// Rebuild the actual Rust engine; test it; then regenerate the existing
// 80-destination index through Rust and require byte-for-byte output parity.
// Does not write public content, alter access claims, or change SEO assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'rust/up-waterfalls-engine/src/main.rs');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'up-waterfalls-rust-'));
const binary = path.join(temporary, 'up-waterfalls-engine');
const testBinary = path.join(temporary, 'up-waterfalls-engine-tests');
const run = (program, args, extra = {}) => {
  const result = spawnSync(program, args, {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, ...extra
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0,
    program + ' ' + args.join(' ') + '\n' + (result.stderr || result.stdout));
  return result.stdout.trim();
};

try {
  run('rustc', ['--edition=2021', '-O', source, '-o', binary]);
  run('rustc', ['--edition=2021', '--test', source, '-o', testBinary]);
  run(testBinary, []);

  const html = fs.readFileSync(
    path.join(root, 'public/upper-peninsula-waterfalls/index.html'), 'utf8'
  );
  const index = JSON.parse(fs.readFileSync(
    path.join(root, 'public/assets/up-waterfalls-nearby.json'), 'utf8'
  ));
  const cards = [...html.matchAll(/<article class="waterfall-card"([^>]+)>/g)]
    .map(m => Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)]
      .map(x => [x[1], x[2]])));
  assert.equal(cards.length, 80, 'curated card ledger changed; review source policy');
  const payload = cards.map(c => [
    c.id, c.lat, c.lng, c.status, c['arrival-verified'] || 'pending'
  ].join('\t')).join('\n') + '\n';
  const output = run(binary, [], { input: payload });
  const rows = output.split('\n').filter(l => l.startsWith('ROW\t'));
  const edges = output.split('\n').filter(l => l.startsWith('EDGE\t'));
  assert.equal(rows.length, 80);
  const allowed = rows.filter(line => line.endsWith('\t1'))
    .map(line => line.split('\t')[1]).sort();
  assert.deepEqual(allowed, index.locations.map(row => row.id).sort());
  const excluded = rows.filter(line => line.endsWith('\t0'))
    .map(line => line.split('\t')[1]).sort();
  assert.deepEqual(excluded, index.excludedIds);
  for (const id of ['scott-falls', 'houghton-douglass-falls',
    'boston-creek-cascades', 'tahquamenon', 'munising-falls']) {
    assert.ok(excluded.includes(id), 'explicitly ineligible: ' + id);
  }
  for (const line of edges) {
    const [kind, a, b, miles] = line.split('\t');
    assert.equal(kind, 'EDGE');
    assert.ok(allowed.includes(a) && allowed.includes(b) && a !== b);
    assert.ok(Number.isFinite(Number(miles)) && Number(miles) <= 50);
  }

  // The production JSON remains an editorially reviewed artifact, never a
  // live parking/closure/route feed. Rust must recreate it without drift.
  run('python3', ['scripts/build-up-waterfalls-nearby.py', '--check'], {
    env: { ...process.env, UP_WATERFALL_RUST_BINARY: binary }
  });
  run('python3', ['scripts/build-up-waterfalls-nearby.py', '--check'], {
    env: { ...process.env, UP_WATERFALL_RUST_BINARY: '' }
  });
  console.log('PASS: Rust geodesic/eligibility engine, 80-card source ledger, ' +
    allowed.length + ' eligible, ' + excluded.length + ' excluded, ' +
    edges.length + ' directed edges, pinned JSON parity; no route authorization.');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
