'use strict';

const { ToolState, stateReady } = require('../lib/tool-state');
const { UUID, readTrustedLaunches, selectTrustedMission } =
  require('../lib/space-coast-ksc-snapshot');
const { authorizeKscWatchRequest } = require('../lib/space-coast-ksc-watch-auth');
const { KEY, runKscWatch, missionTimeline, publicWatchHealth } =
  require('../lib/space-coast-ksc-watch');

function createHandler({
  now = Date.now,
  authorized = authorizeKscWatchRequest,
  run = runKscWatch,
  getWatchState = async () => (stateReady() ? new ToolState().get(KEY) : null),
  readSnapshot = readTrustedLaunches
} = {}) {
  return async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      const allowed = await authorized({
        authorization: req.headers?.authorization || ''
      });
      if (!allowed) return res.status(401).json({ ok: false, error: 'unauthorized' });
      try {
        const result = await run();
        return res.status(200).json(result);
      } catch (e) {
        console.error('ksc_monitor_run_failed', String(e?.message || e).slice(0, 120));
        return res.status(503).json({ ok: false, error: 'KSC monitor check failed; history preserved.' });
      }
    }
    if (req.method && req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, error: 'method-not-allowed' });
    }
    const id = req.query?.launchId;
    if (id != null && (typeof id !== 'string' || !UUID.test(id)))
      return res.status(400).json({ ok: false, error: 'invalid-mission-id' });
    try {
      const state = await getWatchState();
      const health = publicWatchHealth(state, now());
      if (!id) {
        res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=60');
        return res.status(200).json({ ok: true, health });
      }
      const snap = await readSnapshot();
      const mission = selectTrustedMission(snap, id, now());
      if (!mission) return res.status(503).json({
        ok: false, health, error: 'The selected launch snapshot has not been refreshed yet.',
        code: 'schedule-snapshot-unavailable'
      });
      const timeline = missionTimeline(mission, state, now());
      res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=60');
      return res.status(200).json({
        ok: true, selectedLaunchId: id, health,
        timeline: timeline || { events: [], missionLinked: false },
        description: 'Detected times are first observations by this website, not KSC publication timestamps.'
      });
    } catch {
      return res.status(503).json({ ok: false, error: 'Official mission history temporarily unavailable.' });
    }
  };
}
module.exports = createHandler();
module.exports._test = { createHandler };
