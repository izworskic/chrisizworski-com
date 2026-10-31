/**
 * Pukaskwa conditions monitor state machine.
 * Pure, deterministic state transitions: no network, no GitHub writes.
 * A successful fetch is NOT proof that Parks Canada issued fresh observations.
 */
import { createHash } from 'node:crypto';
import { SOURCES } from './trail-registry.mjs';

export const MONITOR_SCHEMA = 1;
export const HISTORY_LIMIT = 40;

function isoTime(value) {
  const ms = Date.parse(value);
  if (typeof value !== 'string' || !Number.isFinite(ms)) throw new Error('Invalid monitor timestamp');
  return new Date(ms).toISOString();
}
function key(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function comparable(row) {
  return {
    name: text(row.name),
    difficulty: text(row.difficulty),
    status: text(row.status),
    rawStatus: text(row.rawStatus),
    issuedOn: text(row.issuedOn),
    comment: text(row.comment),
  };
}
function rows(snapshot) {
  if (!snapshot || snapshot.park !== 'pukaskwa' || !Array.isArray(snapshot.sourceRecords)) {
    throw new Error('Missing Pukaskwa source records');
  }
  const result = new Map();
  for (const row of snapshot.sourceRecords) {
    const id = key(row?.name);
    if (!id || result.has(id)) throw new Error('Invalid or duplicate monitored trail name');
    if (!['closed', 'open', 'unknown'].includes(row.status)) throw new Error('Unrecognized monitored status');
    result.set(id, comparable(row));
  }
  if (!result.has(key('White River Suspension Bridge Trail'))) throw new Error('Missing bridge record in monitored source');
  return result;
}
export function contentFingerprint(snapshot) {
  const normalized = [...rows(snapshot)].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
export function verifyPriorFeed(previous) {
  if (previous == null) return;
  if (previous.schemaVersion !== MONITOR_SCHEMA || previous.park !== 'pukaskwa') {
    throw new Error('Unsupported previous monitor feed version');
  }
  if (previous.snapshot != null) {
    const digest = contentFingerprint(previous.snapshot);
    if (digest !== previous.fingerprint) throw new Error('Previous condition state fingerprint mismatch');
  }
  if (previous.snapshot == null && previous.fingerprint != null) throw new Error('Snapshot fingerprint without records');
  if (!Number.isInteger(previous.consecutiveFailures) || previous.consecutiveFailures < 0) throw new Error('Invalid prior failure count');
}

function closedHold(prior, candidate, checkedAt) {
  if (!prior || prior.status !== 'closed') return false;
  if (!candidate) return true;
  if (candidate.status === 'closed') {
    return !candidate.issuedOn || (Boolean(prior.issuedOn) && candidate.issuedOn < prior.issuedOn);
  }
  // A closure must not disappear unless Parks Canada explicitly reports a
  // STRICTLY LATER "open" observation. Same-day and undated reopening is unsafe.
  const date = checkedAt.slice(0, 10);
  return candidate.status !== 'open' || !candidate.issuedOn ||
    (Boolean(prior.issuedOn) && candidate.issuedOn <= prior.issuedOn) ||
    candidate.issuedOn > date;
}
function makeDiff(oldSnapshot, newSnapshot, checkedAt) {
  if (!oldSnapshot) return [];
  const before = rows(oldSnapshot);
  const after = rows(newSnapshot);
  const changes = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const a = before.get(id);
    const b = after.get(id);
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    const type = !a ? 'added' : !b ? 'removed' :
      a.status !== b.status ? 'status' :
      a.issuedOn !== b.issuedOn ? 'source-date' :
      a.comment !== b.comment ? 'comment' : 'metadata';
    changes.push({
      checkedAt,
      name: b?.name || a?.name || id,
      type,
      before: a ? { status: a.status, issuedOn: a.issuedOn || null } : null,
      after: b ? { status: b.status, issuedOn: b.issuedOn || null } : null,
    });
  }
  return changes.sort((a, b) => a.name.localeCompare(b.name));
}
function base(previous, checkedAt) {
  return {
    schemaVersion: MONITOR_SCHEMA,
    park: 'pukaskwa',
    sourceUrl: SOURCES.conditions,
    checkedAt,
    lastSuccessAt: previous?.lastSuccessAt || null,
    lastChangeAt: previous?.lastChangeAt || null,
    health: 'unverified',
    consecutiveFailures: 0,
    lastError: null,
    fingerprint: previous?.fingerprint || null,
    snapshot: previous?.snapshot || null,
    recentChanges: Array.isArray(previous?.recentChanges) ? previous.recentChanges.slice(-HISTORY_LIMIT) : [],
    closureHolds: [],
  };
}
export function recordSuccess(previous, incoming, checkedAtValue) {
  verifyPriorFeed(previous);
  const checkedAt = isoTime(checkedAtValue);
  if (!incoming || incoming.park !== 'pukaskwa' || incoming.sourceUrl !== SOURCES.conditions) throw new Error('Invalid source identity');
  if (typeof incoming.retrievedAt !== 'string' || !Number.isFinite(Date.parse(incoming.retrievedAt))) throw new Error('Invalid source retrieval time');
  const current = rows(incoming);
  const priorRows = previous?.snapshot ? rows(previous.snapshot) : new Map();
  const effective = new Map(current);
  const holds = [];
  for (const [id, old] of priorRows) {
    if (closedHold(old, current.get(id), checkedAt)) {
      effective.set(id, old);
      holds.push({
        name: old.name,
        sourceIssuedOn: old.issuedOn || null,
        incomingStatus: current.get(id)?.status || 'missing',
        incomingIssuedOn: current.get(id)?.issuedOn || null,
        reason: 'Prior official closure retained until a strictly later dated reopening is confirmed.',
      });
    }
  }
  const snapshot = { ...incoming, sourceRecords: [...effective.values()] };
  const fingerprint = contentFingerprint(snapshot);
  const changes = makeDiff(previous?.snapshot, snapshot, checkedAt);
  const initialized = !previous?.snapshot;
  const result = base(previous, checkedAt);
  result.snapshot = snapshot;
  result.fingerprint = fingerprint;
  result.health = holds.length ? 'review-required' : 'ok';
  result.consecutiveFailures = 0;
  result.lastSuccessAt = checkedAt;
  result.lastChangeAt = initialized || changes.length ? checkedAt : result.lastChangeAt;
  result.recentChanges = [...result.recentChanges, ...changes].slice(-HISTORY_LIMIT);
  result.closureHolds = holds;
  const recovered = Boolean(previous && previous.health === 'source-error');
  return {
    feed: result,
    report: {
      checkedAt, result: 'success', baseline: initialized, recovered, changed: changes.length > 0,
      fingerprint, changes, holds, observations: snapshot.sourceRecords.length,
      sourceRetrievedAt: incoming.retrievedAt,
      lastSuccessAt: checkedAt,
      failureCount: 0,
    },
  };
}
export function recordFailure(previous, error, checkedAtValue) {
  verifyPriorFeed(previous);
  const checkedAt = isoTime(checkedAtValue);
  const message = String(error instanceof Error ? error.message : error).replace(/[\r\n\t]/g, ' ').slice(0, 240);
  const result = base(previous, checkedAt);
  result.health = 'source-error';
  result.consecutiveFailures = (previous?.consecutiveFailures || 0) + 1;
  result.lastError = message || 'Unspecified source-collection failure';
  // The previous source snapshot stays intact with its ORIGINAL retrievedAt.
  // No newly fetched or current access status can be inferred from it.
  result.closureHolds = previous?.closureHolds || [];
  return {
    feed: result,
    report: {
      checkedAt, result: 'source-error', baseline: false, recovered: false, changed: false,
      fingerprint: result.fingerprint, changes: [], holds: result.closureHolds,
      observations: result.snapshot?.sourceRecords?.length ?? 0,
      lastSuccessAt: result.lastSuccessAt, failureCount: result.consecutiveFailures,
      error: result.lastError,
    },
  };
}
