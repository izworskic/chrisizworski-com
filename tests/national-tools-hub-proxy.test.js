const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('National Tools host passes through the current owner directory without a second mutation layer',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','national-tools-hub.js'),'utf8');
  assert.match(source,/https:\/\/national-outdoor-tools-hub\.vercel\.app\/national-tools\//);
  assert.doesNotMatch(source,/\?v=/,'National Tools proxy must not pin an old version query');
  assert.doesNotMatch(source,/inject-(?:fort-madison|platte)-national-tools/,'the outer shell must not mutate the owner directory');
  assert.match(source,/duplicate cards and structured-data drift/);
});
