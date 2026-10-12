#!/usr/bin/env node
/* Product-truth gate. Intentionally independent from engagement measurements. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),cases=[
{url:'/split-rock-river-loop/',html:'public/split-rock-river-loop/index.html',script:'public/assets/split-rock-river-engine.js',official:'superiorhiking.org',expected:'NO bridge'},
{url:'/split-rock-lighthouse-visit/',html:'public/split-rock-lighthouse-visit/index.html',script:'public/assets/split-rock-lighthouse-engine.js',official:'mnhs.org',expected:'parking'}
];
let passes=0;
function gate(name,test){assert.ok(test,name);passes++;console.log('PASS '+name)}
for(const c of cases){
 const h=fs.readFileSync(path.join(root,c.html),'utf8'),s=fs.readFileSync(path.join(root,c.script),'utf8'),title=(h.match(/<title>(.*?)<\/title>/)||[])[1]||'',desc=(h.match(/<meta name="description" content="([^"]+)"/)||[])[1]||'';
 gate(c.url+' query-first title <=60',title.length>20&&title.length<=60&&title.includes('Chris Izworski'));
 gate(c.url+' description <=158',desc.length>65&&desc.length<=158);
 gate(c.url+' one canonical',h.includes('rel="canonical" href="https://chrisizworski.com'+c.url+'"'));
 gate(c.url+' full Person authority',h.includes('"@type":"Person"')&&h.includes('https://chrisizworski.com/#person'));
 gate(c.url+' byline and source',h.includes('Built by Chris Izworski')&&h.includes(c.official));
 gate(c.url+' independent engine',s.includes('function evaluate('));
 gate(c.url+' no invented live monitoring',/not a live|not real-time|not a real-time|no live/i.test(h));
 gate(c.url+' safety/entry identity',h.includes(c.expected));
 gate(c.url+' tracked interaction',h.includes("gtag('event'"));
}
const river=require('../public/assets/split-rock-river-engine.js');
const lh=require('../public/assets/split-rock-lighthouse-engine.js');
gate('river: always unbridged',river.RECORD.bridge===false&&river.evaluate({goal:'ford'}).code==='UNBRIDGED_CROSSING');
gate('river: bulletin refresh notice',river.evaluate({goal:'loop',date:'2027-07-01'}).code==='RECHECK_BULLETIN');
gate('lighthouse: never charge standard fare as event',lh.evaluate({experience:'memorial',date:'2026-11-10',adults:1}).price===null);
gate('lighthouse: no future fabricated schedule',lh.evaluate({experience:'tower',date:'2027-06-10',adults:1}).state==='OUTSIDE_POSTED_SEASON');
gate('different intent owners',cases[0].url!==cases[1].url&&cases[0].script!==cases[1].script);
console.log('North Shore structural value gates: '+passes+'/'+passes+' PASS (not a UX or GSC score)');
