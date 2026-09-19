const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('the production injector puts one correct AdSense loader in every Petoskey content head', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'petoskey-ads-'));
  try {
    fs.cpSync(path.join(root, 'public/petoskey-wine'), path.join(temp, 'public/petoskey-wine'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'public/tools'), { recursive: true });
    fs.copyFileSync(path.join(root, 'public/tools/index.html'), path.join(temp, 'public/tools/index.html'));
    // Exercise the actual build entrypoint twice, including its idempotence.
    for (let i = 0; i < 2; i++) execFileSync(process.execPath, [path.join(root, 'scripts/inject-ga4.mjs')], { cwd: temp });
    const pages = fs.readdirSync(path.join(temp, 'public/petoskey-wine'), { recursive: true }).filter(p => p.endsWith('.html'));
    let contentCount = 0;
    for (const file of pages) {
      const html = fs.readFileSync(path.join(temp, 'public/petoskey-wine', file), 'utf8');
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
      assert.match(head, /name="google-adsense-account" content="ca-pub-8222782620788075"/, file);
      const loaders = head.match(/<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8222782620788075"[^>]*>/g) || [];
      if (file.includes('404')) {
        assert.equal(loaders.length, 0, file);
      } else {
        contentCount++;
        assert.equal(loaders.length, 1, file);
        assert.match(loaders[0], /\basync\b/);
        assert.match(loaders[0], /crossorigin="anonymous"/);
      }
      for (const href of ['/about/', '/connect/', '/privacy/', '/terms/']) assert.ok(html.includes(`href="${href}"`), `${file}: ${href}`);
    }
    assert.equal(contentCount, 33);
    assert.equal(fs.readFileSync(path.join(root, 'public/ads.txt'), 'utf8').trim(), 'google.com, pub-8222782620788075, DIRECT, f08c47fec0942fa0');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
