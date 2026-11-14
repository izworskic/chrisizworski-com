'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('a refused hero photo collapses instead of leaving an empty box',()=>{
  const app=read('public/synced-national-tools/rocket-launch-live/app.js');
  const css=read('public/synced-national-tools/rocket-launch-live/styles.css');
  const html=read('public/synced-national-tools/rocket-launch-live/index.html');
  assert.match(html,/<figure class="rl-hero-photo">\s*<img src="https:\/\/media\.defense\.gov\//);
  const guard=app.slice(app.indexOf('function guardHeroPhoto'),app.indexOf('function revealHash'));
  assert.match(guard,/img\.complete&&img\.naturalWidth===0/);
  assert.match(guard,/addEventListener\('error',hide/);
  assert.match(guard,/rl-hero-no-photo/);
  assert.match(css,/\.rl-hero\.rl-hero-no-photo\{grid-template-columns:1fr/);
});
