'use strict';

const crypto = require('crypto');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const WATCH_INDEX = 'flight:v3:watches';
const WATCH_PREFIX = 'flight:v3:watch:';
const SHARE_PREFIX = 'flight:v3:share:';
const HISTORY_INDEX_PREFIX = 'flight:v3:history-index:';
const HISTORY_PREFIX = 'flight:v3:history:';
const WATCH_LEAD_MS = 4 * 60 * 60 * 1000;
const WATCH_STEP_MS = 5 * 60 * 1000;
const WATCH_AFTER_ARRIVAL_MS = 60 * 60 * 1000;
const SHARE_AFTER_ARRIVAL_MS = 6 * 60 * 60 * 1000;
const MAX_ALERTS = 8;
const MAX_WATCHES_PER_CRON = 24;
const MAX_PUSH_PAYLOAD_BYTES = 3000;

function clean(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g,'');
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeDateMs(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function b64url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function fromB64url(value) {
  const normalized = String(value || '').replace(/-/g,'+').replace(/_/g,'/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(padded,'base64');
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function redisReady() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redis(command) {
  if (!redisReady()) throw new Error('redis unavailable');
  const response = await fetch(REDIS_URL,{
    method:'POST',
    headers:{
      authorization:'Bearer ' + REDIS_TOKEN,
      'content-type':'application/json'
    },
    body:JSON.stringify(command),
    signal:AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error('redis ' + response.status);
  const body = await response.json();
  if (body?.error) throw new Error(String(body.error));
  return body?.result;
}

async function redisGetJson(key) {
  const raw = await redis(['GET',key]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function redisSetJson(key,value,ttlSeconds) {
  const args = ['SET',key,JSON.stringify(value)];
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) args.push('EX',Math.max(60,Math.round(ttlSeconds)));
  await redis(args);
}

function jsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length <= 100000) {
    try { return JSON.parse(req.body); } catch {}
  }
  return {};
}

function sameOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = String(req.headers?.host || '');
    return parsed.host === host || origin === 'https://chrisizworski.com';
  } catch {
    return false;
  }
}

function sendJson(res,status,body) {
  res.statusCode = status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  return res.end(JSON.stringify(body));
}

function stateUrl({flight,date,flightId}) {
  const params = new URLSearchParams({flight:clean(flight),date:String(date || ''),unified:'1'});
  if (flightId) params.set('flightId',String(flightId));
  return 'https://chrisizworski.com/api/flight-assignment?' + params.toString();
}

async function fetchUnifiedFlight(identity) {
  const response = await fetch(stateUrl(identity),{
    headers:{accept:'application/json','user-agent':'ChrisIzworski-FlightV3/1.0'},
    signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('flight state ' + response.status);
  const state = await response.json();
  if (state?.status !== 'found' || !state?.assignment) return null;
  await recordHistoryFromState(state,identity).catch(() => {});
  return state;
}

function routeAirportCode(airport) {
  return clean(airport?.iata || airport?.code || airport?.icao || '');
}

function cityName(airport) {
  return String(airport?.city || airport?.name || routeAirportCode(airport) || 'the airport').trim();
}

function currentDelayMinutes(state) {
  const fs = state?.assignment?.flightStatus || {};
  const values = [finite(fs.departureDelayMinutes), finite(fs.arrivalDelayMinutes)].filter(Number.isFinite);
  const text = [fs.description,fs.label].filter(Boolean).join(' ');
  const match = text.match(/delay(?:ed)?(?:\s+by)?\s*(\d{1,3})\s*m/i);
  if (match) values.push(Number(match[1]));
  return values.length ? Math.max(0,...values) : 0;
}

function isDivertedState(state) {
  const a = state?.assignment || {};
  const text = [a?.flightStatus?.label,a?.flightStatus?.description,a?.note].filter(Boolean).join(' ');
  return /divert/i.test(text);
}

function bestDepartureMs(state) {
  const s = state?.assignment?.schedule || {};
  return safeDateMs(s.actualDepartureUTC) ?? safeDateMs(s.estimatedDepartureUTC) ?? safeDateMs(s.scheduledDepartureUTC);
}

function bestArrivalMs(state) {
  const s = state?.assignment?.schedule || {};
  return safeDateMs(s.actualArrivalUTC) ?? safeDateMs(s.estimatedArrivalUTC) ?? safeDateMs(s.scheduledArrivalUTC);
}

function watchWindow(state,nowMs = Date.now()) {
  const dep = bestDepartureMs(state);
  const arr = bestArrivalMs(state);
  if (state?.assignment?.flightStatus?.landed === true) {
    return {active:false,reason:'arrived',startMs:dep ? dep - WATCH_LEAD_MS : null,endMs:arr ? arr + WATCH_AFTER_ARRIVAL_MS : null,nextPollMs:null};
  }
  const start = dep ? dep - WATCH_LEAD_MS : nowMs;
  const end = arr ? arr + WATCH_AFTER_ARRIVAL_MS : nowMs + 18 * 60 * 60 * 1000;
  if (nowMs < start) return {active:false,reason:'not-started',startMs:start,endMs:end,nextPollMs:start};
  if (nowMs > end) return {active:false,reason:'expired',startMs:start,endMs:end,nextPollMs:null};
  return {active:true,reason:'active',startMs:start,endMs:end,nextPollMs:nowMs + WATCH_STEP_MS};
}

function snapshotState(state) {
  const inbound = state?.recentInboundOccurrence || null;
  const live = state?.live || null;
  const freshGround = live?.positionFresh === true && live?.aircraft?.onGround === true;
  const speed = live?.positionFresh === true ? finite(live?.aircraft?.speedKnots) : null;
  return {
    renderedState:state?.renderedState || null,
    statusState:state?.statusState || null,
    canceled:state?.assignment?.flightStatus?.canceled === true,
    diverted:isDivertedState(state),
    landed:state?.assignment?.flightStatus?.landed === true,
    airborne:state?.assignment?.flightStatus?.airborne === true,
    originGate:String(state?.assignment?.origin?.gate || '').trim() || null,
    destinationGate:String(state?.assignment?.destination?.gate || '').trim() || null,
    delayMinutes:currentDelayMinutes(state),
    actualDepartureUTC:state?.assignment?.schedule?.actualDepartureUTC || null,
    inboundFlightId:inbound?.flightId || null,
    inboundFlightNumber:inbound?.flightNumber || null,
    inboundLanded:inbound?.flightStatus?.landed === true,
    inboundAirborne:inbound?.flightStatus?.airborne === true && inbound?.flightStatus?.landed !== true,
    inboundArrivalUTC:inbound?.schedule?.actualArrivalUTC || inbound?.schedule?.estimatedArrivalUTC || null,
    onGroundFresh:freshGround,
    groundSpeedKnots:freshGround ? speed : null
  };
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '';
  const m = Math.max(0,Math.round(minutes));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? h + 'h ' + rem + 'm' : h + 'h';
}

function minutesUntil(ms,nowMs = Date.now()) {
  return Number.isFinite(ms) ? Math.round((ms - nowMs) / 60000) : null;
}

function alertText(kind,state,detail = {},nowMs = Date.now()) {
  const a = state.assignment;
  const origin = cityName(a.origin);
  const destination = cityName(a.destination);
  if (kind === 'inbound-landed') {
    const mins = minutesUntil(bestDepartureMs(state),nowMs);
    return 'Your plane just landed in ' + origin + ' — your flight to ' + destination +
      (Number.isFinite(mins) && mins > 0 ? ' departs in about ' + formatDuration(mins) + '.' : ' is next.');
  }
  if (kind === 'pushback') {
    return 'Your plane just started moving on the ground in ' + origin + ' — departure is getting underway.';
  }
  if (kind === 'origin-gate') {
    return 'Your departure gate in ' + origin + ' changed from ' + detail.from + ' to ' + detail.to + '.';
  }
  if (kind === 'destination-gate') {
    return 'Your arrival gate in ' + destination + ' changed from ' + detail.from + ' to ' + detail.to + '.';
  }
  if (kind === 'delay') {
    return a.flightNumber + ' to ' + destination + ' is now delayed about ' + detail.minutes + ' minutes.';
  }
  if (kind === 'canceled') {
    return a.flightNumber + ' to ' + destination + ' was canceled.';
  }
  if (kind === 'diverted') {
    return a.flightNumber + ' is being reported as diverted — check the airline for the new arrival plan.';
  }
  return '';
}

function transitionAlerts(watch,state,nowMs = Date.now()) {
  const previous = watch?.lastSnapshot || null;
  const current = snapshotState(state);
  if (!previous) return {alerts:[],snapshot:current,lastNotifiedDelay:current.delayMinutes};

  const alerts = [];
  if (!previous.canceled && current.canceled) alerts.push({kind:'canceled',text:alertText('canceled',state,{},nowMs)});
  if (!previous.diverted && current.diverted) alerts.push({kind:'diverted',text:alertText('diverted',state,{},nowMs)});

  if (previous.inboundFlightId && current.inboundFlightId === previous.inboundFlightId &&
      previous.inboundAirborne && current.inboundLanded) {
    alerts.push({kind:'inbound-landed',text:alertText('inbound-landed',state,{},nowMs)});
  }

  const wasMoving = previous.onGroundFresh && Number.isFinite(previous.groundSpeedKnots) && previous.groundSpeedKnots >= 5;
  const isMoving = current.onGroundFresh && Number.isFinite(current.groundSpeedKnots) && current.groundSpeedKnots >= 5;
  const beforeDeparture = state?.assignment?.flightStatus?.airborne !== true && state?.assignment?.flightStatus?.landed !== true;
  if (!wasMoving && isMoving && beforeDeparture) {
    alerts.push({kind:'pushback',text:alertText('pushback',state,{},nowMs)});
  }

  if (previous.originGate && current.originGate && previous.originGate !== current.originGate) {
    alerts.push({kind:'origin-gate',text:alertText('origin-gate',state,{from:previous.originGate,to:current.originGate},nowMs)});
  }
  if (previous.destinationGate && current.destinationGate && previous.destinationGate !== current.destinationGate) {
    alerts.push({kind:'destination-gate',text:alertText('destination-gate',state,{from:previous.destinationGate,to:current.destinationGate},nowMs)});
  }

  const baseline = Number.isFinite(watch?.lastNotifiedDelay) ? watch.lastNotifiedDelay : previous.delayMinutes || 0;
  let lastNotifiedDelay = baseline;
  if (current.delayMinutes >= baseline + 15) {
    alerts.push({kind:'delay',text:alertText('delay',state,{minutes:current.delayMinutes},nowMs)});
    lastNotifiedDelay = current.delayMinutes;
  }

  return {alerts,snapshot:current,lastNotifiedDelay};
}

function deriveVapidKeys(env = process.env) {
  const secret = String(env.FLIGHT_WATCH_VAPID_SECRET || env.CRON_SECRET || '');
  if (!secret) return null;
  const ecdh = crypto.createECDH('prime256v1');
  let privateKey = crypto.createHash('sha256').update('flight-watch-vapid-v1\0' + secret).digest();
  for (let i=0;i<8;i++) {
    try {
      ecdh.setPrivateKey(privateKey);
      const publicKey = ecdh.getPublicKey();
      return {privateKey:ecdh.getPrivateKey(),publicKey,publicKeyString:b64url(publicKey)};
    } catch {
      privateKey = crypto.createHash('sha256').update(privateKey).digest();
    }
  }
  return null;
}

function hkdf(salt,ikm,info,length) {
  const prk = crypto.createHmac('sha256',salt).update(ikm).digest();
  return crypto.createHmac('sha256',prk).update(Buffer.concat([Buffer.from(info),Buffer.from([1])])).digest().subarray(0,length);
}

function encryptPushPayload(subscription,payload) {
  const clientPublic = fromB64url(subscription?.keys?.p256dh);
  const auth = fromB64url(subscription?.keys?.auth);
  if (clientPublic.length !== 65 || auth.length < 16) throw new Error('invalid push keys');

  const local = crypto.createECDH('prime256v1');
  local.generateKeys();
  const localPublic = local.getPublicKey();
  const shared = local.computeSecret(clientPublic);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'),clientPublic,localPublic]);
  const ikm = hkdf(auth,shared,info,32);
  const salt = crypto.randomBytes(16);
  const cek = hkdf(salt,ikm,Buffer.from('Content-Encoding: aes128gcm\0'),16);
  const nonce = hkdf(salt,ikm,Buffer.from('Content-Encoding: nonce\0'),12);
  const plain = Buffer.concat([Buffer.from(payload),Buffer.from([2])]);
  const cipher = crypto.createCipheriv('aes-128-gcm',cek,nonce);
  const encrypted = Buffer.concat([cipher.update(plain),cipher.final()]);
  const tag = cipher.getAuthTag();
  const header = Buffer.alloc(21);
  salt.copy(header,0);
  header.writeUInt32BE(4096,16);
  header.writeUInt8(localPublic.length,20);
  return Buffer.concat([header,localPublic,encrypted,tag]);
}

function vapidJwt(endpoint,keys,nowSeconds = Math.floor(Date.now()/1000)) {
  const audience = new URL(endpoint).origin;
  const header = b64url(Buffer.from(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const payload = b64url(Buffer.from(JSON.stringify({
    aud:audience,
    exp:nowSeconds + 12 * 60 * 60,
    sub:'https://chrisizworski.com/flight-tracker/'
  })));
  const signing = header + '.' + payload;
  const pub = keys.publicKey;
  const jwk = {
    kty:'EC',
    crv:'P-256',
    x:b64url(pub.subarray(1,33)),
    y:b64url(pub.subarray(33,65)),
    d:b64url(keys.privateKey)
  };
  const privateKey = crypto.createPrivateKey({key:jwk,format:'jwk'});
  const signature = crypto.sign('sha256',Buffer.from(signing),{key:privateKey,dsaEncoding:'ieee-p1363'});
  return signing + '.' + b64url(signature);
}

async function sendWebPush(subscription,message,env = process.env) {
  const endpoint = String(subscription?.endpoint || '');
  if (!endpoint.startsWith('https://')) throw new Error('invalid push endpoint');
  const keys = deriveVapidKeys(env);
  if (!keys) throw new Error('push not configured');
  const payload = Buffer.from(JSON.stringify({
    title:'Flight update',
    body:String(message || '').slice(0,500),
    url:'/flight-tracker/'
  }));
  if (payload.length > MAX_PUSH_PAYLOAD_BYTES) throw new Error('push payload too large');
  const encrypted = encryptPushPayload(subscription,payload);
  const jwt = vapidJwt(endpoint,keys);
  const response = await fetch(endpoint,{
    method:'POST',
    headers:{
      authorization:'vapid t=' + jwt + ', k=' + keys.publicKeyString,
      'content-encoding':'aes128gcm',
      'content-type':'application/octet-stream',
      ttl:'300',
      urgency:'normal'
    },
    body:encrypted,
    signal:AbortSignal.timeout(8000)
  });
  return {ok:response.ok,status:response.status,expired:response.status === 404 || response.status === 410};
}

function validateSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return false;
  if (!String(subscription.endpoint || '').startsWith('https://')) return false;
  if (String(subscription.endpoint).length > 2000) return false;
  const p = String(subscription?.keys?.p256dh || '');
  const a = String(subscription?.keys?.auth || '');
  return p.length >= 80 && p.length <= 200 && a.length >= 16 && a.length <= 100;
}

function watchKey(id) {
  return WATCH_PREFIX + id;
}

function watchTtlSeconds(state,nowMs = Date.now()) {
  const arrival = bestArrivalMs(state) || (nowMs + 18 * 60 * 60 * 1000);
  return Math.max(3600,Math.ceil((arrival + 8 * 60 * 60 * 1000 - nowMs) / 1000));
}

async function createWatch(body,nowMs = Date.now()) {
  if (!redisReady()) return {ok:false,code:'storage-unavailable',message:'Flight watching is temporarily unavailable.'};
  if (!validateSubscription(body.subscription)) return {ok:false,code:'invalid-subscription',message:'Browser notification subscription was invalid.'};
  const identity = {
    flight:clean(body.flight),
    date:String(body.date || ''),
    flightId:body.flightId ? String(body.flightId) : null
  };
  const state = await fetchUnifiedFlight(identity);
  if (!state) return {ok:false,code:'flight-unavailable',message:'Flight state is unavailable right now.'};
  if (state.assignment.flightStatus?.landed) return {ok:false,code:'arrived',message:'This flight has already arrived.'};
  if (state.assignment.flightStatus?.canceled) return {ok:false,code:'canceled',message:'This flight is canceled.'};

  const id = randomToken(16);
  const manageToken = randomToken(18);
  const window = watchWindow(state,nowMs);
  const snapshot = snapshotState(state);
  const watch = {
    id,
    manageTokenHash:crypto.createHash('sha256').update(manageToken).digest('hex'),
    identity,
    subscription:body.subscription,
    createdAt:new Date(nowMs).toISOString(),
    alertCount:0,
    lastNotifiedDelay:snapshot.delayMinutes,
    lastSnapshot:snapshot,
    lastCheckedAt:new Date(nowMs).toISOString(),
    nextPollAt:window.nextPollMs ? new Date(window.nextPollMs).toISOString() : null
  };
  await redisSetJson(watchKey(id),watch,watchTtlSeconds(state,nowMs));
  if (window.nextPollMs) await redis(['ZADD',WATCH_INDEX,window.nextPollMs,id]);
  return {
    ok:true,
    watchId:id,
    manageToken,
    active:window.active,
    startsAt:window.startMs ? new Date(window.startMs).toISOString() : null,
    message:window.active ? 'Watching this flight.' : 'Watching is set and will start four hours before departure.'
  };
}

async function removeWatch(body) {
  const id = String(body.watchId || '');
  const token = String(body.manageToken || '');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id) || !token) return {ok:false,code:'invalid-watch'};
  const watch = await redisGetJson(watchKey(id));
  if (!watch) return {ok:true};
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(String(watch.manageTokenHash || ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return {ok:false,code:'forbidden'};
  await Promise.all([redis(['DEL',watchKey(id)]),redis(['ZREM',WATCH_INDEX,id])]);
  return {ok:true};
}

async function processWatch(watch,state,nowMs = Date.now()) {
  const window = watchWindow(state,nowMs);
  if (state.assignment.flightStatus?.landed === true || window.reason === 'expired') {
    await redis(['ZREM',WATCH_INDEX,watch.id]);
    watch.lastSnapshot = snapshotState(state);
    watch.lastCheckedAt = new Date(nowMs).toISOString();
    await redisSetJson(watchKey(watch.id),watch,Math.max(3600,watchTtlSeconds(state,nowMs)));
    return {id:watch.id,stopped:true,alerts:0};
  }
  if (!window.active) {
    if (window.nextPollMs) await redis(['ZADD',WATCH_INDEX,window.nextPollMs,watch.id]);
    return {id:watch.id,deferred:true,alerts:0};
  }

  const transition = transitionAlerts(watch,state,nowMs);
  let sent = 0;
  let expiredSubscription = false;
  for (const alert of transition.alerts) {
    if ((watch.alertCount || 0) + sent >= MAX_ALERTS) break;
    if (!alert.text) continue;
    const result = await sendWebPush(watch.subscription,alert.text).catch(() => ({ok:false,status:0,expired:false}));
    if (result.expired) {
      expiredSubscription = true;
      break;
    }
    if (result.ok) sent += 1;
  }

  if (expiredSubscription) {
    await Promise.all([redis(['DEL',watchKey(watch.id)]),redis(['ZREM',WATCH_INDEX,watch.id])]);
    return {id:watch.id,expiredSubscription:true,alerts:sent};
  }

  watch.alertCount = Math.min(MAX_ALERTS,(watch.alertCount || 0) + sent);
  watch.lastSnapshot = transition.snapshot;
  watch.lastNotifiedDelay = transition.lastNotifiedDelay;
  watch.lastCheckedAt = new Date(nowMs).toISOString();
  watch.nextPollAt = new Date(nowMs + WATCH_STEP_MS).toISOString();
  await redisSetJson(watchKey(watch.id),watch,watchTtlSeconds(state,nowMs));
  await redis(['ZADD',WATCH_INDEX,nowMs + WATCH_STEP_MS,watch.id]);
  return {id:watch.id,alerts:sent,alertCount:watch.alertCount};
}

async function runWatchCron(nowMs = Date.now()) {
  if (!redisReady()) return {ok:false,code:'storage-unavailable'};
  const ids = await redis(['ZRANGEBYSCORE',WATCH_INDEX,'-inf',nowMs,'LIMIT',0,MAX_WATCHES_PER_CRON]) || [];
  if (!ids.length) return {ok:true,checked:0,flights:0,alerts:0};

  const rawWatches = await redis(['MGET',...ids.map(watchKey)]) || [];
  const watches = rawWatches.map(raw => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }).filter(Boolean);
  const groups = new Map();
  for (const watch of watches) {
    const i = watch.identity || {};
    const key = [i.flight,i.date,i.flightId || ''].join('|');
    if (!groups.has(key)) groups.set(key,{identity:i,watches:[]});
    groups.get(key).watches.push(watch);
  }

  let alerts = 0;
  let checked = 0;
  for (const group of groups.values()) {
    const state = await fetchUnifiedFlight(group.identity).catch(() => null);
    if (!state) {
      for (const watch of group.watches) {
        await redis(['ZADD',WATCH_INDEX,nowMs + WATCH_STEP_MS,watch.id]).catch(() => {});
      }
      continue;
    }
    for (const watch of group.watches) {
      const result = await processWatch(watch,state,nowMs).catch(() => null);
      if (result) {
        checked += 1;
        alerts += result.alerts || 0;
      }
    }
  }
  return {ok:true,checked,flights:groups.size,alerts};
}

function formatClock(ms,timeZone) {
  if (!Number.isFinite(ms)) return null;
  try {
    return new Intl.DateTimeFormat('en-US',{
      timeZone:timeZone || 'UTC',
      hour:'numeric',
      minute:'2-digit'
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(11,16) + ' UTC';
  }
}

function simpleShareState(state) {
  const a = state.assignment;
  const delay = currentDelayMinutes(state);
  const arrivalMs = bestArrivalMs(state);
  const arrivalClock = formatClock(arrivalMs,a?.destination?.timezone);
  const actualArrival = safeDateMs(a?.schedule?.actualArrivalUTC);
  let statusText = 'Scheduled';
  if (a.flightStatus?.canceled) statusText = 'Canceled';
  else if (a.flightStatus?.landed) statusText = 'Landed' + (actualArrival ? ' ' + formatClock(actualArrival,a?.destination?.timezone) : '');
  else if (a.flightStatus?.airborne) statusText = delay >= 1 ? 'In flight · delayed ' + delay + ' minutes' : 'In flight';
  else if (delay >= 1) statusText = 'Delayed ' + delay + ' minutes';

  let whereText = '';
  if (a.flightStatus?.landed) {
    whereText = 'The flight has arrived in ' + cityName(a.destination) + '.';
  } else if (a.flightStatus?.airborne) {
    whereText = 'The flight is in the air to ' + cityName(a.destination) +
      (arrivalClock ? ', landing around ' + arrivalClock + '.' : '.');
  } else if (state.renderedState === 'parked-origin-confirmed' || state.renderedState === 'ground-live') {
    whereText = 'The plane is on the ground in ' + cityName(a.origin) + ' before departure.';
  } else {
    whereText = 'The current aircraft location is not confirmed.';
  }

  return {
    flightNumber:a.flightNumber,
    route:{
      origin:cityName(a.origin),
      originCode:routeAirportCode(a.origin),
      destination:cityName(a.destination),
      destinationCode:routeAirportCode(a.destination)
    },
    statusText,
    whereText,
    arrival:{
      time:arrivalClock,
      terminal:String(a?.destination?.terminal || '').trim() || null,
      gate:String(a?.destination?.gate || '').trim() || null
    },
    updatedAt:state.generatedAt || new Date().toISOString()
  };
}

function shareExpiryMs(state) {
  const arrival = bestArrivalMs(state);
  return arrival ? arrival + SHARE_AFTER_ARRIVAL_MS : Date.now() + 24 * 60 * 60 * 1000;
}

async function createShare(body) {
  if (!redisReady()) return {ok:false,code:'storage-unavailable'};
  const identity = {flight:clean(body.flight),date:String(body.date || ''),flightId:body.flightId ? String(body.flightId) : null};
  const state = await fetchUnifiedFlight(identity);
  if (!state) return {ok:false,code:'flight-unavailable'};
  const expiresAtMs = shareExpiryMs(state);
  if (expiresAtMs <= Date.now()) return {ok:false,code:'expired'};
  const token = randomToken(24);
  const record = {
    identity,
    createdAt:new Date().toISOString(),
    fallback:simpleShareState(state)
  };
  const ttl = Math.max(3600,Math.ceil((expiresAtMs + 18 * 60 * 60 * 1000 - Date.now()) / 1000));
  await redisSetJson(SHARE_PREFIX + token,record,ttl);
  return {
    ok:true,
    token,
    url:'https://chrisizworski.com/flight-tracker/share/' + token,
    expiresAt:new Date(expiresAtMs).toISOString()
  };
}

async function getShare(token) {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(String(token || ''))) return {ok:false,code:'not-found'};
  const key = SHARE_PREFIX + token;
  const record = await redisGetJson(key);
  if (!record) return {ok:false,code:'not-found'};
  const state = await fetchUnifiedFlight(record.identity).catch(() => null);
  if (!state) return {ok:true,stale:true,share:record.fallback,expiresAt:null};
  const expiresAtMs = shareExpiryMs(state);
  if (Date.now() > expiresAtMs) {
    await redis(['DEL',key]).catch(() => {});
    return {ok:false,code:'expired'};
  }
  const share = simpleShareState(state);
  record.fallback = share;
  await redisSetJson(key,record,Math.max(3600,Math.ceil((expiresAtMs + 18 * 60 * 60 * 1000 - Date.now())/1000))).catch(() => {});
  return {ok:true,stale:false,share,expiresAt:new Date(expiresAtMs).toISOString()};
}

function isInternationalLeg(assignment) {
  const from = String(assignment?.origin?.country || '').toUpperCase();
  const to = String(assignment?.destination?.country || '').toUpperCase();
  return Boolean(from && to && from !== to);
}

function publishedMct(airportCode,inboundInternational,outboundInternational,env = process.env) {
  const raw = String(env.FLIGHT_PUBLISHED_MCT_JSON || '');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const airport = data?.[airportCode];
    if (!airport) return null;
    const key = (inboundInternational ? 'I' : 'D') + (outboundInternational ? 'I' : 'D');
    const item = airport[key] || airport.default;
    const minutes = finite(typeof item === 'object' ? item.minutes : item);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) return null;
    return {
      minutes,
      kind:'published',
      label:typeof item === 'object' ? String(item.label || 'Published minimum connection time') : 'Published minimum connection time',
      sourceUrl:typeof item === 'object' ? String(item.sourceUrl || '') || null : null
    };
  } catch {
    return null;
  }
}

function transferAllowance(primary,onward,env = process.env) {
  const airport = routeAirportCode(primary?.assignment?.destination);
  const inboundInternational = isInternationalLeg(primary.assignment);
  const outboundInternational = isInternationalLeg(onward.assignment);
  const published = publishedMct(airport,inboundInternational,outboundInternational,env);
  if (published) return published;

  const arrivalTerminal = String(primary?.assignment?.destination?.terminal || '').trim() || null;
  const departureTerminal = String(onward?.assignment?.origin?.terminal || '').trim() || null;
  if (!arrivalTerminal || !departureTerminal) {
    return {minutes:null,kind:'unknown',label:'Terminal transfer time cannot be estimated because terminal data is missing.',sourceUrl:null};
  }
  if (arrivalTerminal === departureTerminal) {
    return {minutes:15,kind:'assumption',label:'15-minute same-terminal transfer assumption',sourceUrl:null};
  }
  return {
    minutes:inboundInternational || outboundInternational ? 45 : 30,
    kind:'assumption',
    label:(inboundInternational || outboundInternational ? '45-minute' : '30-minute') + ' different-terminal transfer assumption',
    sourceUrl:null
  };
}

function connectionAnalysis(primary,onward,env = process.env) {
  const connectionCode = routeAirportCode(primary?.assignment?.destination);
  const onwardOrigin = routeAirportCode(onward?.assignment?.origin);
  if (!connectionCode || connectionCode !== onwardOrigin) {
    return {ok:false,code:'route-mismatch',message:'The connecting flight does not depart from the first flight’s arrival airport.'};
  }
  const arrivalMs = safeDateMs(primary?.assignment?.schedule?.actualArrivalUTC) ??
    safeDateMs(primary?.assignment?.schedule?.estimatedArrivalUTC) ??
    safeDateMs(primary?.assignment?.schedule?.scheduledArrivalUTC);
  const departureMs = safeDateMs(onward?.assignment?.schedule?.actualDepartureUTC) ??
    safeDateMs(onward?.assignment?.schedule?.estimatedDepartureUTC) ??
    safeDateMs(onward?.assignment?.schedule?.scheduledDepartureUTC);
  if (!arrivalMs || !departureMs) return {ok:false,code:'times-unavailable',message:'Reliable arrival or departure timing is unavailable.'};

  const international = isInternationalLeg(primary.assignment);
  const deplaneMinutes = international ? 25 : 15;
  const transfer = transferAllowance(primary,onward,env);
  const rawLayoverMinutes = Math.round((departureMs - arrivalMs) / 60000);
  const unknowns = [];
  if (!primary?.assignment?.destination?.gate) unknowns.push('arrival gate');
  if (!onward?.assignment?.origin?.gate) unknowns.push('departure gate');
  if (!primary?.assignment?.destination?.terminal) unknowns.push('arrival terminal');
  if (!onward?.assignment?.origin?.terminal) unknowns.push('departure terminal');

  if (!Number.isFinite(transfer.minutes)) {
    return {
      ok:true,
      verdict:null,
      label:'Can’t score yet',
      airport:connectionCode,
      rawLayoverMinutes,
      deplaneMinutes,
      transfer,
      slackMinutes:null,
      arrivalUTC:new Date(arrivalMs).toISOString(),
      departureUTC:new Date(departureMs).toISOString(),
      unknowns,
      note:'The terminal transfer portion is unknown, so a connection verdict would be a guess.'
    };
  }

  const slackMinutes = rawLayoverMinutes - deplaneMinutes - transfer.minutes;
  const verdict = slackMinutes > 60 ? 'comfortable' : slackMinutes >= 30 ? 'tight' : 'unlikely';
  const labels = {comfortable:'Comfortable',tight:'Tight',unlikely:'Unlikely'};
  return {
    ok:true,
    verdict,
    label:labels[verdict],
    airport:connectionCode,
    rawLayoverMinutes,
    deplaneMinutes,
    transfer,
    slackMinutes,
    arrivalUTC:new Date(arrivalMs).toISOString(),
    departureUTC:new Date(departureMs).toISOString(),
    unknowns,
    note:unknowns.length ? 'Missing: ' + unknowns.join(', ') + '. The verdict uses only the stated terminal-transfer allowance.' : null
  };
}

async function checkConnection(body) {
  const primaryIdentity = {
    flight:clean(body.flight),
    date:String(body.date || ''),
    flightId:body.flightId ? String(body.flightId) : null
  };
  const onwardIdentity = {
    flight:clean(body.connectionFlight),
    date:String(body.connectionDate || ''),
    flightId:body.connectionFlightId ? String(body.connectionFlightId) : null
  };
  const [primary,onward] = await Promise.all([fetchUnifiedFlight(primaryIdentity),fetchUnifiedFlight(onwardIdentity)]);
  if (!primary || !onward) return {ok:false,code:'flight-unavailable',message:'One of the two flights could not be resolved.'};
  return {...connectionAnalysis(primary,onward),primaryFlight:primary.assignment.flightNumber,onwardFlight:onward.assignment.flightNumber};
}

function historyIndexKey(flight) {
  return HISTORY_INDEX_PREFIX + clean(flight);
}

function historyKey(flight,date) {
  return HISTORY_PREFIX + clean(flight) + ':' + String(date || '');
}

async function recordHistoryFromState(state,identity) {
  if (!redisReady() || !state?.assignment) return;
  const flight = clean(state.assignment.flightNumber || identity?.flight);
  const date = String(identity?.date || '').slice(0,10);
  if (!flight || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const a = state.assignment;
  const final = a.flightStatus?.landed === true || a.flightStatus?.canceled === true;
  const record = {
    flight,
    date,
    final,
    landed:a.flightStatus?.landed === true,
    canceled:a.flightStatus?.canceled === true,
    arrivalDelayMinutes:finite(a.flightStatus?.arrivalDelayMinutes),
    departureDelayMinutes:finite(a.flightStatus?.departureDelayMinutes),
    updatedAt:state.generatedAt || new Date().toISOString()
  };
  await redisSetJson(historyKey(flight,date),record,40 * 24 * 60 * 60);
  const score = Date.parse(date + 'T12:00:00Z');
  if (Number.isFinite(score)) {
    await redis(['ZADD',historyIndexKey(flight),score,date]);
    await redis(['ZREMRANGEBYSCORE',historyIndexKey(flight),'-inf',Date.now() - 45 * 24 * 60 * 60 * 1000]);
  }
}

async function reliabilityFor(identity) {
  const current = await fetchUnifiedFlight(identity).catch(() => null);
  if (!current) return {ok:false,available:false};
  const flight = clean(current.assignment.flightNumber);
  if (!redisReady()) return {ok:true,available:false};
  const start = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const dates = await redis(['ZRANGEBYSCORE',historyIndexKey(flight),start,Date.now()]) || [];
  if (!dates.length) return {ok:true,available:false};
  const raws = await redis(['MGET',...dates.map(date => historyKey(flight,date))]) || [];
  const records = raws.map(raw => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }).filter(r => r?.final);
  if (records.length < 5) return {ok:true,available:false,sampleSize:records.length};

  const canceled = records.filter(r => r.canceled).length;
  const operated = records.filter(r => r.landed && !r.canceled);
  const withArrivalDelay = operated.filter(r => Number.isFinite(r.arrivalDelayMinutes));
  if (operated.length < 4 || withArrivalDelay.length < 4) return {ok:true,available:false,sampleSize:records.length};
  const onTime = withArrivalDelay.filter(r => r.arrivalDelayMinutes <= 15).length;
  const onTimePct = Math.round(onTime / withArrivalDelay.length * 100);
  const averageDelayMinutes = Math.round(withArrivalDelay.reduce((sum,r) => sum + Math.max(0,r.arrivalDelayMinutes),0) / withArrivalDelay.length);
  const cancellationRatePct = Math.round(canceled / records.length * 100);
  const todayDelay = currentDelayMinutes(current);
  let context = flight + ' is on time ' + onTimePct + '% of the time.';
  if (Number.isFinite(todayDelay)) {
    if (Math.abs(todayDelay - averageDelayMinutes) <= 10) context += ' Today’s ' + todayDelay + '-minute delay is about average.';
    else if (todayDelay > averageDelayMinutes) context += ' Today’s ' + todayDelay + '-minute delay is above its recent average.';
    else context += ' Today’s ' + todayDelay + '-minute delay is better than its recent average.';
  }
  return {
    ok:true,
    available:true,
    flight,
    days:30,
    sampleSize:records.length,
    onTimePct,
    averageDelayMinutes,
    cancellationRatePct,
    context
  };
}

async function handlePost(req,res,action) {
  if (!sameOrigin(req)) return sendJson(res,403,{ok:false,code:'forbidden'});
  const body = jsonBody(req);
  try {
    if (action === 'watch-subscribe') return sendJson(res,200,await createWatch(body));
    if (action === 'watch-unsubscribe') return sendJson(res,200,await removeWatch(body));
    if (action === 'share-create') return sendJson(res,200,await createShare(body));
    if (action === 'connection') return sendJson(res,200,await checkConnection(body));
    return sendJson(res,404,{ok:false,code:'unknown-action'});
  } catch (error) {
    console.error(JSON.stringify({event:'flight-v3-error',action,message:String(error?.message || error)}));
    return sendJson(res,200,{ok:false,code:'temporarily-unavailable',message:'This flight feature is temporarily unavailable.'});
  }
}

async function handleGet(req,res,action) {
  try {
    if (action === 'vapid-key') {
      const keys = deriveVapidKeys();
      return sendJson(res,keys ? 200 : 503,{ok:Boolean(keys),publicKey:keys?.publicKeyString || null});
    }
    if (action === 'share') {
      return sendJson(res,200,await getShare(Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token));
    }
    if (action === 'reliability') {
      const identity = {
        flight:Array.isArray(req.query?.flight) ? req.query.flight[0] : req.query?.flight,
        date:Array.isArray(req.query?.date) ? req.query.date[0] : req.query?.date,
        flightId:Array.isArray(req.query?.flightId) ? req.query.flightId[0] : req.query?.flightId
      };
      return sendJson(res,200,await reliabilityFor(identity));
    }
    if (action === 'cron') {
      const secret = String(process.env.CRON_SECRET || '');
      const auth = String(req.headers?.authorization || '');
      if (!secret || auth !== 'Bearer ' + secret) return sendJson(res,401,{ok:false,code:'unauthorized'});
      const result = await runWatchCron();
      console.log(JSON.stringify({event:'flight-watch-cron',...result}));
      return sendJson(res,200,result);
    }
    return sendJson(res,404,{ok:false,code:'unknown-action'});
  } catch (error) {
    console.error(JSON.stringify({event:'flight-v3-error',action,message:String(error?.message || error)}));
    return sendJson(res,200,{ok:false,code:'temporarily-unavailable'});
  }
}

module.exports = async function handler(req,res) {
  const action = String(Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action || '');
  if (req.method === 'POST') return handlePost(req,res,action);
  if (req.method === 'GET') return handleGet(req,res,action);
  res.setHeader('Allow','GET, POST');
  return sendJson(res,405,{ok:false,code:'method-not-allowed'});
};

module.exports._test = {
  clean,
  finite,
  b64url,
  fromB64url,
  currentDelayMinutes,
  isDivertedState,
  watchWindow,
  snapshotState,
  transitionAlerts,
  deriveVapidKeys,
  hkdf,
  encryptPushPayload,
  vapidJwt,
  validateSubscription,
  simpleShareState,
  isInternationalLeg,
  transferAllowance,
  connectionAnalysis,
  recordHistoryFromState
};
