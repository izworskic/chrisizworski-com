import { BACKCOUNTRY_ROUTES, BACKCOUNTRY_WINDOW, DAY_HIKES, getTrail, SOURCES } from './trail-registry.mjs';

const DAY_MS = 86_400_000;
const EXPECTED_ROW_NAMES = DAY_HIKES.filter(t => t.sourceName).map(t => t.sourceName);
const normalizeName = value => value.toLowerCase().replace(/\s+/g, ' ').trim();

function decodeHtml(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_, key) => {
    if (key.startsWith('#')) {
      const cp = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : ' ';
    }
    return entities[key.toLowerCase()] ?? ' ';
  });
}
function plainText(value) {
  return decodeHtml(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? '')) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function issuedDate(comment) {
  const match = comment.match(/\b(20\d{2}-\d{2}-\d{2}):/);
  return match && validDate(match[1]) ? match[1] : null;
}
function classify(value) {
  const s = value.toLowerCase().replace(/[.!]/g, '').trim();
  if (s === 'closed') return 'closed';
  if (s === 'open') return 'open';
  return 'unknown';
}
function dayDifference(from, to) {
  return Math.floor((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS);
}

/**
 * Parser of the public Parks Canada HTML table, NOT an official API.
 * Fail closed when required markers vanish or markup changes unexpectedly.
 * Returns a compact source record; no coordinates, permits, or open-now claims.
 */
export function parsePukaskwaConditions(html, retrievedAt = new Date().toISOString()) {
  if (typeof html !== 'string' || html.length < 1500 || html.length > 2_000_000) throw new Error('Invalid Parks Canada HTML length');
  if (!/Pukaskwa/i.test(html) || !/White River Suspension Bridge Trail/i.test(html)) throw new Error('Official trail-condition page markers missing');
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error('Invalid retrieval timestamp');
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const records = [];
  const seen = new Set();
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => plainText(m[1]));
    if (cells.length !== 5) continue;
    const [difficulty, name, rawStatus, comment] = cells;
    if (!name || !rawStatus || !comment) continue;
    const normalized = normalizeName(name);
    if (seen.has(normalized)) throw new Error('Duplicate condition record: ' + name);
    seen.add(normalized);
    records.push({ name, difficulty, status: classify(rawStatus), rawStatus, issuedOn: issuedDate(comment), comment });
  }
  const names = new Set(records.map(r => normalizeName(r.name)));
  const missing = EXPECTED_ROW_NAMES.filter(n => !names.has(normalizeName(n)));
  if (missing.length) throw new Error('Required official condition records missing: ' + missing.join(', '));
  const segments = records.filter(r => /^(Mdaabii Miikna|Coastal Hiking Trail):\s*\d/i.test(r.name));
  if (segments.filter(r => /^Mdaabii Miikna:/i.test(r.name)).length < 5 || segments.filter(r => /^Coastal Hiking Trail:/i.test(r.name)).length < 12) {
    throw new Error('Backcountry segment coverage changed unexpectedly');
  }
  return {
    schemaVersion: 1,
    park: 'pukaskwa',
    retrievedAt,
    sourceUrl: SOURCES.conditions,
    collectionMethod: 'public-html-table',
    sourceRecords: records,
    warnings: [
      'Parks Canada HTML is not a documented official trail-status API.',
      'Published source date is not retrieval date or guaranteed present access.',
      'Seasonal backcountry dates conflict between official pages; conservative boundary applied.',
    ],
  };
}

/**
 * Status is advisory evidence, not a safety determination.
 * "Closed" remains closed until an explicit later open observation.
 * "Open" is allowed only with a sufficiently fresh official issue date.
 */
export function evaluatePukaskwaTrail(snapshot, trailId, { visitDate = new Date().toISOString().slice(0, 10), maxOpenAgeDays = 7 } = {}) {
  const trail = getTrail(trailId);
  if (!trail) throw new Error('Unrecognized Pukaskwa trail: ' + trailId);
  if (!validDate(visitDate)) throw new Error('Invalid visitor date');
  if (!Number.isInteger(maxOpenAgeDays) || maxOpenAgeDays < 0) throw new Error('Invalid freshness rule');
  const records = snapshot?.sourceRecords;
  const byName = new Map(Array.isArray(records) ? records.map(r => [normalizeName(r.name || ''), r]) : []);
  const relevant = trail.kind === 'backcountry'
    ? [...byName.values()].filter(r => r.name.startsWith(trail.segmentPrefix) && /^\d/.test(r.name.slice(trail.segmentPrefix.length).trim()))
    : trail.conditions.map(name => byName.get(normalizeName(name))).filter(Boolean);
  const evidence = relevant.map(r => ({ name: r.name, status: r.status, issuedOn: r.issuedOn || null, url: SOURCES.conditions }));
  const base = { trailId, name: trail.name, visitDate, sourceUrl: SOURCES.conditions, retrievedAt: snapshot?.retrievedAt || null, evidence, seasonConflict: trail.kind === 'backcountry' ? BACKCOUNTRY_WINDOW.conflict : false };
  if (relevant.some(r => r.status === 'closed')) return { ...base, status: 'closed', reason: 'Parks Canada last reported a closure; do not recommend this route.' };
  if (trail.kind === 'backcountry' && (visitDate.slice(5) < BACKCOUNTRY_WINDOW.starts || visitDate.slice(5) > BACKCOUNTRY_WINDOW.endsInclusive)) {
    return { ...base, status: 'out-of-season', reason: 'Outside the conservative intersection of official published backcountry dates. Confirm with Parks Canada.' };
  }
  if (!relevant.length || (trail.kind === 'day' && relevant.length !== trail.conditions.length)) {
    return { ...base, status: 'unverified', reason: 'No complete, matching official status rows were confirmed.' };
  }
  if (relevant.some(r => r.status !== 'open' || !validDate(r.issuedOn))) return { ...base, status: 'unverified', reason: 'Parks Canada did not provide a dated, affirmative open condition for every required record.' };
  if (relevant.some(r => { const age = dayDifference(r.issuedOn, visitDate); return age < 0 || age > maxOpenAgeDays; })) {
    return { ...base, status: 'stale', reason: 'Official open observations are outside the freshness window for the requested date.' };
  }
  // Whole routes need independent coverage validation, beyond a handful of listed segments.
  if (trail.kind === 'backcountry') return { ...base, status: 'unverified', reason: 'Segment observations cannot confirm route-wide conditions, availability, permits, or access.' };
  if (trailId === 'combination-hike') return { ...base, status: 'unverified', reason: 'Connecting paths have no separate confirmed condition records.' };
  return { ...base, status: 'recently-reported-open', reason: 'Parks Canada recently reported this trail open; current access is not guaranteed.' };
}

export function summarizePukaskwa(snapshot, opts = {}) {
  return {
    evaluatedAt: opts.visitDate ?? new Date().toISOString().slice(0, 10),
    dayHikes: DAY_HIKES.map(t => evaluatePukaskwaTrail(snapshot, t.id, opts)),
    backcountry: BACKCOUNTRY_ROUTES.map(t => evaluatePukaskwaTrail(snapshot, t.id, opts)),
  };
}
