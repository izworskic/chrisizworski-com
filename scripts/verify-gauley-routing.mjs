import fs from 'node:fs';
import assert from 'node:assert/strict';

const middleware=fs.readFileSync('middleware.ts','utf8');
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const url='https://chrisizworski.com/national-tools/gauley-release-live/';
const clean='/national-tools/gauley-release-live';
const hub='https://national-outdoor-tools-hub.vercel.app/national-tools/gauley-release-live';

assert.ok(!middleware.includes('GAULEY_'),'Gauley must not use special middleware routing');
assert.ok(!middleware.includes('gauley-release-live'),'Gauley must not depend on middleware self-fetching');
assert.ok(!pkg.dependencies?.['gauley-release-live'],'Main site must not package the Gauley engine');
assert.ok(!lock.packages?.['node_modules/gauley-release-live'],'Main-site lockfile must not package Gauley');
assert.ok(!fs.existsSync('api/gauley-live.js'),'Main site must not duplicate the Gauley live function');
assert.ok(!fs.existsSync('api/gauley-history.js'),'Main site must not duplicate the Gauley history function');
assert.ok(!fs.existsSync('public/national-tools/gauley-release-live/index.html'),'Main site must not carry a stale Gauley page mirror');
assert.ok(!String(pkg.scripts['vercel-build']).includes('sync-gauley-release-live'),'Main build must not sync Gauley locally');
assert.ok(!Object.keys(vercel.functions||{}).some(k=>k.includes('gauley')),'Main Vercel function config must not package Gauley');

const rewrites=vercel.rewrites||[];
const expected=new Map([
  [clean,`${hub}/`],
  [`${clean}/`,`${hub}/`],
  [`${clean}/:path*`,`${hub}/:path*`]
]);
for(const [source,destination] of expected){
  const matches=rewrites.filter(r=>r.source===source);
  assert.equal(matches.length,1,`Expected exactly one Gauley rewrite for ${source}`);
  assert.equal(matches[0].destination,destination,`Wrong Gauley destination for ${source}`);
}
const catchAllIndex=rewrites.findIndex(r=>r.source==='/national-tools/:path*');
assert.ok(catchAllIndex>=0,'National Tools catch-all proxy missing');
for(const source of expected.keys()){
  assert.ok(rewrites.findIndex(r=>r.source===source)<catchAllIndex,`${source} must precede the generic catch-all`);
}
assert.ok(sitemap.includes(`<loc>${url}</loc>`),'Gauley sitemap URL missing');
assert.equal(sitemap.split(url).length-1,1,'Gauley sitemap URL must be unique');
console.log('Gauley explicit external hub proxy routing: PASS');
