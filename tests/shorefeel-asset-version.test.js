'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.join(__dirname,'..');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex').slice(0,10);
test('ShoreFeel pages reference the current content hash of their stylesheet and script',()=>{
 const css=hash('public/assets/shorefeel.css'),js=hash('public/assets/shorefeel.js');
 for(const p of ['great-lakes-water-temperature','lake-michigan-water-temperature','lake-michigan-water-temperature/traverse-city','lake-michigan-water-temperature/grand-haven']){
  const html=fs.readFileSync(path.join(root,'public',p,'index.html'),'utf8');
  assert.ok(html.includes('/assets/shorefeel.css?v='+css+'"'),p+': run node scripts/stamp-shorefeel-assets.mjs (stale or missing CSS version)');
  assert.ok(html.includes('/assets/shorefeel.js?v='+js+'"'),p+': run node scripts/stamp-shorefeel-assets.mjs (stale or missing JS version)');
 }
});
