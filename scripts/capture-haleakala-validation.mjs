import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = 'data/haleakala-validation';
const SITE = { code: 'ogg', lat: 20.7069, lon: -156.2565, name: 'LCO OGG Haleakala' };
const now = new Date();
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const isoNoMillis = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const hstDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Honolulu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

async function fetchJson(url) {
  const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const text = await r.text();
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 120)}`); }
  return { value, finalUrl: r.url, text };
}

// Determine the local case date and actual sunrise first. This makes the evidence
// window sunrise-relative instead of dependent on GitHub Actions scheduler timing.
const localDate = hstDate(now);
const sunUrl = new URL('https://api.sunrise-sunset.org/json');
sunUrl.searchParams.set('lat', SITE.lat);
sunUrl.searchParams.set('lng', SITE.lon);
sunUrl.searchParams.set('date', localDate);
sunUrl.searchParams.set('formatted', '0');
const sun = await fetchJson(sunUrl);
if (sun.value?.status !== 'OK' || !sun.value?.results?.sunrise) throw new Error('Sunrise API did not return a usable sunrise');
const sunrise = new Date(sun.value.results.sunrise);
const windowStart = new Date(sunrise.getTime() - 30 * 60_000);
const windowEnd = new Date(sunrise.getTime() + 20 * 60_000);

// Never manufacture a case before the truth window has finished. A delayed scheduled
// run is fine because the LCO archive is rolling; an early manual run exits cleanly.
if (now < windowEnd) {
  console.log(`Truth window has not finished: sunrise=${sunrise.toISOString()} end=${windowEnd.toISOString()}`);
  process.exit(0);
}

const dir = path.join(ROOT, localDate);
await fs.mkdir(path.join(dir, 'allsky'), { recursive: true });
await fs.mkdir(path.join(dir, 'weather'), { recursive: true });
await fs.mkdir(path.join(dir, 'state'), { recursive: true });
const stamp = now.toISOString().replaceAll(':', '-');
const manifest = {
  schema_version: 2,
  case_date_hst: localDate,
  captured_at_utc: now.toISOString(),
  site: SITE,
  sunrise: { utc: sunrise.toISOString(), source: sun.finalUrl },
  truth_window: { start_utc: windowStart.toISOString(), end_utc: windowEnd.toISOString(), minutes_before: 30, minutes_after: 20 },
  errors: [],
  sources: {},
  completeness: { allsky_frames: 0, weather_datums: 0, telescope_state: false }
};

// Recover the whole sunrise sequence from LCO's rolling archive in one post-sunrise run.
// This is deliberately more reliable than asking GitHub Actions to start every 5 minutes.
try {
  const archiveUrl = 'https://lco.global/camera/ogg/allsky/archive/';
  const r = await fetch(archiveUrl, { redirect: 'follow', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const candidates = new Map();
  const re = /(?:href|src)=["']([^"']*?(\d{8}-\d{6}\.jpg)(?:\?[^"']*)?)["']/gi;
  for (const m of html.matchAll(re)) {
    const filename = m[2];
    const tm = filename.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.jpg/);
    if (!tm) continue;
    const t = new Date(`${tm[1]}-${tm[2]}-${tm[3]}T${tm[4]}:${tm[5]}:${tm[6]}Z`);
    if (t < windowStart || t > windowEnd) continue;
    const raw = m[1].replaceAll('&amp;', '&');
    const url = new URL(raw, r.url).toString();
    candidates.set(filename, { filename, timestamp_utc: t.toISOString(), url });
  }
  const frames = [];
  for (const item of [...candidates.values()].sort((a, b) => a.timestamp_utc.localeCompare(b.timestamp_utc))) {
    try {
      const fr = await fetch(item.url, { redirect: 'follow', cache: 'no-store' });
      if (!fr.ok) throw new Error(`HTTP ${fr.status}`);
      const bytes = Buffer.from(await fr.arrayBuffer());
      if (bytes.length < 1000) throw new Error(`implausibly small JPEG (${bytes.length} bytes)`);
      const file = `allsky/${item.filename}`;
      await fs.writeFile(path.join(dir, file), bytes);
      frames.push({ timestamp_utc: item.timestamp_utc, file, bytes: bytes.length, sha256: hash(bytes), source_url: item.url, final_url: fr.url });
    } catch (e) { manifest.errors.push({ source: `allsky:${item.filename}`, error: String(e) }); }
  }
  manifest.sources.allsky = { archive_url: r.url, frames };
  manifest.completeness.allsky_frames = frames.length;
  if (frames.length < 6) manifest.errors.push({ source: 'allsky', error: `Only ${frames.length} frames recovered inside sunrise -30/+20 window` });
} catch (e) { manifest.errors.push({ source: 'allsky-archive', error: String(e) }); }

// Exact datum names from LCO's public weather API documentation.
const datums = [
  'Boltwood Sky Minus Ambient Temperature',
  'Weather Humidity Value',
  'Weather Wind Speed Value',
  'Weather Wind Direction Value',
  'Weather Air Temperature Value',
  'Weather Barometric Pressure Value',
  'Weather Sky Brightness Value'
];
for (const datum of datums) {
  const slug = datum.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    const u = new URL('https://weather-api.lco.global/query');
    u.searchParams.set('site', SITE.code);
    u.searchParams.set('datumname', datum);
    u.searchParams.set('start', isoNoMillis(windowStart));
    u.searchParams.set('end', isoNoMillis(windowEnd));
    const result = await fetchJson(u);
    if (!Array.isArray(result.value)) throw new Error('Weather response was not an array');
    const file = `weather/${slug}.json`;
    await fs.writeFile(path.join(dir, file), JSON.stringify(result.value, null, 2) + '\n');
    manifest.sources[slug] = { file, source_url: result.finalUrl, observations: result.value.length, sha256: hash(Buffer.from(JSON.stringify(result.value))) };
    manifest.completeness.weather_datums += 1;
  } catch (e) { manifest.errors.push({ source: datum, error: String(e) }); }
}

// Observatory/telescope state is corroboration only, never visual ground truth.
try {
  const u = new URL('https://observe.lco.global/api/telescope_states/');
  u.searchParams.set('site', SITE.code);
  u.searchParams.set('start', isoNoMillis(windowStart));
  u.searchParams.set('end', isoNoMillis(windowEnd));
  const state = await fetchJson(u);
  const file = 'state/telescope-states.json';
  await fs.writeFile(path.join(dir, file), JSON.stringify(state.value, null, 2) + '\n');
  manifest.sources.telescope_states = { file, source_url: state.finalUrl, sha256: hash(Buffer.from(JSON.stringify(state.value))) };
  manifest.completeness.telescope_state = true;
} catch (e) { manifest.errors.push({ source: 'telescope-states', error: String(e) }); }

manifest.validation_ready = manifest.completeness.allsky_frames >= 6;
await fs.writeFile(path.join(dir, `manifest-${stamp}.json`), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
if (!manifest.validation_ready) process.exitCode = 2;
