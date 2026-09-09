#!/usr/bin/env node
const ORIGIN = process.env.MELVIN_PRICE_SMOKE_ORIGIN || 'https://chrisizworski.com';
const PAGE = `${ORIGIN}/melvin-price/`;
const API = `${ORIGIN}/api/melvin-price`;

async function fetchText(url, timeoutMs = 30000) {
  const started = Date.now();
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_smoke=${Date.now()}`, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/json',
      'cache-control': 'no-cache',
      'user-agent': 'ChrisIzworskiMelvinPriceProductionSmoke/1.1',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  return { response, text, elapsedMs: Date.now() - started };
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

const page = await fetchText(PAGE, 20000);
console.log(`PAGE HTTP ${page.response.status} ${page.elapsedMs}ms content-type=${page.response.headers.get('content-type')}`);
if (!page.response.ok) throw new Error(`Melvin page HTTP ${page.response.status}: ${page.text.slice(0, 700)}`);
for (const marker of ['Melvin Price Live', '/api/melvin-price', 'melvinVesselMap']) {
  if (!page.text.includes(marker)) throw new Error(`Melvin production page missing ${marker}`);
}

const api = await fetchText(API, 30000);
console.log(`API HTTP ${api.response.status} ${api.elapsedMs}ms content-type=${api.response.headers.get('content-type')}`);
const data = parseJson(api.text);
if (!api.response.ok) throw new Error(`Melvin API HTTP ${api.response.status}: ${api.text.slice(0, 1500)}`);
if (!data) throw new Error(`Melvin API returned non-JSON: ${api.text.slice(0, 1500)}`);

console.log(JSON.stringify({
  generatedAt: data.generatedAt,
  localTime: data.localTime,
  locks: data.locks,
  river: data.river,
  weather: data.weather,
  tours: data.tours,
  notices: data.notices,
  visit: data.visit,
}, null, 2));

if (!data.generatedAt || !data.tours) throw new Error('Melvin API base contract is incomplete');
if (!data.locks?.ok) throw new Error(`LPMS unavailable in production: ${JSON.stringify(data.locks)}`);
const m = data.locks.melvin;
if (!m || String(m.lockNumber) !== '26') throw new Error(`Mel Price lock 26 missing: ${JSON.stringify(data.locks)}`);
if (!Number.isFinite(Number(m.pendingArrivals)) || !Number.isFinite(Number(m.lockedUp24h)) || !Number.isFinite(Number(m.lockedDown24h))) {
  throw new Error(`Mel Price operational counts invalid: ${JSON.stringify(m)}`);
}
if (!data.river?.stage?.ok || !Number.isFinite(Number(data.river.stage.valueFt))) {
  throw new Error(`Mel Price CWMS stage unavailable in production: ${JSON.stringify(data.river?.stage)}`);
}
if (!data.river?.flow?.ok || !Number.isFinite(Number(data.river.flow.valueCfs))) {
  throw new Error(`Mel Price CWMS flow unavailable in production: ${JSON.stringify(data.river?.flow)}`);
}
if (!data.weather?.ok) throw new Error(`NWS unavailable in production: ${JSON.stringify(data.weather)}`);
if (!data.notices?.ok) throw new Error(`NTNI unavailable in production: ${JSON.stringify(data.notices)}`);
if (data.notices.count > 0) {
  for (const item of data.notices.items || []) {
    if (!item.title || !item.url || !/^https:\/\/ndc\.ops\.usace\.army\.mil\//.test(item.url)) {
      throw new Error(`NTNI item lacks usable official title/link: ${JSON.stringify(item)}`);
    }
  }
}

const core = {
  lpms: true,
  stage: true,
  flow: true,
  weather: true,
  notices: true,
};
console.log(JSON.stringify({status:'ok', apiMs:api.elapsedMs, core}, null, 2));
