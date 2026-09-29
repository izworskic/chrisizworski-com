const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const fix=fs.readFileSync('public/assets/pictured-rocks-image-fix.js','utf8');
const loader=fs.readFileSync('public/assets/pictured-rocks-visual-layer.js','utf8');

test('Pictured Rocks repairs Miners Falls and Grand Sable images with current NPS sources',()=>{
  assert.match(fix,/Miners Falls at Pictured Rocks National Lakeshore/);
  assert.match(fix,/3B0AF34C-BE68-F0E7-6563F1E4994BDBF6/);
  assert.match(fix,/Grand Sable country at Pictured Rocks National Lakeshore/);
  assert.match(fix,/4EEC085A-9A7D-A4A0-267BAF178CF271DA/);
});

test('visual layer loads the image repair after the atlas core',()=>{
  assert.match(loader,/pictured-rocks-image-fix\.js/);
  assert.match(loader,/picturedRocksImageFix/);
});
