const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync(
  path.resolve(__dirname, '../public/niagara-border-crossing/index.html'),
  'utf8'
);

test('Niagara page versions coupled frontend assets to prevent mixed releases', () => {
  assert.match(html, /\/assets\/michigan-border-crossings\.css\?v=[^"']+/);
  assert.match(html, /\/assets\/niagara-border-experience\.css\?v=[^"']+/);
  assert.match(html, /\/assets\/niagara-border-crossing\.js\?v=[^"']+/);

  assert.doesNotMatch(html, /href="\/assets\/michigan-border-crossings\.css"/);
  assert.doesNotMatch(html, /href="\/assets\/niagara-border-experience\.css"/);
  assert.doesNotMatch(html, /src="\/assets\/niagara-border-crossing\.js"/);
});
