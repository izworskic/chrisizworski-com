const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('build integration covers generated HTML once and preserves excluded documents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'network-ads-'));
  try {
    const plain = '<html><head><title>Tool</title></head><body><main>Keep this tool</main></body></html>';
    const hidden = plain.replace('</head>', '<meta name="robots" content="noindex,follow"></head>');
    fs.mkdirSync(path.join(dir, 'generated'));
    fs.writeFileSync(path.join(dir, 'generated/index.html'), plain);
    fs.writeFileSync(path.join(dir, 'hidden.html'), hidden);
    fs.writeFileSync(path.join(dir, 'privacy.html'), plain);
    const build = () => execFileSync(process.execPath, ['scripts/network-ads-injector.mjs', dir]);
    build();
    const first = fs.readFileSync(path.join(dir, 'generated/index.html'), 'utf8');
    assert.equal((first.match(/network-ads-v1.js/g) || []).length, 1);
    assert.ok(first.includes('<body><main>Keep this tool</main></body>'));
    build();
    assert.equal(fs.readFileSync(path.join(dir, 'generated/index.html'), 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(dir, 'hidden.html'), 'utf8'), hidden);
    assert.equal(fs.readFileSync(path.join(dir, 'privacy.html'), 'utf8'), plain);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
