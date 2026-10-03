const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(
  path.join(ROOT, 'public/niagara-border-crossing/index.html'),
  'utf8'
);

function gitBlobSha(relativePath) {
  const body = fs.readFileSync(path.join(ROOT, relativePath));
  return createHash('sha1')
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest('hex');
}

function versionFor(assetPath) {
  const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`${escaped}\\?v=([a-f0-9]{40})`))?.[1] || null;
}

test('Niagara cache versions are bound to the exact frontend asset contents', () => {
  const assets = [
    'public/assets/michigan-border-crossings.css',
    'public/assets/niagara-border-experience.css',
    'public/assets/niagara-border-crossing.js',
  ];

  for (const relativePath of assets) {
    const publicPath = `/${relativePath.replace(/^public\//, '')}`;
    assert.equal(
      versionFor(publicPath),
      gitBlobSha(relativePath),
      `${publicPath} cache version must equal its Git blob SHA`
    );
  }
});
