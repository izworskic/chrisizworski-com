#!/usr/bin/env node
// Offline observational grouping. A position cluster is NOT a confirmed grounding, dock or bridge event.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const EARTH_RADIUS_M = 6371000;
export function metersBetween(a, b) {
  if (![a?.lat,a?.lon,b?.lat,b?.lon].every(Number.isFinite)) throw new TypeError('Invalid position');
  const r = Math.PI / 180, a1 = a.lat*r, b1 = b.lat*r;
  const dLat = (b.lat-a.lat)*r, dLon = (b.lon-a.lon)*r;
  const h = Math.sin(dLat/2)**2 + Math.cos(a1)*Math.cos(b1)*Math.sin(dLon/2)**2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function findPositionClusters(points, { radiusMeters=30, maxGapMinutes=5, minPoints=15, minMinutes=30 } = {}) {
  if (!Array.isArray(points) || !Number.isFinite(radiusMeters) || radiusMeters <= 0 || !Number.isFinite(maxGapMinutes) || maxGapMinutes <= 0 || minPoints < 2 || minMinutes <= 0) throw new TypeError('Invalid cluster input');
  const sorted = points.map(p => {
    const time = typeof p.seen === 'string' && /Z$/.test(p.seen) ? Date.parse(p.seen) : NaN;
    if (!Number.isFinite(time) || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) throw new TypeError('Invalid observed point');
    return { ...p, t: time };
  }).sort((a,b)=>a.t-b.t);
  const result = [];
  for (let i = 0; i < sorted.length; ) {
    const anchor = sorted[i];
    let end = i + 1, maxDeviationMeters = 0;
    while (end < sorted.length) {
      if (sorted[end].t - sorted[end-1].t > maxGapMinutes*60000) break;
      const dist = metersBetween(anchor, sorted[end]);
      if (dist > radiusMeters) break;
      maxDeviationMeters = Math.max(maxDeviationMeters, dist);
      end++;
    }
    const duration = (sorted[end-1].t - anchor.t) / 60000;
    if (end-i >= minPoints && duration >= minMinutes) {
      result.push({ kind: 'POSITION_CLUSTER_NOT_CONFIRMED_STOP', firstObserved: new Date(anchor.t).toISOString(),
        lastObserved: new Date(sorted[end-1].t).toISOString(), observations: end-i, durationMinutes: Math.round(duration*10)/10,
        anchorObserved: { lat:anchor.lat,lon:anchor.lon }, maxDeviationMeters: Math.round(maxDeviationMeters*10)/10,
        radiusMeters, maxGapMinutes });
      i = end;
    } else i++;
  }
  return result;
}
export function summarizeObservedStudy(data, opts={}) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.tracks)) throw new TypeError('Expected version-one normalized NOAA point study');
  return { kind:'HISTORICAL_POSITION_CLUSTER_AUDIT', source:data.source, sourceUrl:data.sourceUrl, selector:data.selector,
    groups: data.tracks.map(t=>({mmsi:t.mmsi,vesselNames:t.vesselNames,observations:t.points.length,clusters:findPositionClusters(t.points,opts)})),
    caveat:'Position concentration does not establish a grounding, bridge opening, navigational status or ETA. The input was pre-filtered to a coarse research box.' };
}
async function main(args) {
  if (args.length!==4 || args[0]!=='--input' || args[2]!=='--output') throw Error('Usage: node scripts/cuyahoga-observation-clusters.mjs --input study.json --output clusters.json');
  const data=JSON.parse(await readFile(args[1],'utf8'));
  const result=summarizeObservedStudy(data);
  await writeFile(args[3],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({kind:result.kind,groups:result.groups},null,2));
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});}
