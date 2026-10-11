'use strict';

// Server-side Mackinac Bridge official-condition watches.
// The Authority's condition report is the only source for push transitions.
const crypto = require('crypto');
const { parseOfficialConditions } = require('./mackinac');
const { deriveVapidKeys, encryptPushPayload, vapidJwt, validateSubscription } =
  require('./flight-v3').webPush;

const OFFICIAL_URL = 'https://www.mackinacbridge.org/wp-json/wp/v2/pages/1439';
const KEY_STATE = 'mackinac:watch:v2:official';
const KEY_LOCK = 'mackinac:watch:v2:cron-lock';
const KEY_INDEX = 'mackinac:watch:v2:index';
const PREFIX = 'mackinac:watch:v2:subscription:';
const WATCH_MS = 48 * 60 * 60 * 1000;
const MAX_DAILY = 6;
const LEVELS = new Set(['open', 'advisory', 'escort', 'partial', 'closed']);

function redisConfig(env = process.env) {
  return {
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '',
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || ''
  };
}
function pushEnv(env = process.env) {
  return {
    FLIGHT_WATCH_VAPID_SECRET:
      env.MACKINAC_WATCH_VAPID_SECRET || env.FLIGHT_WATCH_VAPID_SECRET || env.CRON_SECRET || ''
  };
}
function ready(env = process.env) {
  const cfg = redisConfig(env);
  return Boolean(cfg.url && cfg.token && deriveVapidKeys(pushEnv(env)));
}
async function redis(cmd, env = process.env) {
  const cfg = redisConfig(env);
  if (!cfg.url || !cfg.token) throw new Error('watch storage not configured');
  const response = await fetch(cfg.url, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + cfg.token, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error('watch storage HTTP ' + response.status);
  const parsed = await response.json();
  if (parsed.error) throw new Error('watch storage command error');
  return parsed.result;
}
function watchId(subscription) {
  return crypto.createHash('sha256').update(subscription.endpoint).digest('hex');
}
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function equalToken(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function dayInDetroit(nowMs) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(nowMs));
}
function officialLevel(report) {
  return report && report.available && LEVELS.has(report.level) ? report.level : null;
}
function transitionMessage(level, windRelated) {
  switch (level) {
    case 'open': return 'Mackinac Bridge has reopened — check the official report before crossing.';
    case 'advisory': return windRelated
      ? 'Mackinac Bridge is now under a high-wind advisory — high-profile vehicles limited to 20 mph.'
      : 'Mackinac Bridge has an official travel advisory — check restrictions before crossing.';
    case 'escort': return 'Mackinac Bridge now requires escorts for high-profile vehicles — wait for Bridge Authority staff.';
    case 'partial': return 'Mackinac Bridge is partially closed — high-profile vehicles cannot cross.';
    case 'closed': return 'Mackinac Bridge is closed to all traffic — do not attempt to cross.';
    default: return null;
  }
}
async function fetchOfficial(fetchImpl = fetch) {
  const response = await fetchImpl(OFFICIAL_URL, {
    headers: { accept: 'application/json', 'user-agent': 'MackinacBridgeLive/2.0 (+https://chrisizworski.com/mackinac-bridge-live/)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('official report HTTP ' + response.status);
  return parseOfficialConditions(await response.json());
}
function safeSubscription(input) {
  if (!validateSubscription(input)) return false;
  try {
    const url = new URL(input.endpoint);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && !url.hostname.endsWith('.local') &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname);
  } catch { return false; }
}
async function createWatch(subscription, nowMs = Date.now(), env = process.env) {
  if (!ready(env)) return { ok: false, code: 'unavailable', message: 'Bridge push watching is not configured.' };
  if (!safeSubscription(subscription)) return { ok: false, code: 'invalid-subscription' };
  const id = watchId(subscription);
  const manageToken = crypto.randomBytes(24).toString('base64url');
  const existingRaw = await redis(['GET', PREFIX + id], env);
  let existing = null;
  try { existing = existingRaw ? JSON.parse(existingRaw) : null; } catch { /* replace invalid record */ }
  const watch = {
    id, subscription, manageTokenHash: tokenHash(manageToken),
    createdAt: nowMs, expiresAt: nowMs + WATCH_MS,
    alertDay: existing && existing.alertDay === dayInDetroit(nowMs) ? existing.alertDay : dayInDetroit(nowMs),
    alertCount: existing && existing.alertDay === dayInDetroit(nowMs) ? existing.alertCount || 0 : 0,
    lastAlertLevel: existing ? existing.lastAlertLevel || null : null
  };
  // No key is written until a valid subscription has been received.
  await redis(['SET', PREFIX + id, JSON.stringify(watch), 'EX', 48 * 60 * 60], env);
  await redis(['ZADD', KEY_INDEX, watch.expiresAt, id], env);
  return { ok: true, watchId: id, manageToken, expiresAt: new Date(watch.expiresAt).toISOString() };
}
async function getWatch(id, token, env = process.env) {
  if (!/^[a-f0-9]{64}$/.test(String(id || '')) || !/^[\w-]{24,90}$/.test(String(token || ''))) return null;
  const raw = await redis(['GET', PREFIX + id], env);
  if (!raw) return null;
  const item = JSON.parse(raw);
  return equalToken(item.manageTokenHash, tokenHash(token)) ? item : null;
}
async function stopWatch(id, token, env = process.env) {
  const item = await getWatch(id, token, env);
  if (!item) return { ok: false, code: 'watch-not-found' };
  await redis(['DEL', PREFIX + id], env);
  await redis(['ZREM', KEY_INDEX, id], env);
  return { ok: true };
}
async function sendPush(subscription, message, env = process.env, fetchImpl = fetch) {
  const keys = deriveVapidKeys(pushEnv(env));
  if (!keys) throw new Error('push keys unavailable');
  const payload = Buffer.from(JSON.stringify({
    title: 'Mackinac Bridge restriction update', body: message, url: '/mackinac-bridge-live/'
  }));
  const encrypted = encryptPushPayload(subscription, payload);
  const response = await fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization: 'vapid t=' + vapidJwt(subscription.endpoint, keys) + ', k=' + keys.publicKeyString,
      'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream',
      ttl: '300', urgency: 'high'
    },
    body: encrypted,
    signal: AbortSignal.timeout(8000)
  });
  return { ok: response.ok, expired: response.status === 404 || response.status === 410 };
}
async function releaseLock(token, env) {
  await redis(['EVAL',
    'if redis.call("GET",KEYS[1]) == ARGV[1] then return redis.call("DEL",KEYS[1]) else return 0 end',
    '1', KEY_LOCK, token], env).catch(() => {});
}
async function runCron(nowMs = Date.now(), deps = {}) {
  const env = deps.env || process.env;
  const commands = deps.command || ((cmd) => redis(cmd, env));
  const getOfficial = deps.getOfficial || fetchOfficial;
  const deliver = deps.send || ((sub, msg) => sendPush(sub, msg, env));
  if (!ready(env)) return { ok: false, code: 'unavailable' };
  const lock = crypto.randomBytes(16).toString('hex');
  if (await commands(['SET', KEY_LOCK, lock, 'NX', 'EX', 240]) !== 'OK') return { ok: true, state: 'already-running' };
  try {
    let official;
    try { official = await getOfficial(); } catch {
      return { ok: true, state: 'official-unavailable', notifications: 0 };
    }
    const level = officialLevel(official);
    if (!level) return { ok: true, state: 'official-unavailable', notifications: 0 };
    const oldRaw = await commands(['GET', KEY_STATE]);
    let previous = null;
    try { previous = oldRaw ? JSON.parse(oldRaw) : null; } catch { /* reset baseline */ }
    if (previous && previous.level === level) {
      return { ok: true, state: 'unchanged', level, notifications: 0 };
    }
    const next = { level, checkedAt: new Date(nowMs).toISOString() };
    if (!previous || !LEVELS.has(previous.level)) {
      await commands(['SET', KEY_STATE, JSON.stringify(next)]);
      return { ok: true, state: 'baseline', level, notifications: 0 };
    }
    // Keep index bounded; expired subscriptions can never receive alerts.
    await commands(['ZREMRANGEBYSCORE', KEY_INDEX, '-inf', nowMs]);
    const ids = await commands(['ZRANGEBYSCORE', KEY_INDEX, '(' + nowMs, '+inf', 'LIMIT', 0, 2000]) || [];
    const message = transitionMessage(level, official.wind_related);
    let sent = 0;
    let removed = 0;
    for (let i = 0; i < ids.length; i += 20) {
      const batch = ids.slice(i, i + 20);
      await Promise.all(batch.map(async (id) => {
        const key = PREFIX + id;
        const raw = await commands(['GET', key]);
        if (!raw) { await commands(['ZREM', KEY_INDEX, id]); return; }
        let w;
        try { w = JSON.parse(raw); } catch { await commands(['ZREM', KEY_INDEX, id]); return; }
        if (!w.subscription || w.expiresAt <= nowMs) return;
        if (w.lastAlertLevel === level) return;
        const day = dayInDetroit(nowMs);
        if (w.alertDay !== day) { w.alertDay = day; w.alertCount = 0; }
        if (w.alertCount >= MAX_DAILY) return;
        let push;
        try { push = await deliver(w.subscription, message); } catch { return; }
        if (push.expired) {
          await commands(['DEL', key]);
          await commands(['ZREM', KEY_INDEX, id]);
          removed++;
          return;
        }
        if (!push.ok) return;
        w.lastAlertLevel = level;
        w.alertCount++;
        // Keep original expiry; every alert must not renew a watch.
        await commands(['SET', key, JSON.stringify(w), 'PX', Math.max(1000, w.expiresAt - nowMs)]);
        sent++;
      }));
    }
    await commands(['SET', KEY_STATE, JSON.stringify(next)]);
    return { ok: true, state: 'transition', from: previous.level, to: level, notifications: sent, invalidSubscriptions: removed, truncated: ids.length >= 2000 };
  } finally {
    if (!deps.command) await releaseLock(lock, env);
    else await commands(['DEL', KEY_LOCK]).catch(() => {});
  }
}
module.exports = {
  ready, redisConfig, pushEnv, watchId, officialLevel, transitionMessage,
  fetchOfficial, createWatch, getWatch, stopWatch, sendPush, runCron, dayInDetroit
};
