from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))

# Never promote a blocked or over-budget fixed corridor as the selected answer.
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    '  const feasible=all.filter(x=>!x.road.blocked&&x.durationHours<=input.hours+.3).sort((a,b)=>b.score-a.score),direct=all.find(x=>x.route.variant==="direct"),fallback=feasible[0]||direct||all[0];let chosen=fallback,jev={mode:"deterministic",choiceId:fallback?.route?.id||null,confidence:0,reason:"Deterministic destination-preserving fallback"};\n',
    '  const feasible=all.filter(x=>!x.road.blocked&&x.durationHours<=input.hours+.3).sort((a,b)=>b.score-a.score),direct=all.find(x=>x.route.variant==="direct")||all[0],minimumHours=direct?.durationHours??round(nonstopMinutes(input)/60,1),roadBlocked=Boolean(direct?.road?.blocked),timeTooShort=minimumHours>input.hours+.3,feasibility={ok:feasible.length>0,reason:roadBlocked?"road-blocked":timeTooShort?"time-window-too-short":"no-valid-plan",roadBlocked,timeTooShort,availableHours:input.hours,minimumHours,requiredHours:Math.min(16,Math.max(2,Math.ceil(minimumHours))),timeShortfallHours:round(Math.max(0,minimumHours-input.hours),1),blocks:direct?.road?.blocks||[],cautions:direct?.road?.cautions||[],selectedInterests:[...input.interests]};\n  if(!feasible.length){const alternatives=all.sort((a,b)=>b.score-a.score).map(x=>serialize(x,input,null,road.ok)).slice(0,4),jev={mode:"deterministic",choiceId:null,confidence:1,reason:"No blocked or over-budget corridor may be promoted as a valid itinerary"};return{selected:null,alternatives,planB:null,jev,feasibility};}\n  const fallback=feasible[0];let chosen=fallback,jev={mode:"deterministic",choiceId:fallback.route.id,confidence:0,reason:"Deterministic destination-preserving fallback"};\n'
)
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    '  if(!chosen)return{selected:null,alternatives:[],planB:null,jev};chosen.roadSourceOk=road.ok;const selectedRaw=serialize(chosen,input,null,road.ok),editorial=await writePlanBrief(selectedRaw,input),selected={...selectedRaw,editorial};const alternatives=all.filter(x=>x.route.id!==chosen.route.id).sort((a,b)=>b.score-a.score).map(x=>serialize(x,input,null,road.ok)).slice(0,4),planB=alternatives.find(x=>!x.blocked&&x.durationHours<=input.hours+.3)||alternatives.find(x=>!x.blocked)||null;if(planB)planB.fallbackReason=fallbackReason(selected,planB);return{selected,alternatives,planB,jev};\n',
    '  chosen.roadSourceOk=road.ok;const selectedRaw=serialize(chosen,input,null,road.ok),editorial=await writePlanBrief(selectedRaw,input),selected={...selectedRaw,editorial};const alternatives=all.filter(x=>x.route.id!==chosen.route.id).sort((a,b)=>b.score-a.score).map(x=>serialize(x,input,null,road.ok)).slice(0,4),planB=alternatives.find(x=>!x.blocked&&x.durationHours<=input.hours+.3)||null;if(planB)planB.fallbackReason=fallbackReason(selected,planB);return{selected,alternatives,planB,jev,feasibility:{ok:true,reason:null,roadBlocked:false,timeTooShort:false,availableHours:input.hours,minimumHours:round(nonstopMinutes(input)/60,1),requiredHours:Math.min(16,Math.max(2,Math.ceil(nonstopMinutes(input)/60))),timeShortfallHours:0,blocks:[],cautions:chosen.road.cautions||[],selectedInterests:[...input.interests]}};\n'
)
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    'selected:decision.selected,planB:decision.planB,alternatives:decision.alternatives,decisionMeta:{mode:decision.jev?.mode||"deterministic",confidence:decision.jev?.confidence||0},sources:sources(road,decision.selected)',
    'selected:decision.selected,planB:decision.planB,alternatives:decision.alternatives,feasibility:decision.feasibility||null,decisionMeta:{mode:decision.jev?.mode||"deterministic",confidence:decision.jev?.confidence||0},sources:sources(road,decision.selected)'
)
replace_once(
    "lib/blue-ridge-parkway/point-to-point.js",
    'selection:"Start and finish are hard constraints. The decision layer may choose only among stop plans on that fixed corridor; it cannot reverse direction or choose a different destination."',
    'selection:"Start and finish are hard constraints. Blocked or over-budget corridors are never promoted as a valid itinerary. The decision layer may choose only among feasible stop plans on that fixed corridor; it cannot reverse direction or choose a different destination."'
)

# Make the browser explain infeasibility and preserve the distinction between interests and stops.
replace_once(
    "public/assets/blue-ridge-parkway.js",
    '    const plan=payload.selected;if(!plan){$("decision").innerHTML=`<div class="source-warning"><strong>No usable route was returned.</strong><p>Check the official NPS road table before traveling.</p></div>`;$("whyCard").innerHTML="";$("watchCard").innerHTML="";$("planB").innerHTML="";return;}\n',
    '    const plan=payload.selected;if(!plan){const f=payload.feasibility||{},labels=(f.selectedInterests||payload.input?.interests||[]).map(x=>interestLabels[x]||x),start=payload.gateway?.label||"Your start",finish=payload.finishGateway?.label||"your finish",minimum=Number(f.minimumHours),available=Number(f.availableHours),timeLine=Number.isFinite(minimum)?`Even before sightseeing, the modeled Parkway drive is about <strong>${esc(minimum.toFixed(1))} hr</strong>${Number.isFinite(available)?` against your <strong>${esc(available)} hr</strong> window`:""}.`:"",blocks=(f.blocks||[]).map(x=>`<li><strong>${fmtMile(x.start)}–${fmtMile(x.end).replace("MP ","")}</strong>${x.note?` · ${esc(x.note)}`:""}</li>`).join(""),roadCopy=f.roadBlocked?`<p>The current NPS road data interrupts the Parkway corridor between <strong>${esc(start)}</strong> and <strong>${esc(finish)}</strong>. The planner will not label a blocked corridor as a finished itinerary.</p>${blocks?`<ul class="reason-list">${blocks}</ul>`:""}`:`<p><strong>${esc(start)} → ${esc(finish)}</strong> does not fit inside the time you gave the planner.</p>`,interestCopy=labels.length?`<p>Your selected interests are still active: <strong>${esc(labels.join(" · "))}</strong>. No sightseeing stops were chosen because there is not yet a valid time-and-road corridor to place them into.</p>`:"";$("decision").innerHTML=`<div class="source-warning"><div class="eyebrow">${f.roadBlocked?"ROAD BLOCKS THIS DRIVE":"THIS WINDOW DOESN’T FIT"}</div><h2>${f.roadBlocked?"The Parkway corridor is interrupted":"The destination needs more time"}</h2>${roadCopy}<p>${timeLine}</p>${interestCopy}${!f.roadBlocked&&f.requiredHours?`<div class="decision-actions"><button class="primary-link" id="useMinimumTime" type="button">Use ${esc(f.requiredHours)} hours</button></div>`:""}</div>`;$("whyCard").innerHTML="";$("watchCard").innerHTML="";$("planB").innerHTML="";$("timelineWindow").textContent="No valid stop schedule";$("timeline").innerHTML=`<div class="source-warning"><strong>No planner-selected stops.</strong><p>Your interests were not cleared. The planner withheld stops because the fixed drive is ${f.roadBlocked?"currently interrupted by road status":"longer than the available window"}.</p></div>`;$("timelineReturn").innerHTML=Number.isFinite(minimum)?`Minimum modeled Parkway drive before sightseeing: <strong>${esc(minimum.toFixed(1))} hr</strong>.`:"";$("selectedStopSummary").innerHTML=`<strong>0 planner-selected stops</strong>${labels.length?`<span>${esc(labels.length)} selected interest${labels.length===1?"":"s"} kept</span>`:""}`;$("selectedStopDetails").innerHTML=`<article class="stop-detail-card"><div class="stop-detail-title"><h3>Your interests are selected; the itinerary is not.</h3><div class="stop-detail-block"><span>Why there are no stops</span><p>${f.roadBlocked?"A hard road interruption has to be resolved or detoured before sightseeing stops can be scheduled honestly.":"The drive itself uses more time than you allowed. Add time or choose a closer finish, then the planner can spend the remaining margin on your interests."}</p></div></div></article>`;$("weatherCard").innerHTML="";$("viewCard").innerHTML="";$("foliageCard").innerHTML="";const alert=$("roadAlertSection"),road=$("roadAlert");if(alert&&road){alert.hidden=!f.roadBlocked;road.innerHTML=blocks?`<div class="road-note blocked"><strong>Current corridor interruption</strong><span>See the affected Parkway segments above and verify the official NPS road table before leaving.</span></div>`:"";}$("roadReality").innerHTML="";$("useMinimumTime")?.addEventListener("click",()=>{const hours=$("hours");if(hours){hours.value=String(f.requiredHours);renderCorridorBudget();build();}});return;}\n'
)
replace_once(
    "public/assets/blue-ridge-parkway.js",
    'join("")||`<div class="source-warning"><strong>${pointToPoint?"No optional stops selected.":"No timed stops returned."}</strong><p>${pointToPoint?"The model is protecting the destination and arrival window.":""}</p></div>`;',
    'join("")||`<div class="source-warning"><strong>${pointToPoint?"No planner-selected stops fit this drive.":"No timed stops returned."}</strong><p>${pointToPoint?"Your checked interests are still selected; this route did not have enough valid sightseeing margin to schedule a stop.":""}</p></div>`;'
)
replace_once(
    "public/assets/blue-ridge-parkway.js",
    '  function renderAlternatives(payload){const pointToPoint=payload.selected?.tripMode==="point-to-point";',
    '  function renderAlternatives(payload){const pointToPoint=payload.selected?.tripMode==="point-to-point"||payload.input?.tripMode==="point-to-point";'
)
replace_once(
    "public/blue-ridge-parkway/index.html",
    '/assets/blue-ridge-parkway.js?v=20260925-7',
    '/assets/blue-ridge-parkway.js?v=20260925-8'
)

# Add regression coverage for the exact failure class Chris surfaced.
p=Path("tests/blue-ridge-parkway-destination.test.js")
s=p.read_text().replace('blue-ridge-parkway\\.js\\?v=20260925-7','blue-ridge-parkway\\.js\\?v=20260925-8')
s += '''\n\ntest("infeasible point-to-point corridors are not promoted as a selected answer",()=>{\n  const engine=fs.readFileSync(path.join(__dirname,"..","lib","blue-ridge-parkway","point-to-point.js"),"utf8");\n  assert.doesNotMatch(engine,/feasible\\[0\\]\\|\\|direct\\|\\|all\\[0\\]/);\n  assert.match(engine,/if\\(!feasible\\.length\\)/);\n  assert.match(engine,/selected:null,alternatives,planB:null/);\n  assert.match(engine,/roadBlocked/);\n  assert.match(engine,/timeTooShort/);\n});\n\ntest("infeasible result UI keeps interests distinct from planner-selected stops",()=>{\n  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8");\n  assert.match(source,/Your interests are selected; the itinerary is not/);\n  assert.match(source,/0 planner-selected stops/);\n  assert.match(source,/selected interest/);\n  assert.doesNotMatch(source,/No optional stops selected\\./);\n  assert.match(source,/ROAD BLOCKS THIS DRIVE/);\n  assert.match(source,/THIS WINDOW DOESN’T FIT/);\n});\n'''
p.write_text(s)
