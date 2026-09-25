'use strict';

const DHC_BASE = 'https://www.duluthharborcam.com';

const FEEDS = Object.freeze({
  canal: { name: 'Canal Cam', pageUrl: `${DHC_BASE}/p/canal-park-cams.html` },
  bridge: { name: 'Bridge Cam', pageUrl: `${DHC_BASE}/p/bridge-cam.html` },
  lighthouse: { name: 'Lighthouse Cam', pageUrl: `${DHC_BASE}/p/lighthouse-cam.html` },
  'south-pier': { name: 'South Pier Lighthouse Cam', pageUrl: `${DHC_BASE}/p/south-pier-lighthouse-cam.html` },
  gla: { name: 'GLA / Harbor Plaza Cam', pageUrl: `${DHC_BASE}/p/great-lakes-aquarium.html` },
  'pier-b': { name: 'Pier B Cam', pageUrl: `${DHC_BASE}/p/pier-b-cam.html` },
  bayfront: { name: 'Bayfront Cam', pageUrl: `${DHC_BASE}/p/dualc.html` },
  hillside: { name: 'Hillside Cam', pageUrl: `${DHC_BASE}/p/hillside-can.html` },
  harbor: { name: 'Harbor Cam', pageUrl: `${DHC_BASE}/p/harbor-cam.html` },
  'cargo-connect': { name: 'Duluth Cargo Connect', pageUrl: `${DHC_BASE}/p/duluth-cargo-connect.html` },
  'western-harbor': { name: 'Western Harborcam', pageUrl: `${DHC_BASE}/p/western-harborcam.html` },
  ami: { name: 'AMI / Connors Point Cam', pageUrl: `${DHC_BASE}/p/ami-cam.html` },
  fairlawn: { name: 'Fairlawn Cam', pageUrl: `${DHC_BASE}/p/fairlawn-cam.html` },
  'two-harbors-boat': { name: 'Two Harbors Boat Launch', pageUrl: `${DHC_BASE}/p/two-harbors-boat.html` },
  'wisconsin-point': { name: 'Wisconsin Point Cam', pageUrl: `${DHC_BASE}/p/wisconsin-point-cam.html` },
  'split-rock': { name: 'Split Rock Lighthouse Cam', pageUrl: `${DHC_BASE}/p/split-rock-lighthouse-cam.html` },
  'two-harbors-depot': { name: 'Two Harbors Depot Cam', pageUrl: `${DHC_BASE}/p/two-harbors-depot-cam.html` },
  'silver-bay': { name: 'Silver Bay Marina Cam', pageUrl: `${DHC_BASE}/p/silver-bay-marina-cam.html` }
});

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function safeEmbedUrl(value) {
  try {
    const url = new URL(decodeHtml(value), DHC_BASE);
    const host = url.hostname.toLowerCase();
    const camstreamer = host === 'camstreamer.com' && url.pathname.startsWith('/embed/');
    const youtube = (host === 'www.youtube.com' || host === 'youtube.com' || host === 'www.youtube-nocookie.com') && url.pathname.startsWith('/embed/');
    if (!camstreamer && !youtube) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

function extractEmbedUrl(html) {
  const source = String(html || '');
  const iframe = /<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  let match;
  while ((match = iframe.exec(source))) {
    const candidate = safeEmbedUrl(match[2]);
    if (candidate) return candidate;
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = String(req.query?.feed || '').trim();
  const feed = FEEDS[id];
  if (!feed) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ ok: false, error: 'Unknown camera feed' });
  }

  try {
    const upstream = await fetch(feed.pageUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'DuluthCanalParkCameraResolver/1.0 (+https://chrisizworski.com/duluth-canal-park/)'
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!upstream.ok) throw new Error(`camera source HTTP ${upstream.status}`);
    const embedUrl = extractEmbedUrl(await upstream.text());
    if (!embedUrl) throw new Error('camera embed unavailable');

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      id,
      name: feed.name,
      pageUrl: feed.pageUrl,
      embedUrl
    });
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      ok: false,
      id,
      name: feed.name,
      pageUrl: feed.pageUrl,
      error: 'The live player could not be resolved right now.'
    });
  }
};

module.exports.FEEDS = FEEDS;
module.exports.extractEmbedUrl = extractEmbedUrl;
module.exports.safeEmbedUrl = safeEmbedUrl;
