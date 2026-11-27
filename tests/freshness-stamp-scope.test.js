'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// A feature PR must be able to restamp only the pages it changed. The full stamper
// also corrects every other lagging page on the site and drags them into the PR.
test('--changed stamps only pages changed on the branch and their sitemap entries', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'freshness-scope-'));
  const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  const when = d => ({ GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com', GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d });
  const page = (date, body) => `<script type="application/ld+json">{"dateModified":"${date}"}</script>\n<p>${body}</p>\n`;
  const map = (a, b) => `<urlset><url><loc>https://chrisizworski.com/a/</loc><lastmod>${a}</lastmod></url><url><loc>https://chrisizworski.com/b/</loc><lastmod>${b}</lastmod></url></urlset>\n`;
  try {
    mkdirSync(path.join(root, 'scripts'));
    mkdirSync(path.join(root, 'public/a'), { recursive: true });
    mkdirSync(path.join(root, 'public/b'), { recursive: true });
    copyFileSync(path.join(__dirname, '../scripts/stamp-freshness.mjs'), path.join(root, 'scripts/stamp-freshness.mjs'));
    // Both pages claim October 1; both content changes land later, so both lag.
    writeFileSync(path.join(root, 'public/a/index.html'), page('2026-10-01', 'a1'));
    writeFileSync(path.join(root, 'public/b/index.html'), page('2026-10-01', 'b1'));
    writeFileSync(path.join(root, 'public/sitemap.xml'), map('2026-10-01', '2026-10-01'));
    assert.equal(run('git', ['init', '-q', '-b', 'main']).status, 0);
    run('git', ['add', '.']);
    assert.equal(run('git', ['commit', '-qm', 'base'], when('2026-10-01T12:00:00-04:00')).status, 0);
    writeFileSync(path.join(root, 'public/b/index.html'), page('2026-10-01', 'b2 unrelated edit on main'));
    run('git', ['add', '.']);
    assert.equal(run('git', ['commit', '-qm', 'unrelated'], when('2026-10-20T12:00:00-04:00')).status, 0);
    assert.equal(run('git', ['checkout', '-qb', 'feature']).status, 0);
    writeFileSync(path.join(root, 'public/a/index.html'), page('2026-10-01', 'a2 feature edit'));
    run('git', ['add', '.']);
    assert.equal(run('git', ['commit', '-qm', 'feature'], when('2026-11-27T12:00:00-05:00')).status, 0);

    const scoped = run(process.execPath, ['scripts/stamp-freshness.mjs', '--changed=main']);
    assert.equal(scoped.status, 0, scoped.stdout + scoped.stderr);
    assert.match(scoped.stdout, /stamped 1 pages .*scoped to 1 changed page/);
    assert.match(readFileSync(path.join(root, 'public/a/index.html'), 'utf8'), /"dateModified":"2026-11-27"/);
    assert.match(readFileSync(path.join(root, 'public/b/index.html'), 'utf8'), /"dateModified":"2026-10-01"/, 'unrelated page untouched');
    assert.equal(readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8'), map('2026-11-27', '2026-10-01'));

    const only = run(process.execPath, ['scripts/stamp-freshness.mjs', '--only=/b/']);
    assert.equal(only.status, 0, only.stdout + only.stderr);
    assert.match(readFileSync(path.join(root, 'public/b/index.html'), 'utf8'), /"dateModified":"2026-10-20"/);
    assert.equal(readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8'), map('2026-11-27', '2026-10-20'));

    const mixed = run(process.execPath, ['scripts/stamp-freshness.mjs', '--check', '--changed']);
    assert.equal(mixed.status, 2);
    assert.match(mixed.stderr, /always audits the whole site/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a failing check points feature branches at the scoped stamper first', () => {
  const src = readFileSync(path.join(__dirname, '../scripts/stamp-freshness.mjs'), 'utf8');
  assert.match(src, /stamp-freshness\.mjs --changed {3}\(stamps only the pages this branch changed\)/);
  assert.doesNotMatch(src, /console\.error\("Run: node scripts\/stamp-freshness\.mjs"\)/);
});
