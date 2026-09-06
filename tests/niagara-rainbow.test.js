const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'public/national-tools/niagara-rainbow/index.html'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-rainbow.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-rainbow.css'), 'utf8');
const ENGINE = fs.readFileSync(path.join(ROOT, 'lib/niagara-rainbow-engine.mjs'), 'utf8');
const API = fs.readFileSync(path.join(ROOT, 'api/niagara-rainbow.js'), 'utf8');
const GA4 = fs.readFileSync(path.join(ROOT, 'scripts/inject-ga4.mjs'), 'utf8');

function responseRecorder() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
  };
}

function fakeGrid(skyCover = 5) {
  const start = new Date(Date.now() - 24 * 3600000).toISOString();
  const interval = `${start}/P7D`;
  const node = (value) => ({ values: [{ validTime: interval, value }] });
  return {
    properties: {
      updateTime: new Date().toISOString(),
      skyCover: node(skyCover),
      windSpeed: node(13),
      windDirection: node(240),
      probabilityOfPrecipitation: node(0),
      relativeHumidity: node(62),
      visibility: node(16000),
    },
  };
}

async function runEngine({ skyCover = 5, fail = false } = {}) {
  const previousFetch = global.fetch;
  global.fetch = async (url) => {
    if (fail) return { ok: false, status: 503, json: async () => ({}) };
    if (String(url).includes('/points/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ properties: { forecastGridData: 'https://api.weather.gov/gridpoints/BUF/36,39', forecastOffice: 'https://api.weather.gov/offices/BUF' } }),
      };
    }
    return { ok: true, status: 200, json: async () => fakeGrid(skyCover) };
  };

  try {
    const fileUrl = pathToFileURL(path.join(ROOT, 'lib/niagara-rainbow-engine.mjs')).href;
    const mod = await import(`${fileUrl}?case=${skyCover}-${fail}-${Date.now()}-${Math.random()}`);
    const res = responseRecorder();
    await mod.default({ method: 'GET', query: {} }, res);
    return res;
  } finally {
    global.fetch = previousFetch;
  }
}

test('Niagara page answers the concrete decision and preserves the public canonical', () => {
  assert.match(PAGE, /Will there be a rainbow at Niagara Falls today\?/i);
  assert.match(PAGE, /id="bestWindow"/);
  assert.match(PAGE, /id="bestViewpoint"/);
  assert.match(PAGE, /id="confidence"/);
  assert.match(PAGE, /https:\/\/chrisizworski\.com\/national-tools\/niagara-rainbow\//);
  assert.match(PAGE, /Experimental model estimate/i);
  assert.doesNotMatch(PAGE, /todayScore">\d+/i, 'source HTML must not ship a fake live score');
});

test('SERP, entity, FAQ, hero and analytics contracts are present', () => {
  const title = PAGE.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const description = PAGE.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  assert.ok(title.length <= 60, `title length ${title.length}`);
  assert.ok(description.length <= 158, `description length ${description.length}`);
  assert.match(PAGE, /"@type":"Person","@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(PAGE, /"@type":"WebApplication"/);
  assert.match(PAGE, /"@type":"FAQPage"/);
  assert.match(PAGE, /class="hero-image"/);
  assert.match(PAGE, /Wikimedia Commons/);
  assert.match(GA4, /G-Y5D2V2W7HN/);
});

test('physics model uses NWS grid data, antisolar geometry, 42 degrees and wind-shifted mist', () => {
  assert.match(ENGINE, /api\.weather\.gov\/points/);
  assert.match(ENGINE, /forecastGridData/);
  assert.match(ENGINE, /primaryRainbowAngleDeg:\s*42/);
  assert.match(ENGINE, /antisolarAz/);
  assert.match(ENGINE, /separation\s*-\s*42/);
  assert.match(ENGINE, /downwind/);
  assert.match(ENGINE, /plumeShiftM/);
  assert.match(ENGINE, /t\s*\+=\s*10\s*\*\s*60000/);
  for (const name of ['Terrapin Point', 'Prospect Point', 'Luna Island', 'Table Rock', 'Queen Victoria Park']) assert.match(ENGINE, new RegExp(name));
  for (const name of ['Horseshoe Falls', 'American Falls', 'Bridal Veil Falls']) assert.match(ENGINE, new RegExp(name));
});

test('clear-sky live model returns five days, ranked viewpoints and rounded opportunity scores', async () => {
  const res = await runEngine({ skyCover: 5 });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.days.length, 5);
  assert.equal(res.body.viewpoints.length, 5);
  assert.ok(res.body.days[0].peakAt, 'today must expose a best instant even if no sustained window clears the threshold');
  assert.ok(res.body.days[0].bestViewpoint, 'today must expose a best viewpoint');
  assert.ok(res.body.days.every((day) => day.peak % 5 === 0), 'scores must be rounded to sensible increments');
  assert.equal(res.body.model.primaryRainbowAngleDeg, 42);
  assert.equal(res.body.model.intervalMinutes, 10);
});

test('heavy overcast materially suppresses the opportunity score', async () => {
  const clear = await runEngine({ skyCover: 5 });
  const overcast = await runEngine({ skyCover: 100 });
  assert.ok(clear.body.days[0].peak > overcast.body.days[0].peak, `expected clear ${clear.body.days[0].peak} > overcast ${overcast.body.days[0].peak}`);
  assert.ok(overcast.body.days[0].peak <= 35, `overcast score should be capped, got ${overcast.body.days[0].peak}`);
});

test('upstream failure returns an explicit no-synthetic-fallback state', async () => {
  const res = await runEngine({ fail: true });
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.noSyntheticFallback, true);
  assert.equal(res.body.retryable, true);
});

test('browser UI exposes retry/freshness and renders today, viewpoints and five-day outlook', () => {
  assert.match(UI, /fetch\('\/api\/niagara-rainbow'/);
  assert.match(UI, /No synthetic forecast is being shown/);
  assert.match(UI, /renderToday/);
  assert.match(UI, /renderTimeline/);
  assert.match(UI, /renderViewpoints/);
  assert.match(UI, /renderOutlook/);
  assert.match(UI, /AbortController/);
  assert.match(API, /import\('\.\.\/lib\/niagara-rainbow-engine\.mjs'\)/);
});

test('nighttime is a hard zero and sunrise/sunset boundaries are calculated client-side', () => {
  assert.match(UI, /SUNRISE_SUNSET_ALTITUDE\s*=\s*-0\.833/);
  assert.match(UI, /findNextHorizonCrossing/);
  assert.match(UI, /renderNightState/);
  assert.match(UI, /todayScore\.textContent\s*=\s*'0'/);
  assert.match(UI, /sun is below the horizon/i);
  assert.match(PAGE, /hard-stops between sunset and sunrise/i);
  assert.match(PAGE, /Rare moonbows are a different optical phenomenon/i);
});

test('two lazy third-party Niagara camera views are present', () => {
  const iframes = PAGE.match(/<iframe\b/g) || [];
  assert.ok(iframes.length >= 2, `expected at least two camera iframes, got ${iframes.length}`);
  assert.match(PAGE, /youtube-nocookie\.com\/embed\/qx7gry390YA/);
  assert.match(PAGE, /youtube-nocookie\.com\/embed\/cf4YkyGk6Tk/);
  assert.match(PAGE, /loading="lazy"/);
  assert.match(PAGE, /Fallsview Casino \/ EarthCam/);
  assert.match(CSS, /\.camera-grid/);
});

test('mobile and accessibility release guards are in the source', () => {
  assert.match(PAGE, /class="skip-link"/);
  assert.match(PAGE, /aria-live="polite"/);
  assert.match(PAGE, /role="alert"/);
  assert.match(PAGE, /<main>/);
  assert.match(PAGE, /<h1/);
  assert.match(CSS, /@media\(max-width:640px\)/);
  assert.match(CSS, /prefers-reduced-motion:reduce/);
  assert.match(CSS, /:focus-visible/);
});
