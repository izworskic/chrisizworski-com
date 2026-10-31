import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const html = readFileSync('public/michigan-white-christmas-escapes/index.html', 'utf8');

test('the Christmas guide loads its shared and local stylesheets', () => {
  const localStylesheets = [...html.matchAll(/<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(\/assets\/[^"?#]+)")[^>]*>/g)]
    .map(match => match[1]);
  assert.ok(localStylesheets.includes('/assets/winter-field-guide.css'));
  assert.ok(localStylesheets.includes('/assets/michigan-white-christmas-escapes.css'));
  for (const href of localStylesheets) assert.ok(existsSync(path.join('public', href)), `${href} must exist`);
});

test('the guide uses the shared layout for its navigation, filters and map', () => {
  for (const className of ['wf-sitebar', 'wf-primary', 'wf-heading', 'wf-chips', 'wf-map-panel']) {
    assert.match(html, new RegExp(`class="[^"]*\\b${className}\\b`));
  }
  const sharedCss = readFileSync('public/assets/winter-field-guide.css', 'utf8');
  assert.match(sharedCss, /\.wf\s+\[hidden\]\s*\{\s*display\s*:\s*none\s*!important/);
});
