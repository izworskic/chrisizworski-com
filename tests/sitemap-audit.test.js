import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
test('full sitemap audit fails on absent files, wrong canonicals and noindex, allows overlapping maps', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sitemap-audit-'));
  const write = async (file, content) => { await fs.mkdir(path.dirname(path.join(dir,file)),{recursive:true}); await fs.writeFile(path.join(dir,file),content); };
  const url = 'https://chrisizworski.com/example/';
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`;
  const run = () => spawnSync(process.execPath,['scripts/audit-sitemap-canonicals.mjs','--check'],{cwd:dir,encoding:'utf8'});
  try {
    await write('scripts/audit-sitemap-canonicals.mjs',await fs.readFile(path.join(root,'scripts/audit-sitemap-canonicals.mjs'),'utf8'));
    await write('vercel.json',JSON.stringify({rewrites:[],redirects:[]}));
    await write('public/robots.txt','Sitemap: https://chrisizworski.com/sitemap.xml\n');
    await write('public/sitemap.xml',xml);
    assert.match(run().stdout,/missing published document/);
    await write('public/example/index.html',`<link href="${url}" rel="canonical"><script>const example = '<meta name="robots" content="noindex">';</script>`);
    await write('public/sitemap-winter.xml',xml);
    assert.equal(run().status,0);
    await write('public/example/index.html','<link rel="canonical" href="https://chrisizworski.com/wrong/">');
    assert.notEqual(run().status,0);
    assert.match(run().stdout,/canonical mismatch/);
    await write('public/example/index.html',`<link rel="canonical" href="${url}"><meta content="noindex,follow" name="robots">`);
    assert.notEqual(run().status,0);
    assert.match(run().stdout,/noindex page/);
    await write('public/example/index.html',`<link rel="canonical" href="${url}">`);
    await write('public/sitemap.xml',xml.replace('</urlset>',`<url><loc>${url}</loc></url></urlset>`));
    assert.notEqual(run().status,0);
    assert.match(run().stdout,/duplicate loc/);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
