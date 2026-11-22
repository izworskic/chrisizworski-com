#!/usr/bin/env node
// OFFLINE RESEARCH ONLY. Filter NOAA timestamped broadcast points; never infer bridge crossings or live ETA.
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { RESEARCH_BBOX, auditHistoricalSamples } from './cuyahoga-ais-audit.mjs';

const MAX_ROWS_PER_VESSEL = 25000;
const MAX_LINE_LENGTH = 16384;
const columnKey = s => String(s).trim().replace(/^\uFEFF/, '').toLowerCase().replace(/[_\s-]/g, '');
const clean = s => String(s ?? '').trim().replace(/[\u0000-\u001f<>]/g, ' ').slice(0, 100);
export function parseCsvLine(line) {
  if (typeof line !== 'string' || line.length > MAX_LINE_LENGTH) throw Error('Invalid CSV record length');
  const cols = []; let current = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i+1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { cols.push(current); current = ''; }
    else current += c;
  }
  if (quoted) throw Error('Unterminated CSV quoted field');
  cols.push(current);
  return cols;
}
export function columnPositions(headerLine) {
  const names = parseCsvLine(headerLine).map(columnKey);
  const need = ['mmsi', 'basedatetime', 'longitude', 'latitude', 'vesselname', 'imo'];
  const aliases = { longitude: ['longitude', 'lon'], latitude: ['latitude', 'lat'] };
  const positions = {};
  for (const key of need) {
    const idx = names.findIndex(n => (aliases[key] || [key]).includes(n));
    if (idx < 0) throw Error('NOAA AIS CSV required column missing: ' + key);
    positions[key] = idx;
  }
  return positions;
}
export function noaaUtc(value) {
  if (typeof value !== 'string') return null;
  const t = value.trim().replace(' ', 'T').replace(/Z$/i, '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(t)) return null;
  const millis = Date.parse(t + 'Z');
  if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0, 19) !== t.slice(0, 19)) return null;
  return new Date(millis).toISOString();
}
export function createCollector({ name = '', imo = '', mmsi = '', from, to, bbox = RESEARCH_BBOX } = {}) {
  const focusName = clean(name).toUpperCase(), focusImo = String(imo).replace(/^IMO/i, ''), focusMmsi = String(mmsi);
  if (!focusName && !/^\d{7}$/.test(focusImo) && !/^\d{9}$/.test(focusMmsi)) throw Error('Select a vessel by name, seven-digit IMO or nine-digit MMSI');
  if (focusImo && !/^\d{7}$/.test(focusImo)) throw Error('Invalid IMO number');
  if (focusMmsi && !/^\d{9}$/.test(focusMmsi)) throw Error('Invalid MMSI');
  const start = from ? Date.parse(from) : -Infinity, end = to ? Date.parse(to) : Infinity;
  if (!((Number.isFinite(start) || start === -Infinity) && (Number.isFinite(end) || end === Infinity)) || start >= end) throw Error('Invalid UTC time window');
  const groups = new Map();
  const stats = { lines: 0, matchedIdentity: 0, matchedTimeAndBox: 0, invalidTimestamp: 0, invalidPosition: 0, invalidIdentity: 0 };
  const tokens = [focusName, focusImo, focusMmsi].filter(Boolean);
  function accept(line, columns) {
    stats.lines++;
    // Fast pre-filter before parsing nationwide rows. Full validated match still required below.
    if (!tokens.some(t => line.toUpperCase().includes(t))) return;
    const cells = parseCsvLine(line);
    const get = key => cells[columns[key]] ?? '';
    const recordMmsi = get('mmsi').trim();
    const recordName = clean(get('vesselname'));
    const recordImo = get('imo').trim().replace(/^IMO/i, '');
    if (!(focusName && recordName.toUpperCase() === focusName || focusImo && recordImo === focusImo || focusMmsi && recordMmsi === focusMmsi)) return;
    stats.matchedIdentity++;
    if (!/^\d{9}$/.test(recordMmsi)) { stats.invalidIdentity++; return; }
    const seen = noaaUtc(get('basedatetime'));
    if (!seen) { stats.invalidTimestamp++; return; }
    const stamp = Date.parse(seen);
    if (stamp < start || stamp >= end) return;
    const lonCell = get('longitude').trim(), latCell = get('latitude').trim();
    const lon = lonCell ? Number(lonCell) : NaN, lat = latCell ? Number(latCell) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < bbox[0] || lat > bbox[2] || lon < bbox[1] || lon > bbox[3]) { stats.invalidPosition++; return; }
    stats.matchedTimeAndBox++;
    let group = groups.get(recordMmsi);
    if (!group) { group = { mmsi: recordMmsi, names: new Set(), imos: new Set(), points: [] }; groups.set(recordMmsi, group); }
    if (group.points.length >= MAX_ROWS_PER_VESSEL) throw Error('Too many observations for a single vessel; narrow the date window');
    group.names.add(recordName);
    if (recordImo) group.imos.add(recordImo);
    group.points.push({ lon, lat, seen });
  }
  function result() {
    const tracks = [...groups.values()].sort((a,b) => a.mmsi.localeCompare(b.mmsi)).map(g => ({
      mmsi: g.mmsi, vesselNames: [...g.names].sort(), imos: [...g.imos].sort(), truncated: false,
      points: g.points.sort((a,b) => a.seen.localeCompare(b.seen))
    }));
    const report = auditHistoricalSamples({ schemaVersion: 1, tracks }, bbox);
    return { schemaVersion: 1, source: 'NOAA Office for Coastal Management, USCG NAIS timestamped broadcast points',
      sourceUrl: 'https://coast.noaa.gov/accessais/', observationKind: 'historical', timezone: 'UTC',
      analysisLimits: ['Bounding-box samples are not validated river centerline positions', 'Event is not a representative normal transit', 'No bridge crossing or opening time is inferred'],
      selector: { vesselName: focusName || null, imo: focusImo || null, mmsi: focusMmsi || null, from: from || null, to: to || null },
      bbox, stats, tracks, audit: { assessment: report.assessment, statusCounts: report.statusCounts,
        tracks: report.tracks.map(({mmsi,status,validUniquePoints,maxGapMinutes,gapsOver5m,gapsOver10m,bridgeEtaValidated})=>({mmsi,status,validUniquePoints,maxGapMinutes,gapsOver5m,gapsOver10m,bridgeEtaValidated})) } };
  }
  return { accept, result, stats };
}
export async function scanNoaaRows(lines, collector) {
  let columns = null;
  for await (const line of lines) {
    if (!columns) { if (line.trim()) columns = columnPositions(line); continue; }
    if (!line.trim()) continue;
    collector.accept(line, columns);
  }
  if (!columns) throw Error('NOAA CSV empty or missing header');
}
async function scanInput(path, collector) {
  const compressed = path.endsWith('.zst');
  const child = compressed ? spawn('zstd', ['-dc', '--', path], { stdio: ['ignore','pipe','pipe'] }) : null;
  const close = child ? new Promise(resolve => { child.once('close', code => resolve(code)); child.once('error', () => resolve(-1)); }) : null;
  let errorText = '';
  let processFailure = null;
  if (child) {
    child.on('error', e => { processFailure = e; });
    child.stderr.on('data', c => { errorText += c.toString('utf8').slice(0, 200); });
  }
  const input = child ? child.stdout : createReadStream(path);
  const rl = createInterface({ input, crlfDelay: Infinity });
  try { await scanNoaaRows(rl, collector); }
  finally { rl.close(); }
  if (child) {
    const code = await close;
    if (processFailure || code !== 0) throw Error('zstd could not decompress input: ' + (processFailure?.message || errorText || String(code)));
  }
}
function argsFromCli(args) {
  const opts = { inputs: [] };
  const keys = { '--input': 'inputs', '--out': 'out', '--name': 'name', '--imo': 'imo', '--mmsi': 'mmsi', '--from': 'from', '--to': 'to' };
  for (let i = 0; i < args.length; i += 2) {
    const k = keys[args[i]], v = args[i+1];
    if (!k || !v) throw Error('Usage: --input NOAA.csv[.zst] [--input more.csv] --name SUNNANVIK [--imo 7633375] --from UTC --to UTC --out results.json');
    if (k === 'inputs') opts.inputs.push(v); else { if (opts[k] !== undefined) throw Error('Repeated option: ' + args[i]); opts[k] = v; }
  }
  if (!opts.inputs.length || !opts.out || !opts.from || !opts.to) throw Error('Required: --input, --out, --from, --to');
  return opts;
}
async function main(args) {
  const opts = argsFromCli(args), collector = createCollector(opts);
  for (const input of opts.inputs) await scanInput(input, collector);
  const result = collector.result();
  await writeFile(opts.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify({out:opts.out, stats:result.stats, audit:result.audit}, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
}
