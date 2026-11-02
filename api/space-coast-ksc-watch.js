'use strict';

const { ToolState, stateReady } = require('../lib/tool-state');
const { UUID, readTrustedLaunches, selectTrustedMission } =
  require('../lib/space-coast-ksc-snapshot');
const { authorizeKscWatchRequest } = require('../lib/space-coast-ksc-watch-auth');
const { KEY, runKscWatch, missionTimeline, publicWatchHealth } =
  require('../lib/space-coast-ksc-watch');
const { runLaunchDayWatch } = require('../lib/space-coast-launch-day');
const { runLaunchTruthWatch } = require('../lib/rocket-launch-truth');
const { runNationalWatch } = require('../lib/rocket-launch-national');

function createHandler({
  now = Date.now,
  authorized = authorizeKscWatchRequest,
  run = runKscWatch,
  getWatchState = async () => (stateReady() ? new ToolState().get(KEY) : null),
  readSnapshot = readTrustedLaunches,
  runSchedule = runLaunchDayWatch,
  runTruth = runLaunchTruthWatch,
  runNational = runNationalWatch,
  scheduleReady = stateReady,
  truthReady = stateReady,
  nationalReady = stateReady
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
        // One signed process refreshes the national LL2 snapshot, then
        // BOTH the existing Florida event history and all-coasts evidence
        // consume the same result. No repeated schedule pulls.
        const [kscResult,nationalResult]=await Promise.allSettled([
          run(),
          nationalReady()?runNational():Promise.reject(new Error('national-store-unavailable'))
        ]);
        if(kscResult.status==='rejected')throw kscResult.reason;
        const national=nationalResult.status==='fulfilled'?
          nationalResult.value:{ok:false,error:'national-schedule-refresh-failed'};
        const shared=national?.snapshot?.version===2?national.snapshot:null;
        const [scheduleResult,truthResult]=await Promise.allSettled([
          shared&&scheduleReady()?runSchedule({nationalSnapshot:shared}):
            Promise.reject(new Error('no-shared-national-snapshot')),
          shared&&truthReady()?runTruth({nationalSnapshot:shared}):
            Promise.reject(new Error('no-shared-national-snapshot'))
        ]);
        const schedule=scheduleResult.status==='fulfilled'?
          scheduleResult.value:{ok:false,error:'florida-derived-snapshot-failed'};
        const truth=truthResult.status==='fulfilled'?
          truthResult.value:{ok:false,error:'truth-check-failed'};
        // Do not expose the full national cache or internal mission metadata
        // in an authenticated workflow job's terminal output.
        const nationalSummary={
          ok:national?.ok===true,checkedAt:national?.checkedAt||shared?.checkedAt||null,
          skipped:national?.skipped||null,coveredCount:shared?.activeCount??null,
          complete:shared?.complete??false,providerGroups:shared?.health||[],
          source:'shared-national-postgres-v2'
        };
        return res.status(200).json({...kscResult.value,
          nationalMonitor:nationalSummary,scheduleMonitor:schedule,truthMonitor:truth});
      } catch (e) {
        const detail = String(e?.message || e).slice(0, 150);
        console.error('ksc_monitor_run_failed', detail);
        const code = /Private Postgres|tool state is not configured/i.test(detail) ?
          'storage-unavailable' :
          /Private tool state|State command|state failed|deployment identity/i.test(detail) ?
            'storage-command-failed' :
          /calendar|source-size/i.test(detail) ? 'official-calendar-unavailable' :
          'collector-processing-error';
        // Only a successfully verified workflow token can reach this branch;
        // return a short diagnostic to scheduled-run logs without credentials.
        return res.status(503).json({ ok: false, error: 'KSC monitor check failed; history preserved.', code, detail });
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
