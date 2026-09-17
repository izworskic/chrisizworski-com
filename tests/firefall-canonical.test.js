const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const config=require('../vercel.json');
test('identical Firefall alias consolidates into the established canonical without redirecting its assets',()=>{
  for(const suffix of ['', '/'])assert.deepEqual(config.redirects.find(r=>r.source==='/national-tools/yosemite-firefall-live'+suffix),{source:'/national-tools/yosemite-firefall-live'+suffix,destination:'/yosemite-firefall-live/',permanent:true});
  assert.equal(config.redirects.some(r=>r.source==='/national-tools/yosemite-firefall-live/:path*'),false);
  const html=fs.readFileSync('public/yosemite-firefall-live/index.html','utf8');
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/yosemite-firefall-live\/">/);
});
