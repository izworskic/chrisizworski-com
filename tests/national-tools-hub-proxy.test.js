const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('National Tools host proxy follows the current hub production alias instead of a pinned release snapshot',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','national-tools-hub.js'),'utf8');
  assert.match(source,/https:\/\/national-outdoor-tools-hub\.vercel\.app\/national-tools\//);
  assert.doesNotMatch(source,/\?v=/,'National Tools proxy must not pin an old version query');
  assert.doesNotMatch(source,/melvin-price/i,'National Tools proxy must not remain tied to the previous Melvin Price release');
});
