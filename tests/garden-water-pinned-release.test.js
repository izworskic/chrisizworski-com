import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {release,releaseHtml,prefix}=require('../lib/garden-water-release-c82dda3c.js');
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const read=p=>fs.readFileSync('public'+prefix+'/'+p,'utf8');
test('release bytes match reviewed owner except explicit canonical asset routing',()=>{
 assert.equal(release.commit,'c82dda3cf19cd002ce1571db6459186a923ac2d6');
 assert.equal(blob(release.html),release.blobs['public/national-tools/garden-water/index.html']);
 for(const file of ['national-garden-water-engine.js','national-garden-water.css'])assert.equal(blob(read(file)),release.blobs['public/assets/'+file]);
 assert.equal(blob(read('national-garden-water-crops.json')),release.blobs['public/data/national-garden-water-crops.json']);
 assert.equal(blob(read('national-garden-water-page.js').replace(prefix+'/national-garden-water-crops.json','/data/national-garden-water-crops.json')),release.blobs['public/assets/national-garden-water-page.js']);
 assert.match(releaseHtml(),/id="decision-content"/);assert.match(releaseHtml(),/id="adjustment-error"/);
 assert.ok(releaseHtml().includes(prefix+'/national-garden-water-page.js'));
 assert.ok(releaseHtml().includes(prefix+'/national-garden-water.css'));
 assert.equal((releaseHtml().match(/rel="canonical"/g)||[]).length,1);
 assert.ok(releaseHtml().includes('https://chrisizworski.com/national-tools/garden-water/'));
 const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
 assert.equal(routes.find(r=>r.source==='/api/national-garden-water'),undefined);
 assert.equal(blob(fs.readFileSync('lib/garden-water-owner-api-c82dda3c.mjs','utf8')),release.blobs['api/national-garden-water.js']);
});
test('canonical handler serves pinned reviewed HTML without owner HTML fetch',async()=>{
 const handler=require('../api/garden-water-page.js');
 let response;const headers={};
 const res={setHeader(k,v){headers[k]=v;return this;},status(code){this.code=code;return this;},send(html){response={code:this.code,html};return this;}};
 await handler({method:'GET',url:'/national-tools/garden-water/'},res);
 assert.equal(response.code,200);assert.match(headers['Content-Type'],/text\/html/);
 assert.match(response.html,/id="decision-content"/);
 assert.ok(response.html.includes(prefix+'/national-garden-water-page.js'));
 assert.ok(response.html.includes('https://chrisizworski.com/#person'));
 assert.equal((response.html.match(/rel="canonical"/g)||[]).length,1);
});

test('pinned API serves health locally and rejects missing coordinates',async()=>{
 const handler=require('../api/national-garden-water.js');
 const make=()=>({headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
 let res=make();await handler({method:'GET',query:{health:'1'}},res);assert.equal(res.code,200);assert.equal(res.body.service,'national-garden-water');assert.match(res.headers['x-robots-tag'],/noindex/);
 res=make();await handler({method:'GET',query:{lat:'',lon:''}},res);assert.equal(res.code,400);
 res=make();await handler({method:'POST',query:{lat:'43.6',lon:'-83.9'}},res);assert.equal(res.code,405);
});
test('pinned API invokes original public providers, not the owner deployment',async()=>{
 const handler=require('../api/national-garden-water.js');
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async (url)=>{
   const u=new URL(url);seen.push(u.hostname);
   if(u.hostname==='api.weather.gov'&&u.pathname.startsWith('/points/'))return new Response(JSON.stringify({properties:{timeZone:'America/Detroit',forecastGridData:'https://api.weather.gov/gridpoints/DTX/1,1',observationStations:'https://api.weather.gov/stations'}}));
   if(u.hostname==='api.weather.gov'&&u.pathname.startsWith('/gridpoints/'))return new Response(JSON.stringify({properties:{quantitativePrecipitation:{values:[]},maxTemperature:{values:[{value:15}]},minTemperature:{values:[{value:5}]}}}));
   return new Response('unavailable',{status:503});
 };
 try{
   const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
   await handler({method:'GET',query:{lat:'43.6',lon:'-83.9'}},res);
   assert.equal(res.code,200);assert.equal(res.body.location.lat,43.6);assert.equal(res.body.location.lon,-83.9);
   assert.equal(res.body.observedHistory.coveredDays,0);assert.equal(res.body.observedHistory.confidence,'low');
   assert.ok(res.body.referenceEt.daily.length>0);
   assert.ok(seen.includes('api.weather.gov'));assert.ok(seen.includes('www.ncei.noaa.gov'));
   assert.ok(seen.every(h=>!h.endsWith('.vercel.app')&&h!=='chrisizworski.com'));
 }finally{globalThis.fetch=original;}
});
