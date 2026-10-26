'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const routes=vercel.rewrites||[];
const states=['midwest','michigan','wisconsin','minnesota','illinois','indiana','ohio'];
const remote='https://national-outdoor-tools-hub.vercel.app/national-tools/dark-sky/:slug/index.html';

test('Seven Midwest and state hubs resolve both canonical and bare forms to built index.html',()=>{
 for(const slash of ['','/']){
  const expected='/national-tools/dark-sky/:slug('+states.join('|')+')'+slash;
  const matches=routes.filter(x=>x.source===expected);
  assert.equal(matches.length,1,'Missing or duplicated '+expected);
  assert.equal(matches[0].destination,remote);
  assert.ok(routes.indexOf(matches[0])<routes.findIndex(x=>x.source==='/national-tools/dark-sky/:path*'),
    'Explicit state routes must precede the generic wildcard');
 }
});
test('Existing park destinations, meteor forecast API, and dark sky sitemap remain routed',()=>{
 assert.ok(routes.some(x=>x.source.includes(':slug(headlands|keweenaw|lawless')&&x.source.endsWith(')/')));
 assert.ok(routes.some(x=>x.source==='/national-tools/meteor-shower/_api/live'));
 assert.ok(routes.some(x=>x.source==='/national-tools/dark-sky/_api/forecast'));
 assert.ok(routes.some(x=>x.source==='/national-tools/dark-sky/sitemap.xml'));
 const index=fs.readFileSync('public/sitemap-index.xml','utf8');
 assert.ok(index.includes('https://chrisizworski.com/national-tools/dark-sky/sitemap.xml'));
 const tools=fs.readFileSync('public/tools/index.html','utf8');
 for(const p of ['meteor-shower/','dark-sky/michigan/','dark-sky/midwest/']){
  assert.ok(tools.includes('/national-tools/'+p),'/tools/ missing '+p);
 }
});
