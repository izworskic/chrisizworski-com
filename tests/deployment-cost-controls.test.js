import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { documentationOnly, shouldSkipBuild } from '../scripts/ignore-docs-build.mjs';
import { readPinnedSource } from '../lib/pinned-build-source.mjs';

test('only internal Markdown changes can skip a deployment', () => {
  assert.equal(documentationOnly(['docs/GROWTH_SESSION_LOG.md', 'README.md']), true);
  for (const files of [[], ['public/guide.md'], ['docs/widget.html'], ['docs/note.md', 'api/flight-assignment.js'], ['package-lock.json'], ['vercel.json'], ['tests/deployment-build-contract.test.js']])
    assert.equal(documentationOnly(files), false);
});

test('prebuilt trial is manual, main-only, and cannot publish production', () => {
  const workflow = readFileSync('.github/workflows/prebuilt-preview.yml', 'utf8');
  const triggers = workflow.split('permissions:')[0];
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /\n\s+(push|pull_request|schedule):/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /build --standalone --non-interactive/);
  assert.match(workflow, /deploy --prebuilt --yes/);
  const commands = workflow.split('\n').filter(line => /^\s+(run:|["$a-z])/.test(line) && !line.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(commands, /--prod\b|vercel.*\bpromote\b/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /VERCEL_CLI_VERSION: '63\.1\.2'/);
});

test('skip compares the whole range since deployment and builds with missing history', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'build-skip-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = message => { git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', message); return git('rev-parse', 'HEAD'); };
  try {
    git('init'); mkdirSync(path.join(cwd, 'docs')); writeFileSync(path.join(cwd, 'README.md'), 'start'); const base = commit('base');
    writeFileSync(path.join(cwd, 'docs/note.md'), 'note'); const docs = commit('docs');
    assert.equal(shouldSkipBuild({ previous: base, current: docs, cwd }), true);
    writeFileSync(path.join(cwd, 'site.js'), 'changed'); commit('code');
    writeFileSync(path.join(cwd, 'docs/note.md'), 'later note'); const current = commit('later docs');
    assert.equal(shouldSkipBuild({ previous: base, current, cwd }), false);
    assert.equal(shouldSkipBuild({ previous: '', current, cwd }), false);
    assert.equal(shouldSkipBuild({ previous: 'a'.repeat(40), current, cwd }), false);
    assert.equal(shouldSkipBuild({ previous: current, current: base, cwd }), false);
    assert.equal(shouldSkipBuild({ previous: current, current, cwd }), false);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('immutable Ballard source snapshots reject changed bytes or commit pins', () => {
  const directory = path.resolve('data/build-sources/ballard');
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  const expected = '761a041de378f1265211122b1395c3968106a94e';
  for (const label of ['main', 'tour', 'salmon', 'api']) assert.ok(readPinnedSource(directory, manifest, label, expected).length > 1000);
  assert.throws(() => readPinnedSource(directory, manifest, 'main', 'b'.repeat(40)), /invalid manifest/);
  const corrupt = structuredClone(manifest); corrupt.files.main.sha256 = '0'.repeat(64);
  assert.throws(() => readPinnedSource(directory, corrupt, 'main', expected), /integrity failure/);
});
