const test = require('node:test');
const assert = require('node:assert/strict');
const report = require('../lib/fall-color/routes/report');
const rss = require('../lib/fall-color/routes/rss');
const { NOTE_DISCLOSURE } = require('../lib/fall-color/report-provenance');
function response() {
  return { setHeader() {}, status(code) { this.code=code; return this; }, json(value) { this.body=value; }, send(value) { this.body=value; } };
}
function storage(t, legacy) {
  const prior=process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_TOKEN='unit-test-token';
  t.after(()=>{ if(prior===undefined)delete process.env.UPSTASH_REDIS_REST_TOKEN;else process.env.UPSTASH_REDIS_REST_TOKEN=prior; });
  t.mock.method(global,'fetch',async (_url,init)=>{
    const command=JSON.parse(init.body);
    const result=command[0]==='SCAN'?['0',['fallcolor:report:2026-09-17']]:command[0]==='MGET'?[JSON.stringify(legacy)]:JSON.stringify(legacy);
    return {ok:true,json:async()=>({result})};
  });
}
test('previously saved daily reports disclose AI/model provenance without claiming human field observation',async t=>{
  const legacy={date:'2026-09-17',body:'A saved daily note.'};
  storage(t,legacy);const res=response();await report({},res);
  assert.equal(res.code,200);assert.equal(res.body.body,legacy.body);
  assert.equal(res.body.disclosure,NOTE_DISCLOSURE);
  assert.equal(res.body.generationMethod,'AI-generated model summary');
  assert.equal(res.body.publisher,'Chris Izworski');
});
test('RSS identifies automated summaries even for legacy notes and protects the XML boundary',async t=>{
  storage(t,{date:'2026-09-17',body:'Saved text containing ]]> characters.'});
  const res=response();await rss({},res);
  assert.equal(res.code,200);
  assert.ok(res.body.includes('<description><![CDATA['+NOTE_DISCLOSURE));
  assert.ok(res.body.includes(']]]]><![CDATA[>'));
  assert.match(res.body,/regional model estimates/);
});
