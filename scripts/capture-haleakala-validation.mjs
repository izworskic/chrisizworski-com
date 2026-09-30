import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = 'data/haleakala-validation';
const now = new Date();
const stamp = now.toISOString().replaceAll(':', '-');
const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Honolulu' }).format(now);
const dir = path.join(root, localDate);
await fs.mkdir(path.join(dir, 'allsky'), { recursive: true });
await fs.mkdir(path.join(dir, 'weather'), { recursive: true });

const manifest = { captured_at_utc: now.toISOString(), site: 'LCO OGG Haleakala', errors: [], sources: {} };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

try {
  const r = await fetch('https://lco.global/camera/ogg/allsky/lastsnap.jpg', { redirect: 'follow', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  const file = `allsky/${stamp}.jpg`;
  await fs.writeFile(path.join(dir, file), bytes);
  manifest.sources.allsky = { source: 'LCO OGG allsky lastsnap', final_url: r.url, file, bytes: bytes.length, sha256: hash(bytes) };
} catch (e) { manifest.errors.push({ source: 'allsky', error: String(e) }); }

const datums = ['Boltwood Sky Minus Ambient Temperature','Weather Humidity Value','Weather Wind Speed Value','Weather Wind Direction Value','Weather Temperature Value','Weather Pressure Value'];
for (const datum of datums) {
  try {
    const u = new URL('https://weather-api.lco.global/query/');
    u.searchParams.set('site', 'ogg');
    u.searchParams.set('datumname', datum);
    u.searchParams.set('start', new Date(now - 20 * 60000).toISOString());
    u.searchParams.set('end', now.toISOString());
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const slug = datum.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = `weather/${stamp}-${slug}.json`;
    await fs.writeFile(path.join(dir, file), text + '\n');
    manifest.sources[slug] = { file, sha256: hash(Buffer.from(text)) };
  } catch (e) { manifest.errors.push({ source: datum, error: String(e) }); }
}

await fs.writeFile(path.join(dir, `manifest-${stamp}.json`), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
