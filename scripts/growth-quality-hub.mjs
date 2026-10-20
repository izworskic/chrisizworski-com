#!/usr/bin/env node
// One front door for tool HTML quality and the existing Million Impressions GSC program.
// No installs, builds, paid APIs, or Google credentials. Never invent unavailable metrics.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManifest } from './tool-quality-factory.mjs';

export const GOALS = Object.freeze({
  windowDays: 28, impressions: 1_000_000, ctr: 0.05, clicksAtTarget: 50_000,
  site: 'sc-domain:chrisizworski.com'
});
const blocked = (report) => report.issues.filter(issue => issue.level === 'error');
const cliArg = (key, fallback = '') => {
  const prefix = '--' + key + '=';
  return process.argv.find(x => x.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
function requireInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' must be a non-negative integer');
  return value;
}
function requirePosition(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(label + ' must be a valid position');
  return value;
}
function decimal(n, places = 2) { return Number(n.toFixed(places)); }
function stableUrl(input) {
  try {
    const u = new URL(input);
    if (!/^https?:$/.test(u.protocol)) return '';
    u.hash = ''; u.search = '';
    return u.href.replace(/\/?$/, '/');
  } catch { return ''; }
}
export function summarizeGsc(raw, options = {}) {
  if (raw == null) return { status:'UNAVAILABLE', reason:'No dated native GSC report supplied; rankings, CTR and impressions cannot be inferred from HTML.' };
  if (raw.siteUrl !== (options.site || GOALS.site)) throw new Error('GSC property differs from the configured property');
  const current = raw.windows?.current;
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(current.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(current.endDate || '')) {
    throw new Error('Native GSC report requires a valid current start/end date window');
  }
  const start = Date.parse(current.startDate + 'T00:00:00Z'), end = Date.parse(current.endDate + 'T00:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(end) || new Date(start).toISOString().slice(0,10) !== current.startDate || new Date(end).toISOString().slice(0,10) !== current.endDate) {
    throw new Error('Invalid GSC date');
  }
  if ((end - start)/86_400_000 + 1 !== GOALS.windowDays) throw new Error('Current GSC window must have 28 inclusive days');
  const total = raw.totals?.current;
  if (!total) throw new Error('Native GSC report lacks separate property totals: do not sum truncated page rows as site totals');
  const clicks = requireInteger(total.clicks,'GSC total clicks');
  const impressions = requireInteger(total.impressions,'GSC total impressions');
  if (clicks > impressions) throw new Error('GSC clicks cannot exceed impressions');
  const ctr = impressions ? clicks / impressions : 0;
  const reportedCtr = Number(total.ctr);
  if (Number.isFinite(reportedCtr) && Math.abs(reportedCtr - ctr) > 0.0006) throw new Error('GSC CTR does not reconcile with clicks / impressions');
  const pages = Array.isArray(raw.pages?.top) ? raw.pages.top : [];
  const pageRows = [];
  for (const p of pages) {
    const imp = requireInteger(p.impressions,'GSC page impressions');
    const clk = requireInteger(p.clicks,'GSC page clicks');
    if (clk > imp) throw new Error('Page clicks exceed impressions for ' + p.page);
    const position = requirePosition(p.position,'GSC page average position');
    const canonical = stableUrl(p.page);
    if (!canonical) throw new Error('Invalid page URL in GSC report');
    pageRows.push({
      page:canonical, impressions:imp, clicks:clk,
      ctr: imp ? decimal(clk / imp, 6) : 0,
      position:decimal(position),
      classification:p.classification || 'UNCLASSIFIED',
      estimatedExtraClicks:Number.isFinite(p.potentialClicks) && p.potentialClicks > 0 ? Math.round(p.potentialClicks) : 0
    });
  }
  // Source of expected-CTR estimates is the EXISTING GSC classifier. These are opportunity
  // heuristics, not a promise of traffic. Do not recompute a competing expected-CTR curve.
  const candidates = Array.isArray(raw.pages?.ctrOpportunities) ? raw.pages.ctrOpportunities : [];
  const opportunities = candidates.filter(p=>Number.isFinite(p.potentialClicks) && p.potentialClicks > 0)
    .map(p=>({
      page:stableUrl(p.page), impressions:p.impressions,
      ctrPct:p.ctr, position:p.position,
      potentialClicks:p.potentialClicks,
      explanation:'Native GSC classifier estimate; not a causal forecast'
    })).filter(p=>p.page).sort((a,b)=>b.potentialClicks-a.potentialClicks).slice(0,30);
  const generatedAt = typeof raw.generatedAt === 'string' && !Number.isNaN(Date.parse(raw.generatedAt)) ? raw.generatedAt : null;
  const ageDays = generatedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(generatedAt))/86_400_000)) : null;
  return {
    status:'MEASURED', property:raw.siteUrl, startDate:current.startDate, endDate:current.endDate,
    generatedAt, stale:ageDays === null || ageDays > 7,
    totals:{impressions,clicks,ctr:decimal(ctr,6),ctrPct:decimal(100*ctr),
      averagePosition:Number.isFinite(total.position) ? decimal(total.position) : null},
    goals:{impressions:GOALS.impressions,ctr:GOALS.ctr,clicksAtTarget:GOALS.clicksAtTarget,
      impressionProgressPct:decimal(100*impressions / GOALS.impressions),
      impressionGap:Math.max(0,GOALS.impressions-impressions),
      ctrGapPoints:decimal(Math.max(0,GOALS.ctr-ctr)*100)},
    pageRows, opportunities,
    note:'Site totals use the separate native property total query. Page rows may be truncated, and estimated opportunities are not guaranteed clicks. Non-branded CTR must be measured separately when query segmentation is available.'
  };
}
export function createUnifiedReport({technical,gsc,config = {},now = new Date().toISOString()}) {
  const technicalReports = technical.reports || [];
  const problemPages = technicalReports.filter(r => r.errors).map(r=>({
    page:r.name,source:r.source,priority:'P0',why:blocked(r).map(x=>x.code).join(', '),
    action:'Repair indexability/metadata/HTML eligibility before proposing snippet experiments'
  }));
  const inspected = new Map(technicalReports.map(r=>[stableUrl(r.measurements?.canonical || r.source),r]));
  const opportunities = gsc.status==='MEASURED' ? gsc.opportunities.map(x=>{
    const found = inspected.get(x.page);
    return {...x,technicalAudit:found?.status || 'NOT_AUDITED',priority:found?.errors?'P0':'P1'};
  }) : [];
  return {
    version:1, generatedAt:now, product:'Million Impressions — Growth & Quality Hub',
    objective:{...GOALS}, technical, gsc,
    actionQueue:{
      technicalBlockers:problemPages,
      measuredCtrOpportunities:opportunities,
      nextAction:problemPages.length ?
        'Fix verified technical blockers in the owning repository, then rerun this audit.' :
        gsc.status!=='MEASURED' ?
          'Supply a finalized 28-day native GSC report before choosing CTR or impression-growth priorities.' :
          opportunities.length ?
            'Review the highest-impact measured CTR opportunity, preserve protected experiments, then ship one evidence-based improvement.' :
            'Investigate emerging demand and the canonical tool network using measured Search Console queries.'
    },
    existingReleaseGates:{
      status:'NOT_RUN',
      source:'MILLION_IMPRESSIONS_PLAYBOOK.md and AGENTS.md',
      requiredInPrimaryRepo:'npm run verify:all',
      guardrails:['canonical ownership','identity and Person ID','sitemap and internal links','source validity and freshness','actual input/output causality','mobile accessibility','ad policies','production commit verification'],
      note:'Unified quick audit does not override the required owning-repo full release gates.'
    },
    instructions:'Checks never rewrite pages or create new canonical URLs. No GSC snapshot means NOT AVAILABLE, never zero traffic. No test report alone establishes a production release.'
  };
}
export function markdownScorecard(report) {
  const g = report.gsc, t = report.technical, lines = [
    '# Million Impressions — Growth & Quality Scorecard',
    '', 'Generated: ' + report.generatedAt, '',
    '## Search outcome (28-day Google Web Search)', ''
  ];
  if (g.status!=='MEASURED') lines.push('**NOT AVAILABLE** — '+g.reason, '');
  else {
    lines.push('| Metric | Observed | Target |','| --- | ---: | ---: |');
    lines.push('| Impressions | '+g.totals.impressions.toLocaleString('en-US')+' | '+GOALS.impressions.toLocaleString('en-US')+' |');
    lines.push('| CTR | '+g.totals.ctrPct+'% | '+(GOALS.ctr*100)+'% |');
    lines.push('| Clicks | '+g.totals.clicks.toLocaleString('en-US')+' | '+GOALS.clicksAtTarget.toLocaleString('en-US')+' at target impressions and CTR |');
    lines.push('', 'Source: '+g.property+', '+g.startDate+' to '+g.endDate+'. '+(g.stale?'**STALE/UNDATED REPORT — refresh before decisions.**':'Finalized 28-day report supplied.'), '');
  }
  lines.push('## Technical first-response audit', '',
    '| Page | Result | Errors | Warnings |',
    '| --- | --- | ---: | ---: |');
  for (const p of t.reports) lines.push('| '+p.name.replace(/\|/g,'/')+' | '+p.status+' | '+p.errors+' | '+p.warnings+' |');
  lines.push('', '**Technical score:** '+t.summary.passed+' passed, '+t.summary.review+' review, '+t.summary.failed+' failed. This is not a Google ranking score.', '');
  if (g.status==='MEASURED') {
    lines.push('## Native GSC CTR opportunity queue', '',
      '| Page | Impressions | Position | Modeled opportunity clicks* |',
      '| --- | ---: | ---: | ---: |');
    for (const p of report.actionQueue.measuredCtrOpportunities.slice(0,10))
      lines.push('| '+p.page+' | '+p.impressions+' | '+p.position+' | '+p.potentialClicks+' |');
    lines.push('', '*From the existing classifier; hypothetical headroom, not guaranteed organic traffic.', '');
  }
  lines.push('## Next action', '', report.actionQueue.nextAction, '',
    'Before merge, follow AGENTS.md and the owning repository full release gates. Neither this scorecard nor GitHub CI proves a deployed production change.', '');
  return lines.join('\n');
}
export async function buildUnifiedReport({
  manifestPath, singleUrl, gscPath, outputJson, outputMd, failOn='error', cwd=process.cwd()
} = {}) {
  if (!manifestPath && !singleUrl) throw new Error('Provide manifestPath or singleUrl');
  if (!['error','warning','never'].includes(failOn)) throw new Error('Invalid fail-on policy');
  const manifest = singleUrl ? [{name:singleUrl,url:singleUrl}] :
    JSON.parse(await readFile(path.resolve(cwd,manifestPath),'utf8'));
  const technical = await runManifest(manifest,{cwd});
  const snapshot = gscPath ? JSON.parse(await readFile(path.resolve(cwd,gscPath),'utf8')) : null;
  const gsc = summarizeGsc(snapshot);
  const report = createUnifiedReport({technical,gsc});
  if (outputJson) await writeFile(path.resolve(cwd,outputJson),JSON.stringify(report,null,2)+'\n');
  if (outputMd) await writeFile(path.resolve(cwd,outputMd),markdownScorecard(report));
  const fails = failOn==='warning' ? technical.reports.some(p=>p.errors||p.warnings) :
    failOn==='error' ? technical.summary.failed>0 : false;
  return {report,exitCode:fails?1:0};
}
async function main() {
  const {report,exitCode} = await buildUnifiedReport({
    manifestPath:cliArg('manifest'),singleUrl:cliArg('url'),gscPath:cliArg('gsc'),
    outputJson:cliArg('out','growth-quality-report.json'),outputMd:cliArg('markdown','growth-quality-report.md'),
    failOn:cliArg('fail-on','error')
  });
  console.log('Million Impressions — Growth & Quality Hub');
  console.log('Technical: '+report.technical.summary.passed+' passed, '+report.technical.summary.review+' review, '+report.technical.summary.failed+' failed');
  console.log('GSC: '+(report.gsc.status==='MEASURED' ? report.gsc.totals.impressions+' impressions / '+report.gsc.totals.ctrPct+'% CTR' : 'NOT AVAILABLE (no 28-day report supplied)'));
  console.log('Next: '+report.actionQueue.nextAction);
  if (exitCode) process.exitCode=exitCode;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(err=>{console.error('Growth & Quality Hub INCOMPLETE: '+err.message);process.exitCode=2;});
