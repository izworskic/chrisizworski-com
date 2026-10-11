'use strict';
const crypto = require('crypto');
const watch = require('../lib/mackinac-watch');
const { deriveVapidKeys } = require('../lib/flight-v3').webPush;

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(status).json(body);
}
function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET || '';
  const provided = String(req.headers?.authorization || '');
  const expected = 'Bearer ' + secret;
  if (!secret || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
function browserOriginAllowed(req) {
  const origin = String(req.headers?.origin || '');
  const host = String(req.headers?.host || '');
  const fetchSite = String(req.headers?.['sec-fetch-site'] || '');
  if (fetchSite === 'cross-site') return false;
  return Boolean(host && origin && origin === 'https://' + host);
}
module.exports = async function handler(req, res) {
  const action = String(Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action || '');
  if (req.method === 'GET' && action === 'vapid-key') {
    const available = watch.ready();
    const keys = available ? deriveVapidKeys(watch.pushEnv()) : null;
    return json(res, available ? 200 : 503, { ok: Boolean(keys), publicKey: keys?.publicKeyString || null });
  }
  if (req.method === 'GET' && action === 'cron') {
    if (!cronAuthorized(req)) return json(res, 401, { ok: false, code: 'unauthorized' });
    try {
      const outcome = await watch.runCron();
      console.log(JSON.stringify({ event: 'mackinac-watch-cron', ...outcome }));
      return json(res, outcome.ok ? 200 : 503, outcome);
    } catch (err) {
      console.error(JSON.stringify({ event: 'mackinac-watch-cron-error', error: String(err?.message || err) }));
      return json(res, 503, { ok: false, code: 'temporarily-unavailable' });
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, code: 'method-not-allowed' });
  }
  if (!browserOriginAllowed(req)) return json(res, 403, { ok: false, code: 'forbidden' });
  const size = Number(req.headers?.['content-length'] || 0);
  if (size > 8192) return json(res, 413, { ok: false, code: 'request-too-large' });
  const body = typeof req.body === 'object' ? req.body : (() => {
    try { return JSON.parse(req.body || '{}'); } catch { return {}; }
  })();
  try {
    if (action === 'status') {
      if (!watch.ready()) return json(res, 503, { ok: false, code: 'unavailable' });
      const item = await watch.getWatch(body.watchId, body.manageToken);
      return json(res, 200, { ok: true, active: Boolean(item && item.expiresAt > Date.now()), expiresAt: item ? new Date(item.expiresAt).toISOString() : null });
    }
    if (action === 'subscribe') {
      const result = await watch.createWatch(body.subscription);
      return json(res, result.ok ? 200 : result.code === 'invalid-subscription' ? 400 : 503, result);
    }
    if (action === 'unsubscribe') {
      const result = await watch.stopWatch(body.watchId, body.manageToken);
      return json(res, result.ok ? 200 : 404, result);
    }
    return json(res, 404, { ok: false, code: 'unknown-action' });
  } catch (err) {
    console.error(JSON.stringify({ event: 'mackinac-watch-api-error', action, message: String(err?.message || err) }));
    return json(res, 503, { ok: false, code: 'temporarily-unavailable' });
  }
};
