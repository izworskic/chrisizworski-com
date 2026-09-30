const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const michigan=fs.readFileSync(path.join(root,'public/michigan-snow-depth/index.html'),'utf8');

test('Michigan snow depth has its own canonical decision page',()=>{
  assert.ok(michigan.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-snow-depth/">'));
  assert.ok(michigan.includes('id="goodSnowForm"'));
  assert.ok(michigan.includes('Where Is the Good Snow?'));
  assert.ok(michigan.includes('national-snowpack-melt.vercel.app/assets/michigan-good-snow.js'));
  assert.ok(michigan.includes('href="/national-tools/snow/"'));
});

test('Michigan page does not claim national coverage',()=>{
  assert.ok(michigan.includes('Michigan winter trip finder'));
  assert.ok(michigan.includes('reachable Michigan snow field'));
  assert.doesNotMatch(michigan,/U\.S\. winter trip finder|nationwide good snow finder/i);
});
