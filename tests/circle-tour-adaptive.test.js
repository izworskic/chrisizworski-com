const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const loader = read('public/assets/lake-superior-circle-tour.js');
const today = read('public/assets/lake-superior-circle-tour-today.js');
const adaptive = read('public/assets/lake-superior-circle-tour-adaptive.js');
const adaptiveData = read('public/assets/lake-superior-circle-tour-adaptive-data.js');
const smoke = read('api/circle-tour-smoke.js');

test('adaptive Circle Tour loads after the base Today planner and current access alerts', () => {
  assert.match(loader, /lake-superior-circle-tour-today\.js\?v=20260929-1/);
  assert.match(loader, /addCurrentAlerts\(\)/);
  assert.match(loader, /lake-superior-circle-tour-adaptive\.js\?v=20260930-1/);
  assert.ok(loader.indexOf('addCurrentAlerts();') < loader.indexOf("await import('/assets/lake-superior-circle-tour-adaptive.js"));
  assert.match(adaptive, /lake-superior-circle-tour-adaptive-data\.js\?v=20260930-1/);
});

test('water smoke fall color border aurora and access can change the day', () => {
  for (const token of ['/api/buoys','/api/aurora','/api/fall-color','/api/border-crossings','/api/circle-tour-smoke']) {
    assert.ok(adaptiveData.includes(token), `missing ${token}`);
  }
  for (const fn of ['water','smoke','fall','access','borderEffects','aurora']) {
    assert.ok(adaptiveData.includes(`function ${fn}`), `missing ${fn}`);
  }
  assert.match(adaptiveData, /border\.minutes\/60/);
  assert.match(adaptiveData, /hours-drive-\.5-aur\.hours/);
  assert.match(adaptiveData, /used\+x\.hours>budget/);
  assert.doesNotMatch(adaptiveData, /keep\.size\s*<=\s*2/);
});

test('day sheet is clock based and preserves route order', () => {
  assert.match(adaptive, /id="ctTodayLeave"/);
  assert.match(adaptive, /Clock-based day sheet/);
  assert.match(adaptive, /function daySheet/);
  assert.match(adaptive, /clock\(cursor\)/);
  assert.match(adaptive, /page\.setTrip\?\.\(plan\.ids/);
  assert.match(adaptiveData, /if\(a===b\)return\[a\]/);
});

test('known Circle Tour edge cases stay fixed in the adaptive planning layer', () => {
  assert.match(adaptiveData, /a==='30'&&b==='1'/);
  assert.match(adaptiveData, /if\(a===b\)return\[a\]/);
  assert.match(adaptiveData, /Gargantua Road closure/);
  assert.match(adaptive, /focusWhenMapReady/);
});

test('adaptive planner fails soft and collects no personal browser state', () => {
  assert.match(adaptiveData, /X-Data-Fallback/);
  assert.match(adaptiveData, /d\?\.status!=='insufficient_evidence'/);
  assert.match(adaptive, /What live conditions changed/);
  assert.doesNotMatch(today + adaptive + adaptiveData, /localStorage|sessionStorage|document\.cookie|navigator\.geolocation/);
  assert.match(smoke, /national-outdoor-core\.vercel\.app\/api\/national-smoke-window/);
  assert.match(smoke, /insufficient_evidence/);
});

test('Circle Tour smoke proxy validates coordinates and fails soft', async () => {
  const handler = require('../api/circle-tour-smoke');
  const originalFetch = global.fetch;
  let requested = '';
  global.fetch = async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({status:'usable',current:{pm25_aqi:42},decision:{category:{code:'good'},headline:'Outdoor air looks favorable right now'}}), {status:200,headers:{'content-type':'application/json'}});
  };
  const res = {
    headers:{}, statusCode:200, body:null,
    setHeader(k,v){this.headers[String(k).toLowerCase()]=v;},
    status(code){this.statusCode=code;return this;},
    json(body){this.body=body;return body;},
    end(){return null;},
  };
  try {
    await handler({method:'GET',query:{lat:'46.78',lon:'-92.10'}},res);
    assert.equal(res.statusCode,200);
    assert.match(requested,/lat=46\.78/);
    assert.match(requested,/lon=-92\.1/);
    assert.equal(res.body.current.pm25_aqi,42);
    assert.match(res.headers['x-robots-tag'],/noindex/);
  } finally {
    global.fetch = originalFetch;
  }
});
