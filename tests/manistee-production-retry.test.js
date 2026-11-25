import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchWithBoundedRetry} from '../scripts/manistee-production-retry.mjs';

const response=status=>new Response(status===200?'real USGS data':'upstream temporarily down',{status});
const setup=(statuses,opts={})=>{
 let calls=0;
 const pauses=[];
 const reports=[];
 return {
  options:{
   fetchImpl:async()=>{const next=statuses[calls++];return next instanceof Error?Promise.reject(next):response(next);},
   sleep:async ms=>pauses.push(ms),
   warn:msg=>reports.push(msg),
   ...opts
  },
  get calls(){return calls;},pauses,reports
 };
};

test('one transient 502 recovers using next actual response only',async()=>{
 const f=setup([502,200]);
 const r=await fetchWithBoundedRetry('https://example.test/api/manistee-river-conditions',{},f.options);
 assert.equal(r.status,200);
 assert.equal(await r.text(),'real USGS data');
 assert.equal(f.calls,2);
 assert.deepEqual(f.pauses,[1500]);
 assert.match(f.reports[0],/HTTP 502/);
});
test('nontransient 404 and successful 200 never retry',async()=>{
 for(const status of [200,400,404,405]){
  const f=setup([status,200]);
  const r=await fetchWithBoundedRetry('https://example.test/api/manistee-river-conditions',{},f.options);
  assert.equal(r.status,status);assert.equal(f.calls,1);assert.deepEqual(f.pauses,[]);
 }
});
test('persistent transient 502 stays 502 and cannot pass a public smoke',async()=>{
 const f=setup([502,503,502]);
 const r=await fetchWithBoundedRetry('https://example.test/api/manistee-river-conditions',{},f.options);
 assert.equal(r.status,502);assert.equal(f.calls,3);assert.deepEqual(f.pauses,[1500,3000]);
 assert.equal(r.ok,false);
});
test('timeout retries within bound but programming errors fail immediately',async()=>{
 const timeout=Object.assign(new Error('upstream stalled'),{name:'TimeoutError'});
 const f=setup([timeout,200]);
 const r=await fetchWithBoundedRetry('https://example.test',{},f.options);
 assert.equal(r.status,200);assert.equal(f.calls,2);
 const bad=setup([new Error('bad code'),200]);
 await assert.rejects(fetchWithBoundedRetry('https://example.test',{},bad.options),/bad code/);
 assert.equal(bad.calls,1);
});
test('each attempt receives a fresh request signal after a transient failure',async()=>{
 const signals=[];
 const f=setup([502,200],{fetchImpl:async(_,init)=>{
  signals.push(init.signal);
  return response(signals.length===1?502:200);
 }});
 let builds=0;
 const result=await fetchWithBoundedRetry('https://example.test',()=>({
  signal:AbortSignal.timeout(500),attempt:++builds
 }),f.options);
 assert.equal(result.status,200);
 assert.equal(builds,2);
 assert.equal(signals.length,2);
 assert.notEqual(signals[0],signals[1]);
});
test('bounded 429 and 504 retry, but only maximum three attempts',async()=>{
 const f=setup([429,504,200]);
 assert.equal((await fetchWithBoundedRetry('https://example.test',{},f.options)).status,200);
 assert.equal(f.calls,3);
 for(const opt of [{attempts:0},{attempts:6},{delayMs:-1},{delayMs:11000}]){
  await assert.rejects(fetchWithBoundedRetry('https://example.test',{},opt),/Invalid bounded smoke retry configuration/);
 }
});
test('production smoke waits on same-commit Vercel and preserves unmodified 502 contract',()=>{
 const wf=readFileSync(new URL('../.github/workflows/manistee-production-smoke.yml',import.meta.url),'utf8');
 const smoke=readFileSync(new URL('../scripts/smoke-manistee-production.mjs',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/manistee-river-conditions.js',import.meta.url),'utf8');
 assert.match(wf,/github\.ref == 'refs\/heads\/main'/);
 assert.match(wf,/commits\/\$\{GITHUB_SHA\}\/status/);
 assert.match(wf,/\.context=="Vercel"/);
 assert.match(wf,/state\=\="success"|success\)/);
 assert.match(wf,/timeout-minutes: 12/);
 assert.match(smoke,/path==='\/api\/manistee-river-conditions'/);
 assert.match(smoke,/fetchWithBoundedRetry/);
 assert.match(smoke,/if\(!response\.ok\)/);
 assert.match(api,/return res\.status\(502\)\.json/);
 assert.match(api,/fresh=gauge\.age_minutes/);
});
