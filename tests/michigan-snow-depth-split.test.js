const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const michigan=fs.readFileSync(path.join(root,'public/michigan-snow-depth/index.html'),'utf8');

test('Michigan snow depth has its own canonical decision page',()=>{
  assert.match(michigan,/canonical" href="https:\/\/chrisizworski\.com\/michigan-snow-depth\//);
  assert.match(michigan,/id="goodSnowForm"/);
  assert.match(michigan,/Where Is the Good Snow\?/);
  assert.match(michigan,/national-snowpack-melt\.vercel\.app\/assets\/michigan-good-snow\.js/);
  assert.match(michigan,/href="\/national-tools\/snow\//);
});

test('Michigan page does not claim national coverage',()=>{
  assert.match(michigan,/Michigan winter trip finder/);
  assert.match(michigan,/reachable Michigan snow field/);
  assert.doesNotMatch(michigan,/U\.S\. winter trip finder|nationwide good snow finder/i);
});
