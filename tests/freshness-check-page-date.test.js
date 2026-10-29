const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('freshness check compares sitemap to the actual page date within the allowed git-history lag', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'freshness-page-date-'));
  const run = (command, args, extraEnv = {}) => spawnSync(command, args, {
    cwd: root, encoding: 'utf8', env: { ...process.env, ...extraEnv }
  });
  try {
    mkdirSync(path.join(root, 'scripts'));
    mkdirSync(path.join(root, 'public'));
    copyFileSync(path.join(__dirname, '../scripts/stamp-freshness.mjs'), path.join(root, 'scripts/stamp-freshness.mjs'));
    writeFileSync(path.join(root, 'public/index.html'), '<script type="application/ld+json">{"dateModified":"2026-10-25"}</script>\n');
    const map = date => `<urlset><url><loc>https://chrisizworski.com/</loc><lastmod>${date}</lastmod></url></urlset>\n`;
    writeFileSync(path.join(root, 'public/sitemap.xml'), map('2026-10-25'));
    assert.equal(run('git', ['init', '-q']).status, 0);
    assert.equal(run('git', ['add', '.']).status, 0);
    const env = { GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com', GIT_AUTHOR_DATE: '2026-10-29T12:00:00-04:00', GIT_COMMITTER_DATE: '2026-10-29T12:00:00-04:00' };
    assert.equal(run('git', ['commit', '-qm', 'fixture'], env).status, 0);
    const aligned = run(process.execPath, ['scripts/stamp-freshness.mjs', '--check']);
    assert.equal(aligned.status, 0, aligned.stdout + aligned.stderr);
    writeFileSync(path.join(root, 'public/sitemap.xml'), map('2026-10-29'));
    const mismatched = run(process.execPath, ['scripts/stamp-freshness.mjs', '--check']);
    assert.equal(mismatched.status, 1);
    assert.match(mismatched.stdout + mismatched.stderr, /sitemap lastmod entries disagree/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
