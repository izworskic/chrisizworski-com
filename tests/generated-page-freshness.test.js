import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('full-history freshness catches a generator-only change without tracked child HTML', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'generated-freshness-'));
  const write = async (name, content) => {
    const file = path.join(workspace, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  };
  const git = args => execFileSync('git', args, { cwd: workspace, stdio: 'pipe' });
  const commit = (date, message) => {
    git(['add', '.']);
    execFileSync('git', ['commit', '-qm', message], { cwd: workspace, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: date + 'T12:00:00-04:00', GIT_COMMITTER_DATE: date + 'T12:00:00-04:00' } });
  };
  const stamp = check => spawnSync(process.execPath, ['scripts/stamp-freshness.mjs', ...(check ? ['--check'] : [])], { cwd: workspace, encoding: 'utf8' });
  try {
    git(['init', '-q', '--initial-branch=main']);
    git(['config', 'user.name', 'Freshness Fixture']);
    git(['config', 'user.email', 'freshness@example.invalid']);
    const parent = '/national-tools/ice-out/';
    const child = parent + 'houghton-lake-michigan/';
    await write('scripts/stamp-freshness.mjs', await fs.readFile(path.join(root, 'scripts/stamp-freshness.mjs'), 'utf8'));
    await write('public/national-tools/ice-out/index.html', '<script type="application/ld+json">{"dateModified":"2026-09-29"}</script>');
    await write('scripts/generate-ice-out-location-pages.mjs', '// initial generator\n');
    await write('benchmarks/ice-out-content-dates.json', JSON.stringify({ parent, generator: 'scripts/generate-ice-out-location-pages.mjs', generatorModified: '2026-10-01', pages: [child] }));
    await write('public/sitemap-ice-out.xml', `<urlset><url><loc>https://chrisizworski.com${parent}</loc><lastmod>2026-09-29</lastmod></url><url><loc>https://chrisizworski.com${child}</loc><lastmod>2026-10-01</lastmod></url></urlset>`);
    commit('2026-09-29', 'Parent template');
    await write('scripts/generate-ice-out-location-pages.mjs', '// established lake content\n');
    commit('2026-10-01', 'Established generator');
    const initial = stamp(true);
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    await write('scripts/generate-ice-out-location-pages.mjs', '// changed lake content without a parent edit\n');
    commit('2026-10-05', 'Generator content update');
    const stale = stamp(true);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /generated-page content date does not match the generator's git history/);
    const repaired = stamp(false);
    assert.equal(repaired.status, 0, repaired.stdout + repaired.stderr);
    const ledger = JSON.parse(await fs.readFile(path.join(workspace, 'benchmarks/ice-out-content-dates.json'), 'utf8'));
    assert.equal(ledger.generatorModified, '2026-10-05');
    const sitemap = await fs.readFile(path.join(workspace, 'public/sitemap-ice-out.xml'), 'utf8');
    assert.ok(sitemap.includes(`<loc>https://chrisizworski.com${child}</loc><lastmod>2026-10-05</lastmod>`));
    assert.ok(sitemap.includes(`<loc>https://chrisizworski.com${parent}</loc><lastmod>2026-09-29</lastmod>`));
    assert.equal(stamp(true).status, 0);
  } finally { await fs.rm(workspace, { recursive: true, force: true }); }
});
