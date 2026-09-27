const { normalize } = require('../lib/soo-ais');
const next = require('../lib/soo-locks-next');
const { chooseNextShip } = require('../lib/soo-locks-jev');

// One upstream call covers the whole St. Marys River, Whitefish Bay to DeTour.
// `vessels` stays limited to the local box around the locks, exactly as before,
// so the map and list are unchanged; `nextShip` adds what is in a lock chamber
// now and which ships are heading for the locks, from the wider view.
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }); }
  try {
    const headers = { Accept: 'application/geo+json,application/json', 'User-Agent': 'SooLocksLive/1.0 (+https://chrisizworski.com/soo-locks/)' };
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?bbox=' + next.RIVER_BBOX.join(','), { headers, signal: AbortSignal.timeout(9000) });
    if (!upstream.ok) throw new Error('AIS provider unavailable');
    const raw = await upstream.json();
    const now = Date.now();
    const data = normalize(raw, now);
    data.nextShip = await nextShip(raw, now, data.checkedAt);
    res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ ok: false, error: 'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.' });
  }
};

// The next-ship layer is additive: if it fails, the map and list still load.
async function nextShip(raw, now, checkedAt) {
  try {
    const river = next.normalize(raw, now);
    const candidates = next.buildCandidates(river.vessels, now).slice(0, 6);
    const selection = await chooseNextShip(candidates, checkedAt);
    return {
      ok: true,
      inLock: next.inLockList(river.vessels, now),
      candidates,
      pick: selection.pick || null,
      selection: { mode: selection.mode, confidence: selection.confidence, model: selection.mode === 'shared-harness-jev' ? selection.model : undefined, reason: selection.reason || undefined },
      caveats: [
        'Arrival windows are estimates from each ship’s latest reported position, speed and distance along the river channel, not a published lock schedule.',
        'Ships can wait for a chamber, stop at a dock or fuel pier, or be held for traffic, and positions can be up to 30 minutes old.'
      ]
    };
  } catch (_) {
    return { ok: false };
  }
}
