import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('public/assets/niagara-persona-polish.20261003.css', 'utf8');

test('Niagara hero question uses high-contrast dark text', () => {
  assert.match(css, /\.niagara-hero \.hero-question\{[^}]*color:#072336!important/);
  assert.match(css, /\.niagara-hero \.hero-question\{[^}]*font-weight:700/);
});
