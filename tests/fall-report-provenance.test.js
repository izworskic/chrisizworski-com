const test = require('node:test');
const assert = require('node:assert/strict');
const report = require('../lib/fall-color/routes/report');
const rss = require('../lib/fall-color/routes/rss');
const { NOTE_DISCLOSURE, MODEL_DISCLOSURE } = require('../lib/fall-color/report-provenance');
const githubStore = require('../lib/fall-color/github-edition-store');
function response() {
  return { setHeader() {}, status(code) { this.code=code; return this; }, json(value) { this.body=value; }, send(value) { this.body=value; } };
}
function storage(t, legacy) {
  githubStore._clearCache();
  t.after(()=>githubStore._clearCache());
  t.mock.method(global,'fetch',async url=>{
    const address=String(url);
    const result=address.endsWith('/mi/index.json')
      ? { dates:[legacy.date] }
      : address.endsWith('/mi/latest.json') || address.endsWith('/mi/'+legacy.date+'.json')
        ? legacy : null;
    return result
      ? {ok:true,status:200,json:async()=>result}
      : {ok:false,status:404};
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

test('new deterministic model brief publishes correct disclosure in API and RSS',async t=>{
  const edition={date:'2026-10-10',body:'Modeled regional color, not a sighting.',generationMethod:'Deterministic model summary'};
  storage(t,edition);
  const api=response();await report({},api);
  assert.equal(api.code,200);
  assert.equal(api.body.generationMethod,'Deterministic model summary');
  assert.equal(api.body.disclosure,MODEL_DISCLOSURE);
  const feed=response();await rss({},feed);
  assert.equal(feed.code,200);
  assert.ok(feed.body.includes(MODEL_DISCLOSURE));
  assert.ok(!feed.body.includes(NOTE_DISCLOSURE));
});
