import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

function gitBlob(content) {
  return createHash('sha1').update('blob ' + content.length + '\0').update(content).digest('hex').slice(0,12);
}
test('Michigan Ice generated HTML always fingerprints both script files', () => {
  const src = fs.readFileSync('public/michigan-ice/ice.js');
  const enhanced = fs.readFileSync('public/michigan-ice/freeze-up.js');
  const version = gitBlob(src) + '-' + gitBlob(enhanced);
  const manifest = JSON.parse(fs.readFileSync('scripts/ice/generated.json','utf8'));
  for(const name of Object.keys(manifest.files)) {
    const page = fs.readFileSync('public/michigan-ice/' + name, 'utf8');
    assert.ok(page.includes('<script src="/michigan-ice/ice.js?v='+version+'"></script>'), name+' has old JS URL');
    assert.doesNotMatch(page, /<script src="\/michigan-ice\/ice\.js"><\/script>/);
  }
  const loader = src.toString();
  assert.match(loader,/document\.currentScript/);
  assert.match(loader,/freeze-up\.js.*encodeURIComponent\(version\)/s);
  assert.match(fs.readFileSync('scripts/ice/gen_chrome.py','utf8'),/ICE_ASSET_VERSION/);
  execFileSync(process.execPath,['--check','public/michigan-ice/ice.js']);
  execFileSync(process.execPath,['--check','public/michigan-ice/freeze-up.js']);
});
test('Michigan Ice pages and assets cannot reuse an old CDN/browser response',()=>{
  const headers = JSON.parse(fs.readFileSync('vercel.json','utf8')).headers;
  const rule = headers.find(x=>x.source==='/michigan-ice/:path*');
  assert.ok(rule,'missing Michigan Ice cache headers');
  const value = Object.fromEntries(rule.headers.map(x=>[x.key,x.value]));
  assert.match(value['Cache-Control'],/no-store/);
  assert.equal(value['CDN-Cache-Control'],'no-store');
  assert.equal(value['Vercel-CDN-Cache-Control'],'no-store');
});
