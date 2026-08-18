#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scorePath = path.join(root, 'benchmarks', 'winter-engine-scorecard.json');
const doc = JSON.parse(readFileSync(scorePath, 'utf8'));
const weights = Object.fromEntries(doc.scoring.dimensions.map((d) => [d.key, d.weight]));
const maxScore = doc.scoring.maxScore;

function evaluate(label, entry, target) {
  const scores = entry.scores || {};
  const unknown = Object.keys(scores).filter((key) => !(key in weights));
  if (unknown.length) throw new Error(`${label}: unknown score keys: ${unknown.join(', ')}`);
  for (const [key, weight] of Object.entries(weights)) {
    const value = scores[key];
    if (!Number.isFinite(value)) throw new Error(`${label}: missing numeric score ${key}`);
    if (value < 0 || value > weight) throw new Error(`${label}: ${key}=${value} exceeds 0..${weight}`);
  }
  const raw = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const penalties = Number(entry.penalties || 0);
  const effective = Math.max(0, raw - penalties);
  const loss = maxScore - effective;
  if (entry.rawScore !== raw) throw new Error(`${label}: rawScore ${entry.rawScore} != computed ${raw}`);
  if (entry.effectiveScore !== effective) throw new Error(`${label}: effectiveScore ${entry.effectiveScore} != computed ${effective}`);
  if (entry.loss !== loss) throw new Error(`${label}: loss ${entry.loss} != computed ${loss}`);
  if (entry.fatalPenalty === true) throw new Error(`${label}: fatal penalty is active`);
  if (target) {
    if (Number.isFinite(target.minimumRawScore) && raw < target.minimumRawScore) {
      throw new Error(`${label}: raw score ${raw} < target ${target.minimumRawScore}`);
    }
    if (effective < target.minimumEffectiveScore) {
      throw new Error(`${label}: effective score ${effective} < target ${target.minimumEffectiveScore}`);
    }
    if (loss > target.maximumLoss) throw new Error(`${label}: loss ${loss} > maximum ${target.maximumLoss}`);
  }
  return { raw, penalties, effective, loss };
}

const baselineIce = evaluate('baseline.ice', doc.baseline.ice);
const baselineXc = evaluate('baseline.xc', doc.baseline.xc);
console.log(`Winter baseline: ICE ${baselineIce.effective}/100 (loss ${baselineIce.loss}); XC ${baselineXc.effective}/100 (loss ${baselineXc.loss})`);

if (doc.candidate) {
  const ice = evaluate('candidate.ice', doc.candidate.ice, doc.mergeTargets.ice);
  const xc = evaluate('candidate.xc', doc.candidate.xc, doc.mergeTargets.xcControlledSurface);
  if (ice.effective <= baselineIce.effective) throw new Error('candidate.ice must improve on baseline');
  if (xc.effective <= baselineXc.effective) throw new Error('candidate.xc must improve on baseline');
  for (const [name, entry] of [['ice', doc.candidate.ice], ['xc', doc.candidate.xc]]) {
    if (!Array.isArray(entry.evidence) || entry.evidence.length < 4) {
      throw new Error(`candidate.${name}: at least four evidence items are required`);
    }
  }
  console.log(`Winter candidate: ICE ${ice.effective}/100 (loss ${ice.loss}); XC ${xc.effective}/100 (loss ${xc.loss})`);
  console.log('WINTER ENGINE SCORECARD: PASS');
} else if (process.argv.includes('--check')) {
  throw new Error('candidate scores are required in --check mode');
}
