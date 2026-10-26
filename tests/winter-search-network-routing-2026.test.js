const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tools=read('public/tools/index.html');
const winter=tools.slice(tools.indexOf('<section class="winter-router"'),tools.indexOf('<section class="featured-tools"'));
const destinations=[
 ['find-snow','michigan-snow-depth'],
 ['lake-effect','lake-effect-snow'],
 ['downhill','michigan-ski-hills'],
 ['ice-caves','michigan-ice-caves'],
 ['freighter-layup','great-lakes-freighter-winter-layup']
];
test('sitewide Tools hub offers five distinct native winter decision destinations',()=>{
 assert.ok(winter.length>4000);
 for(const [intent,slug] of destinations){
   const region=winter.match(new RegExp('<article class="winter-persona" data-winter-persona="'+intent+'"[\\s\\S]*?<\\/article>'));
   assert.ok(region,'Missing winter visitor task '+intent);
   assert.ok(region[0].includes('href="/'+slug+'/"'),'Missing native link from '+intent);
   const html=read('public/'+slug+'/index.html');
   assert.ok(html.includes('https://chrisizworski.com/'+slug+'/'),'Destination canonical missing '+slug);
   assert.ok(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html),'Do not promote noindex preview '+slug);
 }
});
test('forecast, observed, modeled snowpack, recreational access and AIS are not conflated',()=>{
 for(const text of [
 'Snow at a map pixel does not verify winter parking or safe access',
 'A forecast snowbelt is not a measured snowfall total or an exact band track',
 'official resort reports',
 'not a promise of safe trails or ice',
 'AIS silence or a stopped ship by itself does not prove layup'
 ]) assert.ok(winter.includes(text),text);
 assert.ok(!winter.includes('href="/winter-hike-snowshoe-lab/"'),'Research-only noindex lab must stay outside search-ready hub');
});
test('hub revision and indexed sitemap remain in sync',()=>{
 assert.match(tools,/"dateModified":"2026-10-26"/);
 assert.match(read('public/sitemap.xml'),/<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>2026-10-26<\/lastmod>/);
});
