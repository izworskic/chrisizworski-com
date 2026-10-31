'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const routes = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8'));
const origin = 'https://tahquamenon-falls-live-94is.vercel.app';

test('Tahquamenon EXPERIENCE_OS assets are forwarded to the authoritative owner', () => {
  for (const file of ['tahquamenon-falls.js','tahquamenon-falls.css','tahquamenon-seasonal.js','tahquamenon-experience.js','tahquamenon-experience.css']) {
    const source='/assets/'+file;
    const matches=routes.rewrites.filter(x=>x.source===source);
    assert.equal(matches.length,1,'missing or duplicate rewrite '+source);
    assert.equal(matches[0].destination,origin+source);
  }
});

test('Tahquamenon experience assets are sent with no-store',()=>{
  const policy=routes.headers.find(x=>x.source==='/assets/tahquamenon-experience.:ext(css|js)');
  assert.ok(policy,'missing fresh asset cache policy');
  for (const key of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control']) {
    assert.match(policy.headers.find(x=>x.key===key)?.value||'',/no-store/);
  }
});

test('public canonical still proxies to the owning Tahquamenon site',()=>{
  for(const path of ['/tahquamenon-falls','/tahquamenon-falls/']){
    const route=routes.rewrites.find(x=>x.source===path);
    assert.ok(route, 'missing '+path);
    assert.match(route.destination,/^https:\/\/tahquamenon-falls-live-94is\.vercel\.app\/tahquamenon-falls\/\?/);
  }
});
