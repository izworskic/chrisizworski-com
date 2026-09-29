import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VISIT_FIT_ROW='<div class="decision-row"><div class="decision-label">For you</div><div id="visitFit" class="decision-value loading">Applying your trip choices…</div></div>';

export function ensureKilaueaChoiceCausality(targetRoot=process.cwd()) {
  const file=path.join(targetRoot,'public','synced-national-tools','kilauea-live','index.html');
  if(!fs.existsSync(file)) throw new Error('Kilauea choice guard: page missing');
  let html=fs.readFileSync(file,'utf8');

  if(!html.includes('id="visitFit"')) {
    const anchor='<div class="decision-row"><div class="decision-label">Quick action</div><div id="quickAction" class="decision-value action loading">Checking access…</div></div>\n</div>';
    if(!html.includes(anchor)) throw new Error('Kilauea choice guard: quick-action anchor missing');
    html=html.replace(anchor,`${anchor}\n${VISIT_FIT_ROW}`);
  }

  html=html.replace(
    "['decisionState','headline','bestWindow','mainReason','quickAction'].forEach",
    "['decisionState','headline','bestWindow','mainReason','quickAction','visitFit'].forEach"
  );

  if(!html.includes("$('visitFit').textContent=d.decision?.visitFit")) {
    const renderAnchor="$('bestWindow').textContent=bestWindow(d); $('mainReason').textContent=d.decision?.mainReason || 'Evidence is incomplete.'; $('quickAction').textContent=d.decision?.action || 'Check official sources.';";
    if(!html.includes(renderAnchor)) throw new Error('Kilauea choice guard: render anchor missing');
    html=html.replace(renderAnchor,`${renderAnchor} $('visitFit').textContent=d.decision?.visitFit || 'Your trip choices did not produce a safe place-fit recommendation.';`);
  }

  if(!html.includes("$('visitFit').textContent='Trip-fit guidance unavailable until live evidence returns.'")) {
    const clearAnchor="$('helping').textContent='The current summit picture is unavailable.'; $('hurting').textContent='The newest request failed, so old evidence has been cleared instead of being dressed up as current conditions.'; $('confidence').textContent='Confidence: Limited data'; $('confidenceWhy').textContent='No current source bundle is available.';";
    if(!html.includes(clearAnchor)) throw new Error('Kilauea choice guard: clear-evidence anchor missing');
    html=html.replace(clearAnchor,`${clearAnchor} $('visitFit').textContent='Trip-fit guidance unavailable until live evidence returns.';`);
  }

  const required=[
    'data-control="travel"',
    'data-control="mobility"',
    'data-control="experience"',
    'data-control="plan"',
    'id="visitFit"',
    "d.decision?.visitFit",
    "new URLSearchParams({travel:state.travel,mobility:state.mobility,experience:state.experience,plan:state.plan})"
  ];
  for(const token of required) if(!html.includes(token)) throw new Error(`Kilauea choice guard: missing ${token}`);

  fs.writeFileSync(file,html,'utf8');
  return {changed:true};
}

const invoked=process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(invoked) ensureKilaueaChoiceCausality(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd());
