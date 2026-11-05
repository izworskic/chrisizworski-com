(function(){
'use strict';
const root=document.getElementById('cm-validation');
if(!root)return;
const d=window.GardenCabbageValidation;
const status=document.getElementById('cm-status');
const panel=document.getElementById('cm-ui');
const notes=document.getElementById('cm-field-reports');
const choice=document.getElementById('cm-city');
const model=document.getElementById('cm-model-dates');
const verdict=document.getElementById('cm-truth');
const sensitivity=document.getElementById('cm-method-sensitivity');
const strict=document.getElementById('cm-evaluation');
if(!status||!panel||!notes||!choice||!model||!verdict||!sensitivity||!strict)return;
const OFFICIAL='https://www.canr.msu.edu/news/michigan-vegetable-crop-report-';
const stageNames={EGGS:'Eggs observed',LARVAL_FEEDING:'Larvae feeding',LARVAL_DAMAGE:'Root injury'};
const cities=['bay-city','detroit','grand-rapids','kalamazoo','traverse-city','marquette','houghton'];
function dateOK(s){if(typeof s!=='string'||!/^(202[1-5])-\d{2}-\d{2}$/.test(s))return false;const v=new Date(s+'T12:00:00Z');return !Number.isNaN(+v)&&v.toISOString().slice(0,10)===s}
function valid(p){
 if(!p||p.schema!=='cabbage-maggot-validation-gate-v1'||p.taxon!=='Delia radicum'||
 p.purpose!=='VERIFIED_FIELD_REPORTS_WITH_FAIL_CLOSED_EMPIRICAL_CALIBRATION'||
 p.fieldEvidence?.status!=='HISTORIC_MSU_EGGS_AND_INJURY_VERIFIED_NOT_FLIGHT_VALIDATION'||
 p.fieldEvidence?.verifiedReportMentions!==4||p.fieldEvidence?.uniqueMSUReportIssues!==3||
 p.fieldEvidence?.firstFlightMeasurements!==0||p.fieldEvidence?.independentStationYears!==0||
 !Array.isArray(p.fieldEvidence.reports)||p.fieldEvidence.reports.length!==4||
 p.fieldEvidence.publicationDateIsNotFirstEmergenceDate!==true||
 p.evaluation?.status!=='NO_MATCHED_INDEPENDENT_FIRST_FLIGHT_STATION_YEARS'||
 p.evaluation.promotionAllowed!==false||p.evaluation.uniqueMatchedStationYears!==0||
 p.evaluation.verifiedFirstFlightTrapSamples!==0||
 p.evaluation.observationalMedianAbsoluteErrorDays!==null||
 p.evaluation.observationalP90AbsoluteErrorDays!==null||p.evaluation.skillScore!==null||
 p.methodSensitivity?.status!=='UNVALIDATED_ALGORITHM_SENSITIVITY_NOT_PEST_ACCURACY'||
 p.methodSensitivity.archivedGridYears!==35||
 p.methodSensitivity.publishedFirstAdultDD!==300||
 p.methodSensitivity.publishedSpringAdultPeakDD!==565||
 p.methodSensitivity.parityWithOperationalMSU!==false||
 !Array.isArray(p.methodSensitivity.regions2025)||p.methodSensitivity.regions2025.length!==7||
 p.regionalUnmatchedExample?.measuredFirstFlightDate!==null||
 p.regionalUnmatchedExample?.errorDays!==null||p.regionalUnmatchedExample?.referenceCityNotField!==true)return false;
 const ids=new Set();
 for(const r of p.fieldEvidence.reports){
  if(ids.has(r.id)||!r.id||!r.sourceUrl?.startsWith(OFFICIAL)||
   !dateOK(r.issueDate)||r.firstFlightObserved!==false||r.canScoreFirstFlightError!==false||
   r.dateMeaning!=='ISSUE_DATE_NOT_EXACT_FIELD_OBSERVATION'||
   !stageNames[r.stage]||!r.region||!r.observed||!r.independenceGroup)return false;
  ids.add(r.id);
 }
 if(!cities.every(id=>p.methodSensitivity.regions2025.some(r=>r.cityId===id)))return false;
 for(const r of p.methodSensitivity.regions2025){
  if(!cities.includes(r.cityId)||r.year!==2025||
   !dateOK(r.first300Mean)||!dateOK(r.first300SingleSine)||
   !dateOK(r.peak565Mean)||!dateOK(r.peak565SingleSine)||
   !Number.isInteger(r.methodShiftDays)||r.modelParity!=='UNVERIFIED_MSU_STATION_IMPLEMENTATION')return false;
 }
 return true;
}
function el(tag,cls,txt){
 const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;
}
const dateText=(iso)=>new Date(iso+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
if(!valid(d)){
 status.textContent='The independent field-evidence bundle could not be verified. No model accuracy score or historical comparison will be displayed. Original MSU Extension articles remain linked below.';
 panel.hidden=true;
 return;
}
status.textContent='SOURCE-REVIEWED MSU FIELD REPORTS · 2025 ONLY · HISTORICAL METHOD CROSS-CHECK · NOT A LIVE WARNING';
panel.hidden=false;
verdict.replaceChildren();
const flag=el('strong','', 'MSU observed eggs and feeding. We still cannot grade the model against first adult flights.');
const descr=el('p','', 'These reports confirm cabbage maggot activity in Michigan in 2025. They do not provide an exact first flight, trap monitoring period, or geographic point that matches our weather grid. A precise accuracy percentage or days-of-error score would be invented.');
verdict.append(flag,descr);
notes.replaceChildren();
for(const r of d.fieldEvidence.reports){
 const card=el('div','cm-validate__record');
 const chip=el('span','cm-validate__chip',stageNames[r.stage]);
 const head=el('strong','',dateText(r.issueDate)+' · '+r.region);
 const body=el('p','',r.observed+'. The date is the MSU report date, not the first day the pest appeared.');
 const link=el('a','','Read the original MSU field report');
 link.href=r.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
 card.append(chip,head,body,link);notes.append(card);
}
const refs=d.methodSensitivity.regions2025;
choice.replaceChildren(...refs.map(row=>{const o=el('option','',row.city);o.value=row.cityId;return o;}));
choice.value='grand-rapids';
function dates(){
 const v=refs.find(x=>x.cityId===choice.value);if(!v)return;
 model.replaceChildren();
 const first=el('div','cm-validate__model-day');
 first.append(el('span','','300 DD43 / modeled first-adult heat threshold'),el('strong','',dateText(v.first300Mean)),
  el('small','','Daily mean method · March 1 start · NASA Daymet grid at '+v.city+', not an observed trap site'));
 const other=el('div','cm-validate__model-day is-second');
 other.append(el('span','','Alternate single-sine method · 300 DD43'),
  el('strong','',dateText(v.first300SingleSine)),
  el('small','','Published UC IPM method recommendation; its parity with the actual MSU station model is not established'));
 const peak=el('div','cm-validate__model-day');
 peak.append(el('span','','565 DD43 / separate spring peak-flight heat threshold'),
  el('strong','',dateText(v.peak565Mean)),
  el('small','','Daily mean example; not observed adult abundance or egg-laying at this city'));
 const shift=Math.abs(v.methodShiftDays);
 const method=el('p','cm-validate__sensitivity');
 const bold=el('strong','',shift+' '+(shift===1?'day':'days')+(v.methodShiftDays<=0?' earlier':' later'));
 method.append('At this grid, the single-sine formula crosses 300 DD43 ',bold,
  ' than the simple daily-mean formula. This measures formula sensitivity, not forecast error.');
 model.append(first,other,peak,method);
}
choice.addEventListener('change',dates);
dates();
const sh=d.methodSensitivity;
sensitivity.replaceChildren();
sensitivity.append(el('strong','', 'Across 35 complete historical grid-years: '),
 'changing only the degree-day algorithm shifted the 300 DD43 crossing '+Math.abs(sh.latestShiftDays)+
 '–'+Math.abs(sh.earliestShiftDays)+' days earlier with single sine. These dates were not fitted to observed fly captures.');
strict.replaceChildren(el('h3','','What would earn a real accuracy score?'),
 el('p','', 'The current evaluation has zero matched first-adult trap-flight station-years. To measure independent model error we need an original, independently verified Delia radicum first-positive trap interval, earlier negative trap checks, exact station coordinates and matching climate records across at least three held-out seasons and two stations. Historical MSU egg and damage reports are valuable evidence, but do not meet that standard.'),
 el('p','', 'Until then, numerical prediction error, skill and reliability all remain unavailable. The existing Michigan Garden Pest Watch scouting advice is unchanged; no treatment should be triggered by this comparison.'));
})();
