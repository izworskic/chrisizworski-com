#!/usr/bin/env node
/*
 * Welland camera + lock media quality contract.
 * V = 0.35 Subject Accuracy + 0.20 Uniqueness + 0.15 Provenance
 *   + 0.15 Explanation + 0.10 Camera Truth + 0.05 Delivery.
 *
 * Structural compliance score, NOT verified visitor comprehension, player
 * uptime, or qualitative photo rating. Gate forbids wrong or recycled locks.
 */
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('public/assets/welland-canal.js');
const html=read('public/welland-canal/index.html');
const begin=js.indexOf('  const LOCK_PHOTOS = {');
const end=js.indexOf('  const LOCK_QUICK = {',begin);
if(begin<0||end<0)throw Error('Photo or story editorial data not found');
const snapshot=JSON.parse(vm.runInNewContext(js.slice(begin,end)+'\nJSON.stringify({photos:LOCK_PHOTOS,stories:LOCK_STORIES});',{}, {timeout:2000}));
const {photos,stories}=snapshot;
const perLock=[],hardViolations=[];
let sumAccuracy=0, sumProvenance=0, sumExplanation=0, sumDelivery=0;
const used=new Set();
for(let i=1;i<=8;i++){
 const lock=String(i),story=stories[lock],photo=story&&photos[story.photo];
 if(!photo){hardViolations.push('Missing media for Lock '+i);continue}
 if(used.has(photo.src))hardViolations.push('Reused image for a different lock: '+photo.src);
 used.add(photo.src);
 let subject=0;
 if(photo.subjectLock!==lock)hardViolations.push('Wrong lock subject: Lock '+i+' uses '+photo.subjectLock);
 if(photo.view==='exact'&&photo.kind==='photo')subject=35;
 else if(photo.view==='flight-group'&&photo.kind==='photo'&&/Thorold flight aerial/i.test(photo.alt))subject=24;
 else if(photo.view==='historical'&&photo.kind==='photo'&&/1916/i.test(photo.alt+photo.caption))subject=28;
 else if(photo.view==='contextual'&&photo.kind==='photo'&&/not the Lock 8 chamber/i.test(photo.caption))subject=18;
 else hardViolations.push('Untruthful or unspecified image classification for Lock '+i);
 if(photo.view==='exact'&&/regional image|not Locks/i.test(photo.caption))hardViolations.push('Exact image falsely labeled: '+i);
 const provenance=Boolean(photo.credit&&photo.source&&photo.licenseUrl&&photo.source.startsWith('https://')&&photo.licenseUrl.startsWith('https://'));
 if(!provenance)hardViolations.push('Missing usable media credit/license/source for Lock '+i);
 const explains=Boolean(photo.alt&&photo.caption&&photo.alt.includes('Lock '+i)&&photo.caption.includes('Lock '+i)&&story.explainer.length>110);
 const local=photo.src.startsWith('/assets/welland/photos/')&&fs.existsSync(path.join(root,'public',photo.src));
 const remotePublic=photo.src.startsWith('https://commons.wikimedia.org/wiki/Special:Redirect/file/')||photo.src.startsWith('https://cdn.loc.gov/service/pnp/');
 const delivered=local||remotePublic;
 if(!delivered)hardViolations.push('Media must be an existing local file or approved archive image for Lock '+i+': '+photo.src);
 sumAccuracy+=subject;
 sumProvenance+=provenance?15:0;
 sumExplanation+=explains?15:0;
 sumDelivery+=delivered?5:0;
 perLock.push({lock:i,subject:photo.view,media:photo.src,photoSource:photo.source,accuracyPoints:subject,uniquenessPoints:20,provenancePoints:provenance?15:0,explanationPoints:explains?15:0,deliveryPoints:delivered?5:0});
}
const cameraTruth=html.includes('id="canalCameraPlay"')
 &&html.includes('yF7XdpkL34w')
 &&html.includes('This is not a camera inside Lock 8')
 &&html.includes('Current stream status unverified')
 &&html.includes('current availability not verified')
 &&html.includes('id="canalCameraFrame"')
 && !/<iframe[^>]+src="https:\/\/www\.youtube/.test(html)
 &&js.includes('canalCameraPlay')
 &&js.includes('cameraFrame.removeAttribute');
if(!cameraTruth)hardViolations.push('Camera source, availability, location, or click-to-play claim is unsafe');
const uniqueness=used.size===8?20:0;
const components={
 subjectAccuracy:Math.round(sumAccuracy/8*100)/100,
 uniqueness,
 provenance:Math.round(sumProvenance/8*100)/100,
 explanation:Math.round(sumExplanation/8*100)/100,
 cameraTruth:cameraTruth?10:0,
 delivery:Math.round(sumDelivery/8*100)/100
};
const weighted=Object.values(components).reduce((a,b)=>a+b,0);
const value=Math.round((hardViolations.length?Math.min(49,weighted):weighted)*10)/10;
const result={
 model:'Welland Lock Image + Camera Value V1',
 value,max:100,threshold:90,components,hardViolations,perLock,
 evidence:'Metadata/rights and first-party path or allowlisted archive URL checked; remote image delivery not guaranteed, flight overview shared by 4 and 6, runtime/visual verification separate',
 photosByLock:{exact:[1,2,3,7],realFlightGroupPhotos:[4,6],historicalConstructionPhoto:[5],contextualParkPhoto:[8]},
 camera:'Port Colborne Bridge 21 area; NOT Lock 8 chamber; uptime unverified'
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(value<90||hardViolations.length)process.exitCode=1;
