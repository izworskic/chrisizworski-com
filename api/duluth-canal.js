'use strict';

const {
  WESTERN_LAKE_BBOX,
  normalize,
  buildCandidates,
  deterministicPick,
  localMapVessels
} = require('../lib/duluth-canal');
const { chooseWatchPick } = require('../lib/duluth-canal-jev');

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const now = Date.now();
  try {
    const headers = {
      Accept: 'application/geo+json,application/json',
      'User-Agent': 'DuluthCanalParkLive/1.0 (+https://chrisizworski.com/duluth-canal-park/)'
    };
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = `Bearer ${process.env.OPEN_WATERS_API_TOKEN}`;

    const upstream = await fetch(`https://ais.openwaters.io/v1/vessels?bbox=${WESTERN_LAKE_BBOX.join(',')}`, {
      headers,
      signal: AbortSignal.timeout(9000)
    });
    if (!upstream.ok) throw new Error(`AIS provider HTTP ${upstream.status}`);

    const normalized = normalize(await upstream.json(), now);
    const candidates = buildCandidates(normalized.vessels, now).slice(0, 8);
    const deterministic = deterministicPick(candidates);
    const selection = await chooseWatchPick(candidates, normalized.checkedAt);
    const watchPick = selection.pick || deterministic || null;

    res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=60');
    return res.status(200).json({
      ok: true,
      checkedAt: normalized.checkedAt,
      maxAgeMinutes: normalized.maxAgeMinutes,
      canal: normalized.canal,
      mapVessels: localMapVessels(normalized.vessels, 28),
      candidates,
      watchPick,
      selection: {
        mode: selection.mode,
        confidence: selection.confidence,
        model: selection.mode === 'shared-harness-jev' ? selection.model : undefined
      },
      attribution: normalized.attribution,
      caveats: [
        'AIS positions are recent reports, not guarantees of future movement.',
        'Anticipated passage windows are motion-based planning estimates, not published bridge schedules.',
        'Vessels may change speed, destination, berth, route or use the Superior Entry instead.'
      ]
    });
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      ok: false,
      error: 'Live vessel reports are temporarily unavailable. Use Harbor Lookout for the current Duluth arrival and departure list.'
    });
  }
};