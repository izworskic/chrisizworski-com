'use strict';

const DHC_BASE = 'https://www.duluthharborcam.com';

const FEEDS = Object.freeze({
  canal: { name: 'Canal Cam', pageUrl: `${DHC_BASE}/p/canal-park-cams.html`, wrapperUrl: 'https://camstreamer.com/embed/tyxooOqos1LX6pvVwLo7YYCFjebUYSfKRGovD3VP' },
  bridge: { name: 'Bridge Cam', pageUrl: `${DHC_BASE}/p/bridge-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/rc9ESJv9JfnHHXGhtan3R70A85RrOZUIjiA0Y6Vg' },
  lighthouse: { name: 'Lighthouse Cam', pageUrl: `${DHC_BASE}/p/lighthouse-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/lDZY136tEMlHXuVDNpBjt5klRIZfjIXE9I7e7tXX' },
  'south-pier': { name: 'South Pier Lighthouse Cam', pageUrl: `${DHC_BASE}/p/south-pier-lighthouse-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/KW6M74xHL0yw1bxWTiKLVyXAWVnG8wyLEMDgkNMQ' },
  gla: { name: 'GLA / Harbor Plaza Cam', pageUrl: `${DHC_BASE}/p/great-lakes-aquarium.html`, wrapperUrl: 'https://camstreamer.com/embed/vnpbuwO8ijoqqGF7cQpP3YLiwihrwlgbbK17GHlN' },
  'pier-b': { name: 'Pier B Cam', pageUrl: `${DHC_BASE}/p/pier-b-cam.html` },
  bayfront: { name: 'Bayfront Cam', pageUrl: `${DHC_BASE}/p/dualc.html`, wrapperUrl: 'https://camstreamer.com/embed/u3a9TNe05qcM4qK6Yza0Om5JczJmeBqEiHhyY8OS' },
  hillside: { name: 'Hillside Cam', pageUrl: `${DHC_BASE}/p/hillside-can.html`, wrapperUrl: 'https://camstreamer.com/embed/iJ04DdtUqAILdENBaiQbAng9zac4j1igTvhHwJQQ' },
  harbor: { name: 'Harbor Cam', pageUrl: `${DHC_BASE}/p/harbor-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/i2mkqi3dioZzrrKwRBE62MsKV6R924qftGGZydZT' },
  'cargo-connect': { name: 'Duluth Cargo Connect', pageUrl: `${DHC_BASE}/p/duluth-cargo-connect.html`, wrapperUrl: 'https://camstreamer.com/embed/P0qy7qnSMY2D3qEXx1pl8rKehclQNacGoDvHdZGH' },
  'western-harbor': { name: 'Western Harborcam', pageUrl: `${DHC_BASE}/p/western-harborcam.html`, wrapperUrl: 'https://camstreamer.com/embed/dobXHszVj7SO8PKux3qBl7zj0VO3lr0NZRE5nM2j' },
  ami: { name: 'AMI / Connors Point Cam', pageUrl: `${DHC_BASE}/p/ami-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/LiW55Uwdn7MJFRoV9WwDmw5OhfZTei9pfu4na2zT' },
  fairlawn: { name: 'Fairlawn Cam', pageUrl: `${DHC_BASE}/p/fairlawn-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/Rlh3iXgr1r7pnC7J72mj6fijscbUCfBSKhCX3XTu' },
  'two-harbors-boat': { name: 'Two Harbors Boat Launch', pageUrl: `${DHC_BASE}/p/two-harbors-boat.html`, wrapperUrl: 'https://camstreamer.com/embed/fPBkxzxaLYIDM1b2zrEm4JgTzHeTS3sQ9puI6tfk' },
  'wisconsin-point': { name: 'Wisconsin Point Cam', pageUrl: `${DHC_BASE}/p/wisconsin-point-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/UOgeYRAKSV5tYyRvLJgQUsbUaTp3umy798h32PXM' },
  'split-rock': { name: 'Split Rock Lighthouse Cam', pageUrl: `${DHC_BASE}/p/split-rock-lighthouse-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/Gc7nmBAXKQSlZlj1OIjLZwc92fzgek0zSoQdbCmK' },
  'two-harbors-depot': { name: 'Two Harbors Depot Cam', pageUrl: `${DHC_BASE}/p/two-harbors-depot-cam.html` },
  'silver-bay': { name: 'Silver Bay Marina Cam', pageUrl: `${DHC_BASE}/p/silver-bay-marina-cam.html`, wrapperUrl: 'https://camstreamer.com/embed/06b000052e8f80f/S-24949' }
});

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function safeWrapperUrl(value) {
  try {
    const url = new URL(decodeHtml(value), DHC_BASE);
    const host = url.hostname.toLowerCase();
    if (host !== 'camstreamer.com' || !url.pathname.startsWith('/embed/')) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

function directYouTubeEmbed(value) {
  try {
    const url = new URL(decodeHtml(value));
    const host = url.hostname.toLowerCase();
    if (!['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(host)) return null;
    if (!url.pathname.startsWith('/embed/')) return null;
    url.hostname = 'www.youtube-nocookie.com';
    url.protocol = 'https:';
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    url.searchParams.set('rel', '0');
    return url.toString();
  } catch (_) {
    return null;
  }
}

function extractWrapperUrl(html) {
  const source = String(html || '');
  const iframe = /<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  let match;
  while ((match = iframe.exec(source))) {
    const candidate = safeWrapperUrl(match[2]);
    if (candidate) return candidate;
  }
  return null;
}

async function resolveDirectEmbed(wrapperUrl, fetchImpl = fetch) {
  const safe = safeWrapperUrl(wrapperUrl);
  if (!safe) throw new Error('unapproved camera wrapper');
  const response = await fetchImpl(safe, {
    redirect: 'follow',
    headers: {
      Accept: 'text/html,*/*',
      'User-Agent': 'DuluthCanalParkCameraResolver/2.0 (+https://chrisizworski.com/duluth-canal-park/)'
    },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`camera wrapper HTTP ${response.status}`);
  const direct = directYouTubeEmbed(response.url);
  if (!direct) throw new Error('camera wrapper did not resolve to an approved YouTube embed');
  return direct;
}

async function wrapperForFeed(feed) {
  if (feed.wrapperUrl) return feed.wrapperUrl;
  const upstream = await fetch(feed.pageUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'DuluthCanalParkCameraResolver/2.0 (+https://chrisizworski.com/duluth-canal-park/)'
    },
    signal: AbortSignal.timeout(7000)
  });
  if (!upstream.ok) throw new Error(`camera source HTTP ${upstream.status}`);
  const wrapper = extractWrapperUrl(await upstream.text());
  if (!wrapper) throw new Error('camera wrapper unavailable');
  return wrapper;
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
    const wrapperUrl = await wrapperForFeed(feed);
    const embedUrl = await resolveDirectEmbed(wrapperUrl);
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, id, name: feed.name, embedUrl });
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      ok: false,
      id,
      name: feed.name,
      error: 'The live video could not be started right now.'
    });
  }
};

module.exports.FEEDS = FEEDS;
module.exports.extractWrapperUrl = extractWrapperUrl;
module.exports.safeWrapperUrl = safeWrapperUrl;
module.exports.directYouTubeEmbed = directYouTubeEmbed;
module.exports.resolveDirectEmbed = resolveDirectEmbed;
