const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const aurora=read('public/northern-lights-michigan/index.html');
const bridge=read('public/mackinac-bridge-live/index.html');
const bridgeCss=read('public/assets/mackinac-bridge-live.css');

test('visible aurora jump reaches the actual tonight decision without changing SEO title',()=>{
 assert.match(aurora,/<a class="live-jump" href="#aurora-decision">Check my regional forecast/);
 assert.match(aurora,/id="aurora-decision"/);
 assert.match(aurora,/\.live-strip \.live-jump:focus-visible/);
 assert.match(aurora,/#aurora-decision\{scroll-margin-top:18px\}/);
 assert.match(aurora,/<title>Northern Lights Michigan Tonight: Can You See Them\?<\/title>/);
 assert.match(aurora,/"dateModified": "2026-10-26"/);
});
test('official bridge status remains the first answer and gets direct ribbon navigation',()=>{
 assert.match(bridge,/<a class="ribbon-answer-link" href="#statusCard">Read full official bridge report/);
 assert.ok(bridge.indexOf('id="statusCard"')<bridge.indexOf('data-gazette-latest'));
 assert.match(bridge,/#statusCard/);
 assert.match(bridge,/"dateModified": "2026-10-26"/);
 assert.match(bridgeCss,/#statusCard\{scroll-margin-top:18px\}/);
 assert.match(bridgeCss,/\.live-ribbon \.ribbon-answer-link:focus-visible/);
 assert.match(bridgeCss,/@media\(max-width:640px\)\{\.live-ribbon\{gap:8px/);
});
test('primary answer accessibility does not disguise or alter ad containers',()=>{
 assert.ok(!/adsbygoogle|ad-slot|ins\.adsbygoogle|display\s*:\s*none\s*!important/.test(bridgeCss.slice(-650)));
 assert.match(bridge,/href="https:\/\/www.mackinacbridge.org\/fares-traffic\/conditions\/"/);
});
