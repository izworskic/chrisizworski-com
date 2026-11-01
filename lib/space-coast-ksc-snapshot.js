'use strict';

// The main launch endpoint is the only writer: this is a trusted, short-lived
// normalization of its LL2 schedule response, not an independently polled feed.
const { ToolState, stateReady } = require('./tool-state');
const KEY = 'space-coast:trusted-launches:v1';
const TTL_SECONDS = 2 * 60 * 60;
const MAX_AGE_MS = 75 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trustedSnapshot(launches, now = Date.now()) {
  const safe = (Array.isArray(launches) ? launches : []).slice(0, 8)
    .filter(l => UUID.test(l?.id || '') && typeof l.name === 'string' &&
      l.name.length <= 200 && Number.isFinite(Date.parse(l.net || '')))
    .map(l => ({
      id: l.id, name: l.name, net: l.net,
      rocket: String(l.rocket || '').slice(0, 140),
      pad: String(l.pad || '').slice(0, 140),
      provider: String(l.provider || '').slice(0, 140),
      netPrecision: l.netPrecision
    }));
  return { version: 1, generatedAt: new Date(now).toISOString(), launches: safe };
}

function selectTrustedMission(snapshot, id, now = Date.now()) {
  if (!UUID.test(id || '') || snapshot?.version !== 1 ||
      !Array.isArray(snapshot.launches) || snapshot.launches.length > 8) return null;
  const generated = Date.parse(snapshot.generatedAt || '');
  const age = now - generated;
  if (!Number.isFinite(generated) || age < -60000 || age > MAX_AGE_MS) return null;
  const l = snapshot.launches.find(x => x?.id === id);
  if (!l || !UUID.test(l.id) || typeof l.name !== 'string' ||
      typeof l.net !== 'string' || typeof l.pad !== 'string') return null;
  const net = Date.parse(l.net);
  if (!Number.isFinite(net) || net < now - 86400000 || net > now + 180 * 86400000) return null;
  return l;
}

async function storeTrustedLaunches(launches, now = Date.now(), state = new ToolState()) {
  if (!stateReady()) return false;
  try {
    await state.set(KEY, trustedSnapshot(launches, now), { ex: TTL_SECONDS });
    return true;
  } catch {
    // A state outage never prevents the ordinary launch schedule from loading.
    return false;
  }
}

async function readTrustedLaunches(state = new ToolState()) {
  if (!stateReady()) return null;
  return state.get(KEY);
}

module.exports = {
  KEY, UUID, MAX_AGE_MS, TTL_SECONDS, trustedSnapshot, selectTrustedMission,
  storeTrustedLaunches, readTrustedLaunches
};
