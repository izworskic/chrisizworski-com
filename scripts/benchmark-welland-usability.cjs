#!/usr/bin/env node
/**
 * Welland Canal interface value function (deterministic implementation checks).
 * This is a product-quality proxy, NOT a claim about real user task-success,
 * comprehension, latency, search performance, or engagement.
 *
 * V = 100 × (0.30·Ease + 0.30·Understanding + 0.15·Orientation +
 *            0.15·Trust + 0.10·Inclusion), with truthfulness vetoes.
 *
 * Human validation targets: median time to explain a selected lock <= 12 s;
 * >= 90% can identify the lock's role and location; >= 90% correctly
 * distinguish the photo from live data; >= 95% complete lock selection on
 * mobile in <= 1 deliberate tap. Those targets are not measured here.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'public/assets/welland-canal.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/welland-canal.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public/welland-canal/index.html'),'utf8');

const checks={
  ease:[
    ['all eight locks selectable beside map',html.indexOf('id="lockRail"')>0&&html.indexOf('id="lockRail"')<html.indexOf('id="shipMap"')],
    ['a lock requires only one nav tap',js.includes("b.addEventListener('click',()=>chooseLock(l.id,true,true))")],
    ['map click gives instant answer',js.includes("marker.on('click',()=>chooseLock(lock.id,false,true))")],
    ['grouped markers do not block a lock choice',html.includes('Grouped numbers? Tap to zoom, or choose any lock above')],
    ['one-tap answer available on mobile',js.includes("if(fromMap&&lock)showLockPreview(lock)")],
    ['reset to overview retained',js.includes("showAllLocks')")],
  ],
  understanding:[
    ['all eight authored brief answers', [...js.matchAll(/'\d':\{cue:'[^']+',answer:'[^']+'/g)].length===8],
    ['purpose label visible on every lock choice',js.includes("el('span',LOCK_QUICK[l.id].cue)")],
    ['mobile preview answers what the lock does',js.includes("mapLockPreviewText').textContent=LOCK_QUICK[lock.id].answer")],
    ['desktop card leads with short answer',js.includes("lockDetailQuick').textContent=lock?LOCK_QUICK[lock.id].answer")],
    ['photo identity visible in mobile preview',js.includes("mapLockPreviewCaption').textContent=photo.caption")],
    ['photography and long-form explanations preserved',html.includes('id="lockDetailImage"')&&html.includes('id="lockDetailDescription"')],
  ],
  orientation:[
    ['map-marker selection does not jerk camera',js.includes("marker.on('click',()=>chooseLock(lock.id,false,true))")],
    ['nav chooses a bounded zoom',js.includes("const zoom=['4','5','6'].includes(id)?14:12")],
    ['overview reset remains available',html.includes('id="showAllLocks"')],
    ['group disclosure and map distinction explicit',html.includes('Grouped numbers?')&&html.includes('Ships on the map are recent AIS reports')],
    ['number selection and current lock synchronized',js.includes("b.setAttribute('aria-pressed',String(b.dataset.lock===id))")],
  ],
  trust:[
    ['nearby AIS list uses true lock distance',js.includes('v=>distanceKm(v,lock)<=1.5')],
    ['nearby AIS detail count uses same distance',js.includes('v=>distanceKm(v,lock)<=1.5).length')],
    ['AIS freshness gate preserved',js.includes('minutesOld(v.seen)<=30')],
    ['no AIS lock-occupancy claim',js.includes('Not a lock occupancy count.')],
    ['shared Thorold photo caption is truthful',js.includes('regional image, not Locks 4–6')],
    ['photo creators and licences linked',html.includes('id="lockDetailImageLicense"')&&html.includes('id="lockDetailImageCredit"')],
  ],
  inclusion:[
    ['lock choices have minimum 44 px tap target',css.includes('min-height:49px')],
    ['lock buttons explain their purpose to assistive tech',js.includes("b.setAttribute('aria-label','Explore '+l.name")],
    ['selected state exposed',js.includes("b.setAttribute('aria-pressed',String(selected===l.id))")],
    ['touch preview can be dismissed or expanded',html.includes('id="mapLockPreviewDismiss"')&&html.includes('id="mapLockPreviewOpen"')],
    ['reduced motion honoured',js.includes('prefers-reduced-motion: reduce')],
    ['failed photography has fallback',js.includes('img.onerror=')&&html.includes('id="lockDetailImageFallback"')],
  ],
};
const weights={ease:0.30,understanding:0.30,orientation:0.15,trust:0.15,inclusion:0.10};
const scores=Object.fromEntries(Object.entries(checks).map(([k,items])=>[k,Math.round(100*items.filter(x=>x[1]).length/items.length)]));
const raw=Object.keys(weights).reduce((sum,k)=>sum+weights[k]*scores[k],0);
const veto={
  photoTruth:checks.trust.find(x=>x[0]==='shared Thorold photo caption is truthful')[1],
  aisTruth:checks.trust.find(x=>x[0]==='no AIS lock-occupancy claim')[1]&&checks.trust.find(x=>x[0]==='nearby AIS detail count uses same distance')[1],
  credits:checks.trust.find(x=>x[0]==='photo creators and licences linked')[1],
};
const total=Math.round(Object.values(veto).some(x=>!x)?Math.min(raw,49):raw);
const missing=Object.entries(checks).flatMap(([dimension,items])=>items.filter(x=>!x[1]).map(x=>dimension+': '+x[0]));
const report={
  framework:'Welland one-tap UX value v1',score:total,weights,scores,
  gates:veto,failures:missing,
  measurement:'Static implementation contract only; user comprehension and task times require observational testing',
  humanTargets:{mobileOneTapSuccess:'>=95%',correctRoleAndLocation:'>=90%',photoNotLiveUnderstanding:'>=90%',medianExplanationTime:'<=12s'}
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(total<90||missing.length||Object.values(veto).some(x=>!x))process.exitCode=1;
