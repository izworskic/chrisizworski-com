'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const sites=[
  {name:'Florida',slug:'national-tools/space-coast-launch',html:'public/synced-national-tools/space-coast-launch/index.html',owner:'public/synced-national-tools/space-coast-launch/app.js',cue:'Find your Florida rocket launch',safety:'Playalinda',authority:'www.nps.gov'},
  {name:'Vandenberg',slug:'vandenberg-rocket-launch-viewing',html:'public/vandenberg-rocket-launch-viewing/index.html',owner:'public/vandenberg-rocket-launch-viewing/guide-map.js',cue:'Watch a <em>Vandenberg rocket launch',safety:'Harris Grade Road',authority:'explorelompoc.com'},
  {name:'Wallops',slug:'wallops-rocket-launch-viewing',html:'public/wallops-rocket-launch-viewing/index.html',owner:'public/wallops-rocket-launch-viewing/app.js',cue:'Where the marsh meets',safety:'Route 175',authority:'www.nasa.gov'},
  {name:'Starbase',slug:'starbase-rocket-launch-viewing',html:'public/starbase-rocket-launch-viewing/index.html',owner:'public/starbase-rocket-launch-viewing/app.js',cue:'Watch Starship rise',safety:'Highway 4',authority:'www.starbase.texas.gov'},
  {name:'Kodiak',slug:'kodiak-rocket-launch-viewing',html:'public/kodiak-rocket-launch-viewing/index.html',owner:'public/kodiak-rocket-launch-viewing/app.js',cue:'Rockets at the edge of Alaska',safety:'We have not verified a public viewing site',authority:'akaerospace.com'},
  {name:'Barking Sands',slug:'barking-sands-rocket-launch-viewing',html:'public/barking-sands-rocket-launch-viewing/index.html',owner:'public/barking-sands-rocket-launch-viewing/app.js',cue:'Rockets over Kauaʻi',safety:'No public launch-day spectator location has been independently verified',authority:'cnrh.cnic.navy.mil'}
];
const sitemap=read('public/sitemap.xml');
for(const site of sites){
  test(site.name+' retains trustworthy local visitor guidance and SEO metadata',()=>{
    const html=read(site.html),js=read(site.owner);
    const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(desc&&desc.length>=100&&desc.length<=158,site.name+' SERP description length');
    assert.ok(html.includes(site.cue),site.name+' local lead');
    assert.ok(html.includes(site.safety),site.name+' core access warning');
    assert.ok(html.includes(site.authority),site.name+' authoritative external source');
    assert.ok(html.includes('href="https://chrisizworski.com/'+site.slug+'/">'),site.name+' canonical');
    assert.ok(html.includes('/national-tools/rocket-launch-live/'),site.name+' national mission handoff');
    const cacheVersion=site.name==='Vandenberg'?'20261113-rust-v2':\n      site.name==='Wallops'||site.name==='Starbase'?'20261113-rust-network-v1':\n      site.name==='Florida'?'20261113-rust-florida-v1':'20261110-region-voice-v1';\n    assert.ok(html.includes(cacheVersion),site.name+' changed client copy must bust cache');
    assert.doesNotThrow(()=>new Function(js),site.name+' dynamic guide parses as JavaScript');
    if(site.name!=='Florida'){
      assert.ok(html.includes('"dateModified":"'+(['Vandenberg','Wallops','Starbase'].includes(site.name)?'2026-11-13':'2026-11-10')+'"'),site.name+' truthful structured metadata');
      assert.ok(sitemap.includes('<loc>https://chrisizworski.com/'+site.slug+'/</loc>\n    <lastmod>'+(site.name==='Vandenberg'?'2026-11-13':'2026-11-10')+'</lastmod>'),site.name+' sitemap lastmod');
    }
  });
}
test('Florida GIS guidance remains clear about park access, public directions and forecasts',()=>{
  const js=read('public/synced-national-tools/space-coast-launch/geo-map.js');
  assert.match(js,/Playalinda’s entrance, lots and beaches can close around launches/);
  assert.match(js,/No matching closure appeared in the park alerts checked/);
  assert.match(js,/The map isn’t loading/);
  assert.match(js,/No confirmed open path to a viewing place/);
  assert.doesNotThrow(()=>new Function(js));
});
test('regional flight states never promote a schedule into base access',()=>{
  const star=read('public/starbase-rocket-launch-viewing/app.js');
  const kodiak=read('public/kodiak-rocket-launch-viewing/app.js');
  const navy=read('public/barking-sands-rocket-launch-viewing/app.js');
  const wallops=read('public/wallops-rocket-launch-viewing/app.js');
  assert.match(star,/restricted launch pad/);
  assert.match(kodiak,/We have not confirmed a public viewing area for this flight/);
  assert.match(navy,/A rocket on the calendar does not make the range a viewing destination/);
  assert.match(wallops,/NASA must announce the viewing lawn as open for this flight/);
});
