'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const watch = require('../lib/mackinac-watch');

const env = { TOOL_STATE_URL: 'https://fake-state.example', VERCEL_OIDC_TOKEN: 'unit-test', CRON_SECRET: 'unit-test-vapid-seed' };
const NOW = Date.parse('2026-10-11T14:00:00Z');
function fakeRedis() {
  const values = new Map();
  const sorted = new Map();
  const command = async ([op, key, ...args]) => {
    if (op === 'SET') {
      if (args.includes('NX') && values.has(key)) return null;
      values.set(key, args[0]); return 'OK';
    }
    if (op === 'GET') return values.get(key) || null;
    if (op === 'DEL') { values.delete(key); return 1; }
    if (op === 'ZADD') { sorted.set(args[1], Number(args[0])); return 1; }
    if (op === 'ZREM') { sorted.delete(args[0]); return 1; }
    if (op === 'ZREMRANGEBYSCORE') {
      const until = Number(args[1]); for (const [id, expiry] of sorted) if (expiry <= until) sorted.delete(id); return 1;
    }
    if (op === 'ZRANGEBYSCORE') return [...sorted]
      .filter(([, score]) => score > Number(String(args[0]).replace('(', '')))
      .map(([id]) => id);
    throw Error('Unknown Redis command: ' + op);
  };
  return { values, sorted, command };
}
function report(level, wind = false) {
  return { level, wind_related: wind, available: level !== 'unknown' };
}
test('watch requires durable storage and a signing secret', () => {
  assert.equal(watch.ready({}), false);
  assert.equal(watch.ready(env), true);
});
test('official condition transitions: initial baseline and noise never push', async () => {
  const db = fakeRedis();
  let official = report('open');
  const pushes = [];
  async function run(at) {
    return watch.runCron(at, {
      env, command: db.command, getOfficial: async () => official,
      send: async (_subscription, message) => { pushes.push(message); return { ok: true }; }
    });
  }
  assert.equal((await run(NOW)).state, 'baseline');
  db.values.set('mackinac:watch:v2:subscription:watch-1', JSON.stringify({
    id: 'watch-1', subscription: { endpoint: 'https://fcm.googleapis.com/abc', keys: {} },
    expiresAt: NOW + 48 * 3600 * 1000, alertCount: 0, alertDay: watch.dayInDetroit(NOW),
    lastAlertLevel: null
  }));
  db.sorted.set('watch-1', NOW + 48 * 3600 * 1000);
  assert.equal((await run(NOW + 300000)).state, 'unchanged');
  official = report('unknown');
  assert.equal((await run(NOW + 600000)).state, 'official-unavailable');
  assert.equal(pushes.length, 0);
  official = report('advisory', true);
  let out = await run(NOW + 900000);
  assert.equal(out.state, 'transition');
  assert.equal(out.notifications, 1);
  assert.match(pushes[0], /high-wind advisory/);
  out = await run(NOW + 1200000);
  assert.equal(out.state, 'unchanged');
  assert.equal(pushes.length, 1);
  official = report('escort', true);
  await run(NOW + 1500000);
  assert.match(pushes[1], /requires escorts/);
  official = report('partial', true);
  await run(NOW + 1800000);
  assert.match(pushes[2], /partially closed/);
  official = report('closed');
  await run(NOW + 2100000);
  assert.match(pushes[3], /closed to all traffic/);
  official = report('open');
  await run(NOW + 2400000);
  assert.match(pushes[4], /reopened/);
});
test('no fabricated open states and no expired-watch delivery', async () => {
  const db = fakeRedis();
  db.values.set('mackinac:watch:v2:official', JSON.stringify({ level: 'escort' }));
  db.values.set('mackinac:watch:v2:subscription:old', JSON.stringify({
    id: 'old', subscription: { endpoint: 'https://fcm.googleapis.com/old' },
    expiresAt: NOW - 1, alertCount: 0, alertDay: watch.dayInDetroit(NOW)
  }));
  db.sorted.set('old', NOW - 1);
  let count = 0;
  const r = await watch.runCron(NOW, {
    env, command: db.command, getOfficial: async () => report('open'),
    send: async () => { count++; return { ok: true }; }
  });
  assert.equal(r.state, 'transition');
  assert.equal(r.notifications, 0);
  assert.equal(count, 0);
});
test('six alert cap per watcher per Detroit day', async () => {
  const db = fakeRedis();
  db.values.set('mackinac:watch:v2:official', JSON.stringify({ level: 'open' }));
  db.values.set('mackinac:watch:v2:subscription:watch-2', JSON.stringify({
    id: 'watch-2', subscription: { endpoint: 'https://fcm.googleapis.com/abc' },
    expiresAt: NOW + 48 * 3600 * 1000, alertCount: 0, alertDay: watch.dayInDetroit(NOW)
  }));
  db.sorted.set('watch-2', NOW + 48 * 3600 * 1000);
  let count = 0;
  for (let n = 0; n < 8; n++) {
    const newLevel = n % 2 ? 'open' : 'advisory';
    await watch.runCron(NOW + n * 5 * 60000, {
      env, command: db.command, getOfficial: async () => report(newLevel, true),
      send: async () => { count++; return { ok: true }; }
    });
  }
  assert.equal(count, 6);
});
test('additive page retains live features and labels planning risk', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const page = read('public/mackinac-bridge-live/index.html');
  const js = read('public/assets/mackinac-bridge-live.js');
  const v2 = read('public/assets/mackinac-bridge-v2.js');
  const config = JSON.parse(read('vercel.json'));
  for (const id of ['statusCard','vehicleCheckerResult','tollEstimate','cameraImage','radarImage','forecastTrack','bridge-walk','bridgeWatchButton','bridgeRiskStrip']) {
    assert.ok(page.includes('id="' + id + '"'), id + ' missing');
  }
  assert.match(js, /mackinac:official-data/);
  assert.match(page, /Not a prediction/);
  assert.match(v2, /wind >= 65/);
  assert.match(page, /data-bridge-v2-link="border"/);
  assert.match(page, /data-bridge-v2-link="fall-color"/);
  assert.match(page, /data-bridge-v2-link="aurora"/);
  assert.ok(config.crons.some(x => x.path === '/api/mackinac-watch?action=cron' && x.schedule === '*/5 * * * *'));
  assert.equal(config.functions['api/mackinac-watch.js'].maxDuration, 60);
});
