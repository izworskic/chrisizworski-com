'use strict';
/* ShoreFeel design value function.
 *
 *   V = sum(w_i * s_i), each s_i in [0,1], measured in a real browser at phone and desktop sizes.
 *   A page passes when V >= 0.85 at every viewport AND every hard gate holds.
 *   A failed gate caps V at 0.5 no matter how good the rest looks.
 *
 *   w  dimension          what it measures
 *   .22 answerSpeed       how high the water temperature sits; 1 if it ends within 30% of the viewport, 0 past 85%
 *   .12 answerComplete    temperature, plain-word band, scale marker, source and time all fully visible without scrolling
 *   .16 forecastReach     the beach forecast starts inside the first screen (0 at 2.5 screens down)
 *   .14 calm              words on the first screen: 1 at 70 or fewer, 0 at 200 or more; extra notice boxes cost
 *   .08 hierarchy         one dominant element: largest type vs median type (5x = full marks), a second giant costs
 *   .10 ergonomics        tap targets >= 44 px, text contrast (4.5, or 3 for large), no sideways scroll
 *   .10 stability         layout shift after data loads, and nothing injected by a third party in the first 1.2 screens
 *   .08 degraded          with no reading and no forecast, the hero stays short and still says why
 *
 * Hard gates: source and observation time visible on the first screen; the not-a-beach-thermometer caveat is in
 * the page (one tap); any forecast shows a range, never a lone number; no sideways scroll at 320 px.
 *
 * Usage:
 *   node scripts/shorefeel-design-benchmark.cjs                       local files, fixture data, ads blocked
 *   node scripts/shorefeel-design-benchmark.cjs --url=https://chrisizworski.com   real site, real ads
 *   add --inject-forecast to overlay the fixture forecast on a live page when NOAA's model server is down
 *   add --json for machine-readable output
 * Needs playwright-core (NODE_PATH) and CHROME_BIN like scripts/shorefeel-mobile-browser.cjs.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');

const argv = process.argv.slice(2);
const flag = n => argv.find(a => a === '--' + n || a.startsWith('--' + n + '='));
const val = n => (flag(n) || '').split('=')[1];
const LIVE = val('url');
const INJECT = !!flag('inject-forecast');
const AS_JSON = !!flag('json');
const THRESHOLD = 0.85;
const root = path.join(__dirname, '..', 'public');
const W = { answerSpeed: .22, answerComplete: .12, forecastReach: .16, calm: .14, hierarchy: .08, ergonomics: .10, stability: .10, degraded: .08 };
const clamp01 = x => Math.max(0, Math.min(1, x));

function pt(h, t, lo, hi, c, s) { return { leadH: h, startsAt: '2026-10-14T12:00:00Z', tempF: t, low: lo, high: hi, changeF: c, shallowF: s }; }
const forecast = place => ({
  status: 'available', cycle: '2026-10-14T06:00:00.000Z',
  method: 'Measured level plus the lake model’s forecast change; the model’s absolute temperature is not used.',
  caveat: 'A forecast with an honest range, not a measurement and not swim safety.',
  validation: { error24hF: 1.3, error48hF: 1.9, caveats: ['Six weeks, open-water buoys, no summer.'] },
  beaches: [{ key: 'a', name: place === 'grand-haven' ? 'Grand Haven State Park beach' : 'Clinch Park beach', levelKind: 'satellite', levelTempF: 60.6, levelObservedAt: '2026-10-14T12:00:00Z',
    points: [pt(0, 61.7, 59, 65, .4, .7), pt(6, 61.4, 58, 64, .2, .6), pt(12, 61.2, 59, 63, .1, .5), pt(24, 60.9, 59, 63, -.1, .4), pt(36, 56.6, 54, 60, -4.3, -.1), pt(48, 59.2, 55, 63, -3.6, 1.8)],
    cooling: { tier: 'watch', deltaF: -1.6, text: 'Cooling watch. The model has the surface cooling about 2°F within a day. In Sept–Oct 2026 tests this signal never missed a drop of 3°F or more, but about two in three watches were smaller.' }, shallowApplied: true }]
});
const lk = t => ({ status: 'recent', latest: { date: '2026-10-13', tempF: t }, trend7: -0.4, history: [{ date: '2026-10-12', tempF: t + .2 }, { date: '2026-10-13', tempF: t }] });
function payload(place, mode) {
  const tc = place === 'traverse-city';
  if (!place) { const o = { product: 'ShoreFeel', lake: 'michigan', source: { mode: 'live' }, lakes: null, local: null, water: null, regionalSatellite: null, normal: mode === 'degraded' ? null : { date: '2026-10-13', tempF: 57.1, deltaF: 5.2 }, weatherNow: null, assessments: null, beachForecast: null }; o.lakes = payload('traverse-city', mode).lakes; return o; }
  const water = mode === 'degraded' ? null : { kind: 'satellite', tempF: 60.6, observedAt: '2026-10-14T12:00:00.000Z', label: tc ? 'West Grand Traverse Bay, 4 km north of Clinch Park' : 'Lake Michigan off Grand Haven State Park', where: tc ? 'Grand Traverse Bay' : 'Lake Michigan off Grand Haven', caveat: 'NOAA satellite surface analysis for a pixel 4.2 km from the beach, not a beach thermometer; sunlit shallows can run warmer.' };
  return {
    product: 'ShoreFeel', lake: 'michigan', source: { mode: 'live' },
    lakes: mode === 'degraded' ? Object.fromEntries(['superior','michigan','huron','erie','ontario'].map(n => [n, { status: 'unavailable', latest: null, history: [] }])) : { superior: lk(54.9), michigan: lk(62.3), huron: lk(59.2), erie: lk(65.7), ontario: lk(61.3) },
    local: { name: place, waterBody: tc ? 'Grand Traverse Bay' : 'Lake Michigan off Grand Haven', stationId: tc ? '45020' : '45029', stationName: 'Test buoy', lat: 44.9, lon: -85.6, caveat: 'A buoy is offshore, not the beach.', measurement: null, measurementStatus: 'offline', periods: [{ startsAt: '2026-10-14T13:00:00-04:00', tempF: 55, windMph: 7, summary: 'Cloudy', daylight: true }] },
    water, regionalSatellite: { status: water ? 'recent' : 'unavailable', cells: water ? [{ key: 'west-bay', short: 'West Bay', label: water.label, measurement: { tempF: 60.6, observedAt: water.observedAt } }] : [] },
    normal: { date: '2026-10-13', tempF: 57.1, deltaF: 5.2 }, weatherNow: { startsAt: '2026-10-14T13:00:00-04:00', tempF: 55, windMph: 7, summary: 'Cloudy', daylight: true },
    assessments: { swim: { title: 'Planning to swim?', beach: 'Cool air.', water: 'Cold water.', after: 'Dry off fast.', decision: 'Comfort guidance is not swim safety.', state: 'contextual', band: 'cold' } },
    beachForecast: mode === 'degraded' ? { status: 'unavailable', reason: 'NOAA lake model cycle not available' } : forecast(place)
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(s));
  });
}

/* Runs inside the page. Returns raw measurements; scoring happens outside. */
function measureInPage() {
  const vh = innerHeight, vw = innerWidth;
  const vis = el => el.checkVisibility ? el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }) : true;
  const abs = el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, h: r.height, w: r.width }; };
  const inFirst = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top < vh && r.bottom > 0; };
  const fully = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1; };
  const out = { vh, vw };
  const answers = [...document.querySelectorAll('[data-answer]')];
  const num = answers.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0] || null;
  out.number = num ? { ...abs(num), font: Math.min(...answers.map(a => parseFloat(getComputedStyle(a).fontSize))), text: num.textContent.trim(), many: answers.length } : null;
  out.kind = document.body.dataset.page;
  const band = document.querySelector('#lead-band'), mk = document.querySelector('#lead-marker'), when = document.querySelector('#lead-temp-when'), lab = document.querySelector('#lead-temp-label');
  const hubWhen = document.querySelector("#hub-when"), whenEl = when || hubWhen;
  const bands = band ? [band] : [...document.querySelectorAll('[data-lake-band]')];
  out.parts = {
    number: answers.length > 0 && answers.every(a => fully(a) && /\d/.test(a.textContent)),
    band: bands.length > 0 && bands.every(b => vis(b) && fully(b) && b.textContent.trim().length > 2),
    marker: mk ? vis(mk) && fully(mk) : true,
    source: !!whenEl && fully(whenEl) && /NOAA|buoy/i.test(whenEl.textContent + ' ' + (lab ? lab.textContent : '')),
    // Beach readings carry a clock time; daily lakewide analyses carry a date.
    time: !!whenEl && fully(whenEl) && (/\b\d{1,2}:\d{2}\s?(AM|PM)/i.test(whenEl.textContent) || (out.kind !== 'place' && /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2}\b/.test(whenEl.textContent)))
  };
  // Hubs have no forecast; their equivalent is a visible way to the beach pages.
  const beachLink = [...document.querySelectorAll('.places a, .hub-beaches a')].find(a => /traverse-city|grand-haven/.test(a.getAttribute('href')) && fully(a));
  out.beachPath = !!beachLink;
  const fc = document.querySelector('#bf-body > *');
  const fsec = document.querySelector('#beach-forecast');
  out.forecast = fc && fsec && !fsec.hidden ? { top: abs(fc).top, text: (document.querySelector('#bf-body').textContent || '').slice(0, 400) } : null;
  // Words on the first screen (visible text only).
  let words = 0; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement; if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName) || !vis(p)) continue;
    const range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect();
    if (r.height > 0 && r.top < vh && r.bottom > 0) words += n.textContent.trim().split(/\s+/).filter(Boolean).length;
  }
  out.words = words;
  out.notices = [...document.querySelectorAll('.truth,.safety,.bf-callout,.update,[role=status]')].filter(e => vis(e) && inFirst(e) && e.textContent.trim().length > 20).length;
  // Type hierarchy on the first screen.
  const sizes = []; const big = []; const others = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || !inFirst(el)) continue;
    const own = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    if (!own) continue; const fs = parseFloat(getComputedStyle(el).fontSize);
    sizes.push(fs); if (fs >= 40) big.push(el.id || el.className || el.tagName);
    if (!el.hasAttribute('data-answer')) others.push(fs);
  }
  sizes.sort((a, b) => a - b);
  out.type = { max: sizes[sizes.length - 1] || 0, median: sizes[Math.floor(sizes.length / 2)] || 16, giants: big.length, maxOther: Math.max(0, ...others) };
  // Tap targets and contrast.
  const taps = [...document.querySelectorAll('a[href],button,summary,input,select')].filter(e => vis(e) && inFirst(e));
  out.taps = { total: taps.length, ok: taps.filter(e => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.width >= 44; }).length,
    small: taps.filter(e => { const r = e.getBoundingClientRect(); return !(r.height >= 44 && r.width >= 44); }).map(e => (e.textContent || e.tagName).trim().slice(0, 28)) };
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none' && !/^url/.test(s.backgroundImage)) return null; const c = parse(s.backgroundColor); if (c && c.a > .9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  let tested = 0, passed = 0; const fails = [];
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w2.nextNode());) {
    const p = n.parentElement; if (!p || !n.textContent.trim() || ['SCRIPT', 'STYLE'].includes(p.tagName) || !vis(p) || !inFirst(p)) continue;
    const s = getComputedStyle(p), fg = parse(s.color), bg = bgOf(p); if (!fg || !bg) continue;
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700, large = size >= 24 || (size >= 18.66 && bold);
    tested++; if (ratio >= (large ? 3 : 4.5)) passed++; else fails.push(n.textContent.trim().slice(0, 24) + ' ' + ratio.toFixed(1));
  }
  out.contrast = { tested, passed, fails: fails.slice(0, 5) };
  out.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
  out.intruders = [...document.querySelectorAll('.google-auto-placed,ins.adsbygoogle,iframe[id^=aswift],[id^=google_ads]')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 20 && r.top + scrollY < vh * 1.2; }).map(e => ({ cls: String(e.className).slice(0, 30), top: Math.round(abs(e).top), h: Math.round(abs(e).h) }));
  const hero = document.querySelector('.hero'); out.heroH = hero ? abs(hero).h : 0;
  out.caveatInDom = /not a beach thermometer|not the beach|not a measurement of the beach/i.test(document.body.textContent);
  out.rangeOk = out.forecast ? /\d{2}\s?[–-]\s?\d{2}/.test(out.forecast.text) : null;
  out.cls = window.__cls || 0;
  return out;
}

function score(m, d) {
  const s = {};
  const n = m.number;
  if (!n) s.answerSpeed = 0; else {
    const base = clamp01(1 - ((n.bottom - .30 * m.vh) / (.55 * m.vh)));
    // One answer must be big (56/72 px); a page whose answer is several numbers (five lakes) needs 28/44 px each.
    const want = n.many > 1 ? (m.vw < 700 ? 28 : 44) : (m.vw < 700 ? 56 : 72); s.answerSpeed = base * (n.font >= want ? 1 : .5);
  }
  s.answerComplete = Object.values(m.parts).filter(Boolean).length / 5;
  s.forecastReach = m.kind !== 'place' ? (m.beachPath ? 1 : 0) : m.forecast ? clamp01(1 - (m.forecast.top - .80 * m.vh) / (1.7 * m.vh)) : 0;
  s.calm = clamp01(1 - (m.words - 70) / 130) * (m.notices <= 1 ? 1 : Math.max(.5, 1 - .15 * (m.notices - 1)));
  // One answer: it dominates (5x the median type). Several answers: they are the largest type on the screen.
  s.hierarchy = m.number && m.number.many > 1 ? (m.number.font >= m.type.maxOther ? 1 : .5)
    : clamp01((m.type.max / (m.type.median || 16)) / 5) * (m.type.giants <= 1 ? 1 : .7);
  const tap = m.taps.total ? m.taps.ok / m.taps.total : 1, con = m.contrast.tested ? m.contrast.passed / m.contrast.tested : 1;
  s.ergonomics = m.overflow > 1 ? 0 : (tap * .5 + con * .5);
  const shift = clamp01(1 - (m.cls - .02) / .23), intr = m.intruders.length ? Math.max(0, 1 - .5 * m.intruders.length) : 1;
  s.stability = shift * intr;
  s.degraded = d ? clamp01((d.heroH <= .55 * d.vh ? 1 : 1 - (d.heroH - .55 * d.vh) / (.45 * d.vh)) * (/No current reading|No reading|No current NOAA/i.test(d.numberText || '') ? 1 : .4)) : 0;
  let v = 0; for (const k of Object.keys(W)) v += W[k] * s[k];
  const gates = { sourceAndTimeVisible: m.parts.source && m.parts.time, caveatInPage: m.caveatInDom, forecastShowsRange: m.rangeOk !== false, noSidewaysScroll: m.overflow <= 1 };
  const gateFail = Object.entries(gates).filter(([, ok]) => !ok).map(([k]) => k);
  return { s, v: gateFail.length ? Math.min(v, .5) : v, raw: v, gates, gateFail };
}

async function run() {
  const server = LIVE ? null : await serve();
  const base = LIVE ? LIVE.replace(/\/$/, '') : 'http://127.0.0.1:' + server.address().port;
  const ch = process.env.CHROME_BIN || ['/opt/pw-browsers/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
  const browser = await chromium.launch({ headless: true, executablePath: ch, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const pages = [['great-lakes', 'Great Lakes'], ['lake-michigan', 'Lake Michigan'], ['traverse-city', 'Traverse City'], ['grand-haven', 'Grand Haven']];
  const urlFor = place => place === 'great-lakes' ? '/great-lakes-water-temperature/' : place === 'lake-michigan' ? '/lake-michigan-water-temperature/' : '/lake-michigan-water-temperature/' + place + '/';
  const apiPlace = place => /great-lakes|lake-michigan/.test(place) ? '' : place;
  const viewports = [['phone', 390, 844], ['desktop', 1280, 800]];
  const results = [];
  for (const [place] of pages) for (const [vname, w, h] of viewports) {
    const open = async mode => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      if (!LIVE) await p.route(/googlesyndication|googletagmanager|doubleclick|openstreetmap|wikimedia/, r => r.abort());
      if (!LIVE || INJECT || mode === 'degraded') await p.route('**/api/shorefeel*', async r => {
        if (LIVE && mode !== 'degraded') { const real = await r.fetch(); const o = await real.json(); if (apiPlace(place)) o.beachForecast = forecast(place); return r.fulfill({ response: real, body: JSON.stringify(o), contentType: 'application/json' }); }
        r.fulfill({ contentType: 'application/json', body: JSON.stringify(payload(apiPlace(place), mode)) });
      });
      await p.goto(base + urlFor(place), { waitUntil: LIVE ? 'networkidle' : 'load' }).catch(() => {});
      await p.waitForFunction(() => { const t = document.querySelector('[data-answer]'); return t && /\d|No /.test(t.textContent) && !/––/.test(t.textContent); }, null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(LIVE ? 4000 : 1500);
      return { p, ctx };
    };
    const main = await open('normal'); const m = await main.p.evaluate(measureInPage); await main.ctx.close();
    const deg = await open('degraded');
    const dm = await deg.p.evaluate(() => ({ vh: innerHeight, heroH: document.querySelector('.hero').getBoundingClientRect().height, numberText: [...document.querySelectorAll('[data-answer],#hub-when')].map(e => e.textContent).join(' ') }));
    await deg.ctx.close();
    // 320 px gate
    const nc = await browser.newContext({ viewport: { width: 320, height: 700 } }); const np = await nc.newPage();
    if (!LIVE) await np.route(/googlesyndication|googletagmanager|doubleclick|openstreetmap|wikimedia/, r => r.abort());
    if (!LIVE) await np.route('**/api/shorefeel*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(payload(apiPlace(place), 'normal')) }));
    await np.goto(base + urlFor(place), { waitUntil: 'load' }).catch(() => {}); await np.waitForTimeout(1200);
    const o320 = await np.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth); await nc.close();
    const r = score(m, dm); if (o320 > 1) { r.gates.noSidewaysScroll = false; if (!r.gateFail.includes('noSidewaysScroll')) r.gateFail.push('noSidewaysScroll'); r.v = Math.min(r.v, .5); }
    results.push({ page: place, viewport: vname, ...r, measured: { numberBottom: m.number && Math.round(m.number.bottom), numberFont: m.number && m.number.font, words: m.words, notices: m.notices, forecastTop: m.forecast && Math.round(m.forecast.top), vh: m.vh, cls: +m.cls.toFixed(3), intruders: m.intruders, tapSmall: m.taps.small, contrastFails: m.contrast.fails, heroH: Math.round(m.heroH), parts: m.parts } });
  }
  await browser.close(); if (server) server.close();
  if (AS_JSON) { console.log(JSON.stringify(results, null, 1)); } else {
    for (const r of results) {
      console.log('\n' + r.page + ' / ' + r.viewport + '   V = ' + r.v.toFixed(3) + (r.raw !== r.v ? ' (raw ' + r.raw.toFixed(3) + ', capped by gate)' : '') + '   ' + (r.v >= THRESHOLD ? 'PASS' : 'below ' + THRESHOLD));
      console.log('  ' + Object.keys(W).map(k => k + ' ' + r.s[k].toFixed(2) + '×' + W[k]).join('  '));
      if (r.gateFail.length) console.log('  GATES FAILED: ' + r.gateFail.join(', '));
      console.log('  ' + JSON.stringify(r.measured));
    }
    const mean = results.reduce((a, r) => a + r.v, 0) / results.length;
    console.log('\nmean V = ' + mean.toFixed(3) + '   min V = ' + Math.min(...results.map(r => r.v)).toFixed(3));
  }
  const ok = results.every(r => r.v >= THRESHOLD && !r.gateFail.length);
  if (!LIVE && !flag('report-only')) process.exitCode = ok ? 0 : 1;
}
run().catch(e => { console.error(e); process.exit(2); });
