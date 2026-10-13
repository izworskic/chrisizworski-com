const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {stripTypeScriptTypes}=require('node:module');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const middleware=fs.readFileSync('middleware.ts','utf8');
const sitemap=fs.readFileSync('public/sitemap-pictured-rocks.xml','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-v5.css','utf8');
async function handler(){return (await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(middleware)).toString('base64'))).default}
test('search acquisition freezes the proven query-first title and single canonical',()=>{
 assert.match(middleware,/Pictured Rocks Trip Planner 2026: Map, Itinerary & Weather/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
 assert.match(middleware,/PICTURED_ROCKS_HOST = 'picturedrocks\.chrisizworski\.com'/);
 assert.match(sitemap,/<lastmod>2026-10-13<\/lastmod>/);
 assert.doesNotMatch(sitemap,/\/labs\//);
});
test('crawlable decision answers are fully visible without JS or fabricated FAQ rich result',()=>{
 for(const id of ['pictured-rocks-one-day','pictured-rocks-two-days','pictured-rocks-boat','pictured-rocks-fees','pictured-rocks-land','pictured-rocks-dogs','pictured-rocks-when','pictured-rocks-stay'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/2026 NPS entry pass is \$25/);
 assert.match(html,/not confirm seats/);
 assert.match(html,/not allowed<\/strong> on Chapel/);
 assert.match(html,/there is no timed-entry reservation/i);
 assert.doesNotMatch(html,/"FAQPage"/);
 assert.match(css,/\.growth-card-grid/);
});
test('relevant existing pages point to the single canonical Pictured Rocks planner',()=>{
 for(const f of ['public/northern-lights-michigan/munising/index.html','public/fall-color/upper-peninsula-fall-color/index.html','public/lake-superior-circle-tour/index.html','public/great-lakes-beaches/miners-beach/index.html']){
  const s=fs.readFileSync(f,'utf8');assert.ok(s.includes('https://picturedrocks.chrisizworski.com/'),f);
 }
});
test('known wrong-host duplicate results redirect to the primary host',async()=>{
 const fn=await handler();
 for(const path of ['/lake-superior-circle-tour/','/petoskey-wine/','/manistee-river-map/','/chris-izworski-works/']){
  const res=await fn(new Request('https://picturedrocks.chrisizworski.com'+path+'?source=google'));
  assert.equal(res.status,308,path);assert.equal(res.headers.get('location'),'https://chrisizworski.com'+path+'?source=google');
 }
});
test('Pictured Rocks shared sources stay accessible on the subdomain',async()=>{
 const fn=await handler();
 for(const path of ['/assets/pictured-rocks-v5.js','/api/pictured-rocks-live','/labs/pictured-rocks-planner/']){
   const response=await fn(new Request('https://picturedrocks.chrisizworski.com'+path));
   assert.equal(response,undefined,path);
 }
});
