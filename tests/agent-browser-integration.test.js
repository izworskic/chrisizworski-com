'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const script = path.join(root, 'scripts', 'agent-browser-smoke.mjs');
const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: root, timeout: 10000 });

test('Agent Browser skill is identically installed in three agent entrypoints', () => {
  const canonical = read('.agents/skills/agent-browser-qa/SKILL.md');
  assert.match(canonical, /^---\nname: agent-browser-qa\n/);
  assert.match(canonical, /node scripts\/agent-browser\.mjs skills get core/);
  assert.match(canonical, /Playwright/);
  assert.match(canonical, /Do not auto-merge/);
  assert.equal(read('.claude/skills/agent-browser-qa/SKILL.md'), canonical);
  assert.equal(read('.github/skills/agent-browser-qa/SKILL.md'), canonical);
});

test('Agent instructions, workflow and ignored evidence are discoverable', () => {
  for (const file of ['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md', '.cursor/rules/agent-browser-qa.mdc']) {
    assert.match(read(file), /agent-browser-qa\/SKILL\.md/, file);
  }
  const guide = read('docs/AGENT_BROWSER_WORKFLOW.md');
  for (const text of ['agent-browser-smoke.mjs', 'Playwright', 'NOT VERIFIED', 'npm run verify:all', 'no-paid-infrastructure']) {
    assert.ok(guide.includes(text), text);
  }
  assert.match(read('.gitignore'), /^artifacts\/agent-browser-qa\/$/m);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.['agent-browser'], undefined);
  assert.equal(pkg.devDependencies?.['agent-browser'], undefined);
});

test('smoke dry run creates valid mobile and desktop plan without installing a browser', () => {
  const result = run(['--url', 'https://chrisizworski.com/soo-locks/', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.match(data.mode, /DRY RUN ONLY/);
  assert.ok(data.steps.some(([label, args]) => label === 'mobile-viewport' && args.join(' ') === 'set viewport 390 844'));
  assert.ok(data.steps.some(([label, args]) => label === 'desktop-viewport' && args.join(' ') === 'set viewport 1280 900'));
  assert.ok(data.steps.some(([label]) => label === 'mobile-network'));
  assert.ok(data.steps.every(([label, args]) => !['click', 'fill', 'type', 'eval', 'upload'].includes(args[0])));
});

test('smoke rejects third-party, credential, insecure public, and nonignored output paths', () => {
  for (const args of [
    ['--url', 'https://example.com/'],
    ['--url', 'http://chrisizworski.com/'],
    ['--url', 'https://someone:secret@chrisizworski.com/'],
    ['--url', 'https://chrisizworski.com.evil.example/'],
    ['--url', 'https://chrisizworski.com/', '--out', 'public/unsafe', '--dry-run'],
    []
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0, args.join(' '));
  }
  const local = run(['--url', 'http://127.0.0.1:8765/preview/', '--dry-run']);
  assert.equal(local.status, 0, local.stderr);
});
