import fs from 'node:fs';
import assert from 'node:assert/strict';
const middleware=fs.readFileSync('middleware.ts','utf8');
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
const page=fs.readFileSync('public/national-tools/gauley-release-live/index.html','utf8');
const live=fs.readFileSync('api/gauley-live.js','utf8');
const history=fs.readFileSync('api/gauley-history.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const url='https://chrisizworski.com/national-tools/gauley-release-live/';
const sourceCommit='c124a15a0d1a260fe4dd883a3adf830e3bb26c28';
const clean='/national-tools/gauley-release-live';
const target='/national-tools/gauley-release-live/index.html';

assert.ok(!middleware.includes('GAULEY_'),'Gauley must bypass middleware and use native first-party routing');
assert.ok(!middleware.includes('gauley-release-live'),'Gauley must not depend on middleware self-fetching');
const rewrites=vercel.rewrites || [];
const noSlash=rewrites.findIndex(r=>r.source===clean && r.destination===target);
const slash=rewrites.findIndex(r=>r.source===`${clean}/` && r.destination===target);
const catchAll=rewrites.findIndex(r=>r.source==='/national-tools/:path*');
assert.ok(noSlash>=0 && slash>=0,'Gauley static clean URL rewrites are missing');
assert.ok(catchAll>=0 && noSlash<catchAll && slash<catchAll,'Gauley rewrites must precede the national-tools catch-all');
assert.ok(!JSON.stringify(vercel).includes('gauley-release-live-wv-izworski-gmailcoms-projects.vercel.app'),'Protected Gauley upstream leaked into Vercel routing');
for(const marker of [url,'G-Y5D2V2W7HN','Private paddle','Raft guest','data-persona="watch"','data-persona="photo"','Since your last check','ENVIRONMENTAL CONTEXT INDEX',"getJSON('/api/gauley-live')","getJSON('/api/gauley-history')"]){
  assert.ok(page.includes(marker),`Gauley static page missing ${marker}`);
}
assert.match(live,/import\('gauley-release-live\/api\/live\.js'\)/,'Live wrapper must use authoritative package');
assert.match(history,/import\('gauley-release-live\/api\/history\.js'\)/,'History wrapper must use authoritative package');
assert.equal(pkg.dependencies['gauley-release-live'],`github:izworskic/gauley-release-live-#${sourceCommit}`,'Gauley dependency must be commit-pinned');
assert.equal(lock.packages[''].dependencies['gauley-release-live'],pkg.dependencies['gauley-release-live'],'Gauley lock root must match package pin');
assert.ok(lock.packages['node_modules/gauley-release-live'].resolved.endsWith(`#${sourceCommit}`),'Installed Gauley lock entry must resolve the verified persona commit');
assert.ok(sitemap.includes(`<loc>${url}</loc>`),'Gauley sitemap URL missing');
assert.equal(sitemap.split(url).length-1,1,'Gauley sitemap URL must be unique');
console.log('Gauley persona-first static routing: PASS');
