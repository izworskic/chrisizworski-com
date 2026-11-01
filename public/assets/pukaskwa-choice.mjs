/**
 * Visitor choice rules shared by the web UI and Node regression tests.
 * Only chooses a potentially suitable *itinerary*, NEVER certifies access.
 */
export const VIBES = Object.freeze({
  coast: 'granite headlands and lake views',
  beach: 'an unhurried Lake Superior beach',
  forest: 'forest, inland water and interpretation',
  challenge: 'a demanding wilderness hike',
});
const WEIGHTS = Object.freeze({
  'boardwalk-beach':    { coast:2, beach:5, forest:1, challenge:0 },
  'hattie-cove-fire-walk':{ coast:1, beach:0, forest:4, challenge:0 },
  'beach':              { coast:3, beach:5, forest:1, challenge:1 },
  'southern-headland':  { coast:5, beach:3, forest:1, challenge:2 },
  'manito-miikana':     { coast:5, beach:2, forest:2, challenge:2 },
  'bimose-kinoomagewnan':{coast:1, beach:0, forest:5, challenge:2 },
  'combination-hike':   { coast:3, beach:3, forest:4, challenge:4 },
  'white-river-bridge': { coast:3, beach:1, forest:2, challenge:5 },
});
const EFFORT = { easy: 0, moderate: 1, difficult: 2 };
const CLOSED = new Set(['closed', 'out-of-season', 'last-known-closed']);
const NO_GREEN = new Set(['stale', 'unverified', 'source-unverified', 'source-unavailable']);

export function suitableOutings(trails, { minutes = 120, effort = 'moderate', vibe = 'coast' } = {}) {
  if (!Array.isArray(trails) || !Number.isFinite(+minutes) || +minutes <= 0 || !(effort in EFFORT) || !(vibe in VIBES)) {
    throw new Error('Invalid Pukaskwa chooser preferences');
  }
  const eligible = [], blocked = [], beyond = [], harder = [];
  for (const trail of trails) {
    if (!trail?.id || !WEIGHTS[trail.id] || !Number.isFinite(trail.hikingMinutes)) continue;
    const duration = trail.hikingMinutes;
    if (CLOSED.has(trail.status) || (trail.id === 'white-river-bridge' && trail.status !== 'recently-reported-open')) { blocked.push(trail); continue; }
    if (EFFORT[trail.difficulty] > EFFORT[effort]) { harder.push(trail); continue; }
    if (duration > +minutes) { beyond.push(trail); continue; }
    const specificity = WEIGHTS[trail.id][vibe] || 0;
    const completeness = trail.id === 'combination-hike' || trail.id === 'hattie-cove-fire-walk' ? -2 : 0;
    const durationFit = Math.min(2.5, (duration / +minutes) * 2.5);
    const uncertainty = NO_GREEN.has(trail.status) ? -0.1 : 0;
    eligible.push({...trail, score:specificity * 10 + durationFit + completeness + uncertainty});
  }
  eligible.sort((a,b)=>b.score-a.score || a.hikingMinutes-b.hikingMinutes || a.name.localeCompare(b.name));
  return { matches:eligible, blocked, beyond, harder, preference:{minutes:+minutes,effort,vibe} };
}

export function decisionMessage(result) {
  const primary = result.matches[0];
  if (primary) {
    const date = primary.observations?.map(x => x.issuedOn).filter(Boolean).sort().at(-1);
    if (primary.status === 'recently-reported-open') return {
      heading:primary.name,
      lead:'Best match for the time and scenery you chose. Parks Canada recently reported this route open, but conditions can change.',
      foot:date ? 'Official observation: '+date+'. Check signs on arrival.' : 'Check current notices on arrival.',
    };
    return {
      heading:primary.name,
      lead:'Best fit for your interests, not a confirmed-open trail. Verify current access with Parks Canada before setting out.',
      foot:date ? 'Most recent matching official observation: '+date+'.' : 'No dedicated recent official observation is available.',
    };
  }
  if (result.blocked.length && result.preference.vibe === 'challenge') return {
    heading:'The big hike is not available as a confirmed choice',
    lead:'The closure or operating season removes the route from recommendations. Try a shorter shoreline walk once its access is verified.',
    foot:'Do not cross posted closures or plan a bridge crossing without updated Parks Canada confirmation.',
  };
  return {
    heading:'No trail is a reliable fit for those limits',
    lead:'Try allowing more hiking time or changing your effort preference. A trip to the Hattie Cove visitor area also requires extra driving from Highway 17.',
    foot:'No itinerary is a statement of current public access.',
  };
}

export function statusLabel(status) {
  return ({
    closed:'Officially reported closed',
    'out-of-season':'Outside regular backcountry season',
    'recently-reported-open':'Recently reported open',
    stale:'Open report is outdated',
    unverified:'Access not individually verified',
    'source-unverified':'Current access not confirmed',
    'source-unavailable':'Conditions service unavailable',
    'last-known-closed':'Last known closure',
  })[status] || 'Access not confirmed';
}
