const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('one config change updates, rolls back, or removes ads from already-built static pages', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'adsense-controls-'));
  try {
    for (const file of ['scripts/inject-ga4.mjs', 'lib/adsense-eligibility.js', 'lib/site-policy-links.js', 'lib/site-ais-embeds.js', 'lib/trip-journey-links.js', 'config/in-article-ads.json']) {
      fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(temp, file));
    }
    const page = path.join(temp, 'public/tools/index.html');
    fs.mkdirSync(path.dirname(page), { recursive: true });
    fs.writeFileSync(page, '<html><head><title>Tools</title><script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-123"></script><script src="/assets/in-article-ads.js?v=1"></script></head><body><main>Useful tool content</main><section id="first-party-migrated-tools"></section></body></html>');
    const configFile = path.join(temp, 'config/in-article-ads.json');
    const config = JSON.parse(fs.readFileSync(configFile));
    for (const mode of ['standard', 'legacy', 'off', 'standard']) {
      fs.writeFileSync(configFile, JSON.stringify({ ...config, loaderMode: mode }));
      execFileSync(process.execPath, ['scripts/inject-ga4.mjs'], { cwd: temp });
      const html = fs.readFileSync(page, 'utf8');
      const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
      assert.equal((html.match(/pagead\/js\/adsbygoogle\.js/g) || []).length, mode === 'off' ? 0 : 1);
      assert.equal((head.match(/pagead\/js\/adsbygoogle\.js/g) || []).length, mode === 'off' ? 0 : 1);
      assert.equal((html.match(/src="\/assets\/in-article-ads\.js/g) || []).length, mode === 'off' ? 0 : 1);
      assert.equal(html.includes('?client=ca-pub-8222782620788075'), mode === 'standard');
      assert.ok(!html.includes('ca-pub-123'));
      assert.ok(html.includes('google-adsense-account'));
      assert.ok(html.includes('G-Y5D2V2W7HN'));
      assert.ok(html.includes('<main>Useful tool content</main>'));
      execFileSync(process.execPath, ['scripts/inject-ga4.mjs'], { cwd: temp });
      assert.equal(fs.readFileSync(page, 'utf8'), html);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
