const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const middleware = fs.readFileSync(path.join(root, 'middleware.ts'), 'utf8');
const lab = fs.readFileSync(path.join(root, 'public/labs/pictured-rocks-planner/index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/pictured-rocks-alias-cutover.yml'), 'utf8');

const host = 'picturedrocks.chrisizworski.com';

test('canonical Pictured Rocks host is served by current middleware shell', () => {
  assert.match(middleware, /PICTURED_ROCKS_HOST\s*=\s*['"]picturedrocks\.chrisizworski\.com['"]/);
  assert.match(middleware, /servePicturedRocksCanonical/);
  assert.match(middleware, /index,follow,max-image-preview:large/);
});

test('lab source remains noindex while canonical points to the subdomain', () => {
  assert.match(lab, /name="robots" content="noindex,nofollow"/);
  assert.match(lab, /rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
});

test('one-shot cutover only adds the existing hostname to vercel alias config', () => {
  assert.match(workflow, /const host = 'picturedrocks\.chrisizworski\.com'/);
  assert.match(workflow, /cfg\.alias = \[\.\.\.new Set/);
  assert.doesNotMatch(workflow, /vercel domains buy|purchase|registrar/i);
});
