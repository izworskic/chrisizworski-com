'use strict';
const { loadFreighterFeed } = require('./freighter-feed');
const { MAX_AGE_MS } = require('./soo-ais');
const CACHE_SECONDS = 30;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

function renderReports(html, data, now = Date.now()) {
  // Leave a full cache lifetime inside the existing 30-minute freshness limit.
  const vessels = data.vessels.filter(v => {
    const age = now - Date.parse(v.seen);
    return Number.isFinite(age) && age >= -60000 && age <= MAX_AGE_MS - CACHE_SECONDS * 1000;
  });
  const checkedAt = new Date(now).toISOString();
  const rows = vessels.map(v => {
    const speed = v.speedKnots === null ? 'Speed unavailable' : v.speedKnots.toFixed(1) + ' kn';
    const destination = v.destination ? ' · AIS destination: ' + escapeHtml(v.destination) : '';
    return '<li><strong>' + escapeHtml(v.name || 'Vessel ' + v.mmsi) + '</strong><span>' + speed + destination +
      ' · reported position ' + v.lat.toFixed(4) + ', ' + v.lon.toFixed(4) + ' · MMSI ' + v.mmsi +
      ' · reported <time datetime="' + v.seen + '">' + v.seen.replace('T',' ').replace(/\.\d+Z$/, ' UTC') + '</time> · ' + escapeHtml(v.source) + '</span></li>';
  }).join('') || '<li>No recent reports returned. This does not mean there are no ships; check the passage sources below.</li>';
  const stamp = vessels.length + ' recent AIS reports · feed checked ' + checkedAt.replace('T',' ').replace(/\.\d+Z$/, ' UTC');
  html = html.replace('<ul id="freighterVessels"><li>Waiting for vessel reports…</li></ul>',
    () => '<p id="freighterInitialCheck">' + stamp + '. Positions and destinations are reported by AIS, not confirmed arrivals.</p>' +
    '<ul id="freighterVessels">' + rows + '</ul>' +
    '<script type="application/json" id="freighter-initial-reports">' + safeJson({...data, vessels, checkedAt}) + '</script>');
  html = html.replace('<p id="freighterCredits"></p>', () => '<p id="freighterCredits">Source credits: ' + data.attribution.map(a => escapeHtml(a.credit)).join(' · ') + '</p>');
  return html;
}

function createPageHandler(readHtml, loadFeed = loadFreighterFeed) {
  return async function handler(req, res) {
    // Public route stays indexable; /api/ and preview hosts retain platform noindex.
    if (!['GET','HEAD'].includes(req.method || 'GET')) {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).send('GET or HEAD only');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    let html = readHtml();
    try {
      // The HTML must still arrive if AIS is slow. Browser refresh has its usual budget.
      const data = await loadFeed(2000);
      html = renderReports(html, data);
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=' + CACHE_SECONDS + ', must-revalidate');
    } catch {
      html = html.replace('Waiting for vessel reports…', 'Vessel reports could not be included in this page load. Use Refresh or the passage sources below. This is not a zero-traffic report.');
    }
    return res.status(200).send(req.method === 'HEAD' ? '' : html);
  };
}
module.exports = { createPageHandler, renderReports };
