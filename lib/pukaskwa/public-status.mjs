/**
 * Safe visitor-facing projection of the private-in-code / public-in-GitHub
 * Pukaskwa conditions feed. Never equate a monitor heartbeat with a fresh
 * official observation. No user coordinates, permits or access guarantees.
 */
import { DAY_HIKES, BACKCOUNTRY_ROUTES, SOURCES } from './trail-registry.mjs';
import { evaluatePukaskwaTrail } from './conditions.mjs';
import { verifyPriorFeed } from './condition-monitor.mjs';

export const MONITOR_TTL_MS = 18 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export function torontoDate(time = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(time));
  const get = name => parts.find(item => item.type === name)?.value;
  return [get('year'), get('month'), get('day')].join('-');
}

const summary = (trail, evaluation) => ({
  id: trail.id,
  name: trail.name,
  distanceKm: trail.distanceKm ?? null,
  hikingMinutes: trail.durationMinutes ?? null,
  difficulty: trail.difficulty || 'difficult',
  status: evaluation.status,
  statusReason: evaluation.reason,
  observations: evaluation.evidence.map(item => ({
    name: item.name, status: item.status, issuedOn: item.issuedOn,
  })),
});

export function projectPukaskwaFeed(feed, now = Date.now()) {
  verifyPriorFeed(feed);
  if (!feed || !feed.snapshot || !Number.isFinite(now)) throw new Error('Missing or invalid Pukaskwa source feed');
  const checked = Date.parse(feed.lastSuccessAt);
  const retrieval = Date.parse(feed.snapshot.retrievedAt);
  const attempted = Date.parse(feed.checkedAt);
  if (![checked, retrieval, attempted].every(Number.isFinite)) throw new Error('Invalid source timestamps');
  if (checked > now + FUTURE_SKEW_MS || retrieval > now + FUTURE_SKEW_MS || attempted > now + FUTURE_SKEW_MS) {
    throw new Error('Future-dated monitoring evidence');
  }
  const monitorRecent = (now - checked) >= -FUTURE_SKEW_MS && (now - checked) <= MONITOR_TTL_MS;
  const monitoringHealth = ['ok', 'source-error', 'review-required'].includes(feed.health) ? feed.health : 'source-error';
  const safeOpen = monitorRecent && monitoringHealth === 'ok';
  const visitDate = torontoDate(now);

  function view(trail) {
    const evaluated = evaluatePukaskwaTrail(feed.snapshot, trail.id, { visitDate, maxOpenAgeDays: 7 });
    // The last explicit closure persists. Everything else requires a working,
    // recent monitoring service before a positive "recently reported" label.
    if (!safeOpen && !['closed', 'out-of-season'].includes(evaluated.status)) {
      return summary(trail, {
        ...evaluated, status: 'source-unverified',
        reason: monitoringHealth === 'source-error'
          ? 'Monitor reported a collection failure; last observations may be old.'
          : monitoringHealth === 'review-required'
            ? 'Park source requires manual review before an access recommendation.'
            : 'Official-source monitor is overdue. Please check Parks Canada directly.',
      });
    }
    return summary(trail, evaluated);
  }

  const dayHikes = DAY_HIKES.map(view);
  const backcountry = BACKCOUNTRY_ROUTES.map(view);
  return {
    ok: safeOpen,
    park: 'pukaskwa',
    evaluatedFor: visitDate,
    monitor: { health: monitoringHealth, recent: monitorRecent, checkedAt: feed.checkedAt, lastSuccessAt: feed.lastSuccessAt, lastChangeAt: feed.lastChangeAt || null },
    source: { name: 'Parks Canada', url: SOURCES.conditions, lastRetrievedAt: feed.snapshot.retrievedAt, collectionMethod: 'public-html-table-not-official-api' },
    dayHikes,
    backcountry,
    note: 'Statuses are dated official reports, not live trail inspections. Check on-site notices and Parks Canada before visiting. Hiking times exclude travel from Highway 17.',
  };
}

export function unavailablePukaskwa(reason = 'Conditions feed unavailable') {
  return {
    ok: false, park: 'pukaskwa', evaluatedFor: torontoDate(),
    monitor: { health:'unavailable', recent:false, checkedAt:null, lastSuccessAt:null, lastChangeAt:null },
    source: { name:'Parks Canada', url:SOURCES.conditions, lastRetrievedAt:null, collectionMethod:'public-html-table-not-official-api' },
    dayHikes: DAY_HIKES.map(t => ({
      id:t.id,name:t.name,distanceKm:t.distanceKm,hikingMinutes:t.durationMinutes,difficulty:t.difficulty,
      status:'source-unverified',statusReason:reason,observations:[],
    })),
    backcountry: BACKCOUNTRY_ROUTES.map(t => ({ id:t.id,name:t.name,status:'source-unverified',statusReason:reason,observations:[] })),
    note:'Live-source check is unavailable. No trail is certified open; verify directly with Parks Canada.',
  };
}
