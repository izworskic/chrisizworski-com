'use strict';

const { UUID, readTrustedLaunches, selectTrustedMission } =
  require('../lib/space-coast-ksc-snapshot');
const { inspectKscLaunch } = require('../lib/space-coast-ksc-viewing');

const CHECK_INTERVAL_SECONDS = 300;
function createHandler({
  readSnapshot = readTrustedLaunches,
  inspect = inspectKscLaunch,
  now = Date.now
} = {}) {
  return async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method && req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    const id = req?.query?.launchId;
    if (typeof id !== 'string' || !UUID.test(id)) {
      return res.status(400).json({ ok: false, error: 'Select a valid mission from the launch list.' });
    }
    try {
      // No LL2, NPS or NWS requests on this endpoint. Only the trusted
      // previously-cached launch record and the official KSC website.
      const snapshot = await readSnapshot();
      const launch = selectTrustedMission(snapshot, id, now());
      if (!launch) return res.status(503).json({
        ok: false, error: 'The launch schedule snapshot is not ready or is too old.',
        code: 'schedule-snapshot-unavailable'
      });
      const report = await inspect(launch);
      const hasFreshCalendar = report?.officialCalendar?.status === 'checked';
      if (hasFreshCalendar) {
        res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=60');
      }
      return res.status(200).json({
        ok: true,
        selectedLaunchId: launch.id,
        checkedAt: report.checkedAt || new Date(now()).toISOString(),
        scheduleSnapshotAt: snapshot.generatedAt,
        refreshIntervalSeconds: CHECK_INTERVAL_SECONDS,
        kscViewing: report
      });
    } catch {
      // No cached "unavailable" that might conceal a new announcement.
      return res.status(503).json({
        ok: false, error: 'The official KSC announcement check is temporarily unavailable.',
        code: 'ksc-unavailable'
      });
    }
  };
}

module.exports = createHandler();
module.exports._test = { createHandler, CHECK_INTERVAL_SECONDS };
