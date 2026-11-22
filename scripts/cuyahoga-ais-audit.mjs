#!/usr/bin/env node
// Local research only. No network calls, paid services, vessel predictions or public API.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Coarse research envelope, NOT a channel geometry, bridge location or safe route.
export const RESEARCH_BBOX = Object.freeze([41.44, -81.75, 41.54, -81.65]);
const MAX_TRACK_POINTS = 100000;
const isCoord = (lon, lat, box) => Number.isFinite(lon) && Number.isFinite(lat) && lon >= box[1] && lon <= box[3] && lat >= box[0] && lat <= box[2];
const validSeen = value => typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const rounded = n => Math.round(n * 10) / 10;
const ordered = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

export function auditSnapshot(raw, now = Date.now(), bbox = RESEARCH_BBOX) {
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new TypeError('Expected GeoJSON FeatureCollection');
  const counts = { received: raw.features.length, inResearchBox: 0, validIdentity: 0, fresh5m: 0, fresh10m: 0, fresh30m: 0, missingOrInvalidTime: 0, futureTime: 0 };
  const mmsis = new Set();
  const sources = {};
  for (const feature of raw.features) {
    if (feature?.geometry?.type !== 'Point') continue;
    const [lon, lat] = feature.geometry.coordinates || [];
    if (!isCoord(lon, lat, bbox)) continue;
    counts.inResearchBox++;
    const p = feature.properties || {};
    const mmsi = String(p.mmsi ?? feature.id ?? '');
    if (/^\d{9}$/.test(mmsi)) { mmsis.add(mmsi); counts.validIdentity++; }
    const stamp = validSeen(p.seen);
    if (stamp === null) { counts.missingOrInvalidTime++; continue; }
    const age = now - stamp;
    if (age < -60000) { counts.futureTime++; continue; }
    if (age >= 0 && age <= 5 * 60000) counts.fresh5m++;
    if (age >= 0 && age <= 10 * 60000) counts.fresh10m++;
    if (age >= 0 && age <= 30 * 60000) counts.fresh30m++;
    const source = String(p.source || 'unknown').slice(0, 80);
    sources[source] = (sources[source] || 0) + 1;
  }
  return {
    assessment: 'SNAPSHOT_ONLY_NOT_COVERAGE_PROOF',
    checkedAt: new Date(now).toISOString(), bbox,
    counts: { ...counts, distinctMmsi: mmsis.size }, sourceReportCounts: ordered(sources),
    note: 'No vessels in a snapshot does not mean no traffic or AIS reception. Counts do not prove bridge-level tracking coverage.'
  };
}

function summarizeTrack(track, bbox) {
  if (!/^\d{9}$/.test(String(track?.mmsi ?? '')) || !Array.isArray(track.points)) return { status: 'INVALID_TRACK', reason: 'Expected nine-digit MMSI and points[]' };
  if (track.points.length > MAX_TRACK_POINTS) return { mmsi: String(track.mmsi), status: 'INVALID_TRACK', reason: 'Too many points' };
  let excluded = 0;
  const points = [];
  for (const point of track.points) {
    const lon = point?.lon, lat = point?.lat, seen = validSeen(point?.seen);
    if (!isCoord(lon, lat, bbox) || seen === null) { excluded++; continue; }
    points.push({ seen, lon, lat });
  }
  points.sort((a, b) => a.seen - b.seen);
  const unique = [];
  for (const p of points) {
    const prior = unique[unique.length - 1];
    if (prior && prior.seen === p.seen) { excluded++; continue; }
    unique.push(p);
  }
  const gaps = [];
  for (let i = 1; i < unique.length; i++) gaps.push((unique[i].seen - unique[i - 1].seen) / 60000);
  const maxGapMinutes = gaps.length ? Math.max(...gaps) : null;
  return {
    mmsi: String(track.mmsi), status: unique.length < 2 ? 'INSUFFICIENT_SAMPLES' : track.truncated === true ? 'TRUNCATED_SAMPLE' : maxGapMinutes > 5 ? 'GAPS_OVER_5_MINUTES' : 'PASSAGE_CANDIDATE_ONLY',
    inputPoints: track.points.length, validUniquePoints: unique.length, excludedPoints: excluded, truncated: track.truncated === true,
    firstSeen: unique.length ? new Date(unique[0].seen).toISOString() : null,
    lastSeen: unique.length ? new Date(unique[unique.length - 1].seen).toISOString() : null,
    maxGapMinutes: maxGapMinutes === null ? null : rounded(maxGapMinutes),
    gapsOver5m: gaps.filter(x => x > 5).length, gapsOver10m: gaps.filter(x => x > 10).length,
    bridgeEtaValidated: false
  };
}

export function auditHistoricalSamples(raw, bbox = RESEARCH_BBOX) {
  if (raw?.schemaVersion !== 1 || !Array.isArray(raw.tracks)) throw new TypeError('Expected {schemaVersion:1,tracks:[{mmsi,points:[{lon,lat,seen}],truncated?}]}');
  const tracks = raw.tracks.map(x => summarizeTrack(x, bbox));
  return {
    assessment: 'BRIDGE_ETA_NOT_VALIDATED', bbox, trackCount: tracks.length,
    statusCounts: ordered(tracks.reduce((all, t) => { all[t.status] = (all[t.status] || 0) + 1; return all; }, {})), tracks,
    note: 'Coarse bounding-box samples cannot establish bridge crossings, receiver coverage, channel distance, opening events or calibrated arrival windows.'
  };
}

async function main(args) {
  const output = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], file = args[i + 1];
    if (!file || !['--snapshot', '--tracks'].includes(flag) || output[flag]) throw Error('Usage: node scripts/cuyahoga-ais-audit.mjs [--snapshot snapshot.geojson] [--tracks normalized-tracks.json]');
    const input = JSON.parse(await readFile(file, 'utf8'));
    output[flag] = flag === '--snapshot' ? auditSnapshot(input) : auditHistoricalSamples(input);
  }
  if (Object.keys(output).length === 0) throw Error('Provide at least one local input file. No remote data is downloaded.');
  process.stdout.write(JSON.stringify({ evaluatedAt: new Date().toISOString(), ...output }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
