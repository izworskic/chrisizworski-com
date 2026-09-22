const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit Outdoors restores the original card-first decision surface",()=>{
 const html=read("public/detroit-outdoors/index.html");
 const css=read("public/assets/detroit-outdoors.css");
 assert.match(html,/<title>Things to Do in Detroit Today \| Detroit Outdoors<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/detroit-outdoors\/"/);
 assert.match(html,/id="opportunity-grid"/);
 assert.match(html,/class="hero"/);
 assert.match(html,/Where the day points/);
 assert.match(html,/The short list/);
 assert.match(css,/\.grid\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(css,/\.card\{/);
 assert.match(css,/\.hero\{display:grid/);
 assert.match(css,/\.hero-media\{min-height:280px/);
 assert.doesNotMatch(html,/Newsreader/);
 assert.doesNotMatch(html,/Fraunces/);
});

test("Detroit Outdoors keeps cards intelligent while replacing raw product copy with readable prose",()=>{
 const client=read("public/assets/detroit-outdoors.js");
 const html=read("public/detroit-outdoors/index.html");
 assert.match(client,/data\.edition\?\.notes\?\.\[c\.id\]/);
 assert.match(client,/c\.story&&c\.story\.whyToday/);
 assert.match(client,/card-read/);
 assert.match(html,/Each card keeps the conditions visible and links to the deeper check/);
 assert.doesNotMatch(html,/A human read on the signal stack/);
 assert.doesNotMatch(html,/Comparing the live Southeast Michigan signal stack/);
});

test("Detroit Outdoors keeps safety deterministic and JEV closed-set",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/HARD_ALERT/);
 assert.match(route,/safeCandidatesFrom/);
 assert.match(route,/if\(hazard\.hard\).*suppressed:true/);
 assert.match(route,/Choose exactly one supplied option/);
 assert.match(route,/Every candidate in this pool has already passed deterministic hard-safety and required-data gates/);
 assert.match(route,/activity-specific hard stops/);
 assert.doesNotMatch(route,/JEV.*legal status/i);
});

test("Detroit Outdoors separates strong desk writing from additive per-card writing",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/strong local outdoor editor/);
 assert.match(route,/knowledgeable local editor, not a chatbot/);
 assert.match(route,/Card explanations are written separately by independent card writers/);
 assert.match(route,/Your paragraph must be additive/);
 assert.match(route,/Use the supplied place context/);
 assert.match(route,/Return JSON only: \{\\"note\\":\\"\.\.\.\\"\}/);
 assert.match(route,/detroit-outdoors:desk:v8/);
 assert.match(route,/detroit-outdoors:card:v10/);
 assert.match(route,/placements:editorial\.actualPlacements/);
});


test("Detroit Outdoors makes JEV the board editor after hard safety gates",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/function safeCandidatesFrom/);
 assert.match(route,/if\(hazard\.hard\) return \{candidates:\[\],suppressed:/);
 assert.match(route,/if\(scored\.hardStop\|\|scored\.score===null\) continue/);
 assert.match(route,/parkSafePool\.push\(\.\.\.result\.candidates\)/);
 assert.match(route,/const emitted=emitSpecialistCandidates/);
 assert.match(route,/const specialistGate=hardGateSpecialistCandidates\(emitted\.candidates\)/);
 assert.match(route,/const mixed=dedupeMixedPool\(parkSafePool,specialistGate\.safe,specialistGate\.rejected\)/);
 assert.match(route,/const safePool=mixed\.candidates/);
 assert.match(route,/const boardDecision=await editBoard\(safePool,4\)/);
 assert.match(route,/You are the Detroit Outdoors board editor/);
 assert.match(route,/Every candidate in this pool has already passed deterministic hard-safety and required-data gates/);
 assert.match(route,/The heuristic score is evidence, not an instruction or ranking/);
 assert.match(route,/Judge incremental value against the cards already selected/);
 assert.match(route,/A second activity at the same place is allowed only when it represents a materially different and more useful decision/);
 assert.match(route,/boardEditor:\{/);
 assert.match(route,/candidateCount:boardDecision\.candidateCount/);
 assert.match(route,/selectedIds:ranked\.map/);
 assert.doesNotMatch(route,/raw\.sort\([\s\S]{0,300}slice\(0,4\)/);
});

test("Detroit Outdoors lets JEV assign an additive job to every card before Haiku runs",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.doesNotMatch(route,/MAX_EDITORIAL_CARD_NOTES/);
 assert.match(route,/async function planEditorialPlacement/);
 assert.match(route,/Choose the single best additive editorial job for this one Detroit Outdoors card/);
 assert.match(route,/Every displayed card gets its own Haiku writer/);
 assert.match(route,/Every card must receive one additive editorial job/);
 assert.match(route,/PLACE_CONTEXT/);
 assert.match(route,/WHY_TODAY/);
 assert.match(route,/DRIVE_DECISION/);
 assert.match(route,/NEXT_CHECK/);
 assert.match(route,/MIGRATION_CONTEXT/);
 assert.match(route,/SEASONAL_CONTEXT/);
 assert.match(route,/editorialQuestion/);
 assert.match(route,/question:editorialQuestion/);
 assert.match(route,/const cardNotes=mapped\.map/);
 assert.match(route,/placement:\`card:\$\{x\.candidateId\}:after-weather\`/);
});

test("Detroit Outdoors reuses existing engines and gates generated copy",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/michiganoutdoorsnow\.chrisizworski\.com/);
 assert.match(route,/api\/opportunities\?scope=all/);
 assert.match(route,/api\/fall-color-conditions/);
 assert.match(route,/ANTHROPIC_API_KEY/);
 assert.match(route,/claude-haiku-4-5-20251001/);
 assert.match(route,/AbortSignal\.timeout\(9000\)/);
 assert.match(route,/s-maxage=300/);
});

test("Detroit Outdoors uses the existing fall-color dispatcher instead of adding a serverless function",()=>{
 const dispatcher=read("api/fall-color.js");
 const vercel=read("vercel.json");
 assert.match(dispatcher,/"detroit-outdoors": require\("\.\.\/lib\/detroit-outdoors\/route\.js"\)/);
 assert.match(vercel,/"source": "\/api\/detroit-outdoors"/);
 assert.match(vercel,/"destination": "\/api\/fall-color\?view=detroit-outdoors"/);
});

test("Detroit Outdoors is discoverable from the tools hub and sitemap",()=>{
 const tools=read("public/tools/index.html");
 const sitemap=read("public/sitemap.xml");
 assert.match(tools,/href="\/detroit-outdoors\/"/);
 assert.match(sitemap,/https:\/\/chrisizworski\.com\/detroit-outdoors\//);
});

test("Detroit Outdoors validates and repairs each Haiku card independently",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(route,/async function reviewEditorialNote/);
 assert.match(route,/fallbackId:"REJECT"/);
 assert.match(route,/Reject generic encouragement, weather restatement, score restatement, travel-time restatement/);
 assert.match(route,/let review=await reviewEditorialNote\(candidate,activeSlot,note\)/);
 assert.match(route,/if\(!review\.accepted\)/);
 assert.match(route,/The reviewer rejected the first draft/);
 assert.match(route,/review=await reviewEditorialNote\(candidate,activeSlot,note\)/);
 assert.match(route,/mode:"anthropic-rejected"/);
 assert.match(client,/Why this matters/);
});


test("Detroit Outdoors expands migration cards with classifier-driven authoritative context",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 const css=read("public/assets/detroit-outdoors.css");
 assert.match(route,/const EDITORIAL_CONTEXT/);
 assert.match(route,/Michigan DNR Fall Birding/);
 assert.match(route,/U\.S\. Fish & Wildlife Service/);
 assert.match(route,/September and October as the best months for fall migratory birds/);
 assert.match(route,/Main Trail as good for warblers in spring and fall/);
 assert.match(route,/function editorialEvidence/);
 assert.match(route,/additiveEvidence:slot\.evidence/);
 assert.match(route,/Migration timing is not a live bird report/);
 assert.match(route,/Write 80 to 115 words that make the migration signal understandable/);
 assert.match(route,/noteSources:Object\.fromEntries/);
 assert.match(client,/data\.edition\?\.noteSources\?\.\[c\.id\]/);
 assert.match(client,/Context:/);
 assert.match(css,/\.card-source/);
});


test("Detroit Outdoors exposes safe Anthropic runtime diagnostics and production smoke coverage",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const workflow=read(".github/workflows/detroit-anthropic-smoke.yml");
 assert.match(route,/reason:"missing ANTHROPIC_API_KEY"/);
 assert.match(route,/anthropicKeyConfigured:Boolean\(process\.env\.ANTHROPIC_API_KEY\)/);
 assert.match(route,/commitSha:process\.env\.VERCEL_GIT_COMMIT_SHA/);
 assert.match(route,/writerModel:process\.env\.OUTDOORS_WRITER_MODEL\|\|WRITER_MODEL_DEFAULT/);
 assert.doesNotMatch(route,/anthropicKey:/);
 assert.match(workflow,/ANTHROPIC_API_KEY is not configured in the production runtime/);
 assert.match(workflow,/editorialMode/);
 assert.match(workflow,/cardDetails/);
 assert.match(workflow,/Per-card editorial detail/);
 assert.match(workflow,/missing rendered Haiku copy/);
 assert.match(workflow,/EXPECTED_SHA/);
 assert.match(workflow,/cardWriterCount/);
 assert.match(workflow,/acceptedCardCount/);
 assert.match(workflow,/Not every displayed card has accepted Haiku copy/);
 assert.match(workflow,/At least one displayed card is not using an Anthropic writer/);
});


test("Detroit Outdoors runs an independent Haiku job for every ranked card",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const cardNotes=mapped\.map/);
 assert.doesNotMatch(route,/\.slice\(0,MAX_EDITORIAL_CARD_NOTES\)/);
 assert.match(route,/async function writeCardEditorial/);
 assert.match(route,/Promise\.all\(\(plan\.cardNotes\|\|\[\]\)\.map/);
 assert.match(route,/This is an independent card-writing job/);
 assert.match(route,/Directly answer the assigned question/);
 assert.match(route,/const repairPrompt=/);
 assert.match(route,/The reviewer rejected the first draft/);
 assert.match(route,/cardWriters:cardResults\.map/);
 assert.match(route,/PLACE_CONTEXT/);
});

test("Detroit Outdoors gives every card verified place context before Haiku writes",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const PLACE_CONTEXT/);
 assert.match(route,/Belle Isle is a 985-acre island park/);
 assert.match(route,/more than 700 acres of forests, fields, fens and swamps/);
 assert.match(route,/contains 11 inland lakes/);
 assert.match(route,/offers more than 12 miles of trails/);
 assert.match(route,/state-designated dark sky preserves/);
 assert.match(route,/evidence\.contextFacts\.push\(\.\.\.placeContext\.facts\)/);
 assert.match(route,/evidence\.sources\.push\(\{label:placeContext\.sourceLabel,url:placeContext\.sourceUrl\}\)/);
});

test("Detroit Outdoors separates the desk writer from per-card writers",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/async function writeDeskEditorial/);
 assert.match(route,/Card explanations are written separately by independent card writers/);
 assert.match(route,/const deskPromise=writeDeskEditorial/);
 assert.match(route,/const cardPromise=Promise\.all/);
 assert.match(route,/const \[desk,cardResults\]=await Promise\.all/);
});


test("Detroit Outdoors does not collapse every birding card into migration context",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/function hasPlaceSpecificMigrationContext/);
 assert.match(route,/placeSpecificMigrationContext:hasPlaceSpecificMigrationContext\(candidate\)/);
 assert.match(route,/Use MIGRATION_CONTEXT only when placeSpecificMigrationContext is true/);
 assert.match(route,/Generic statewide migration timing alone is not enough/);
 assert.match(route,/hasMigrationSignal\(candidate\)&&hasPlaceSpecificMigrationContext\(candidate\)/);
});

test("Detroit Outdoors rejects unsupported bird specificity before JEV acceptance",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const BIRD_TERM_RULES=/);
 assert.match(route,/function unsupportedSpecificClaims/);
 assert.match(route,/mode:"deterministic-evidence-gate"/);
 assert.match(route,/Unsupported specific claim\(s\)/);
 assert.match(route,/Do not name a bird species or bird group unless that exact kind of bird appears/);
 assert.match(route,/Do not call migration peak, ideal, critical or exceptional/);
 assert.match(route,/Reject any named bird species or bird group that does not appear in additiveEvidence\.contextFacts/);
});


test("Detroit Outdoors gives Haiku an explicit evidence whitelist and constrained rescue passes",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const workflow=read(".github/workflows/detroit-anthropic-smoke.yml");
 assert.match(route,/function evidenceVocabulary/);
 assert.match(route,/allowedSpecificLanguage:evidenceVocabulary\(activeSlot\)/);
 assert.match(route,/hard whitelist for named bird groups and strength words/);
 assert.match(route,/attempt=3/);
 assert.match(route,/Write a restrained evidence-only card explanation/);
 assert.match(route,/45 to 70 words/);
 assert.match(route,/attempt=4/);
 assert.match(route,/previous drafts were rejected because they did not add enough specific decision value/);
 assert.match(route,/exactly two short sentences, 35 to 55 words total/);
 assert.match(route,/one concrete place-specific fact/);
 assert.match(route,/one seasonal or specialist fact/);
 assert.match(workflow,/reason:w&&w\.reason\|\|null/);
 assert.match(workflow,/detroit-outdoors\.js\?v=20260922d/);
});


test("Detroit Outdoors distinguishes explicit JEV reject from low-confidence reviewer fallback",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/if\(decision\.mode==="shared-harness-jev"\)/);
 assert.match(route,/accepted:decision\.choiceId==="ACCEPT"/);
 assert.match(route,/mode:"deterministic-evidence-review-fallback"/);
 assert.match(route,/deterministic evidence gate passed/);
});


test("Detroit Outdoors client bundle parses as JavaScript",()=>{
 const client=read("public/assets/detroit-outdoors.js");
 assert.doesNotThrow(()=>new Function(client));
 assert.doesNotMatch(client,/\\n const sourceLine/);
});


test("Detroit Outdoors cache-busts the live client bundle",()=>{
 const html=read("public/detroit-outdoors/index.html");
 const workflow=read(".github/workflows/detroit-anthropic-smoke.yml");
 assert.match(html,/detroit-outdoors\.js\?v=20260922d/);
 assert.match(workflow,/node --check \/tmp\/detroit-outdoors\.js/);
 assert.match(workflow,/public\/assets\/detroit-outdoors\.js/);
 assert.match(workflow,/public\/detroit-outdoors\/index\.html/);
});


test("Detroit Outdoors mixes reusable specialist engines into one hard-safe JEV candidate pool",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const engines=read("lib/detroit-outdoors/engines.js");
 assert.match(route,/require\("\.\/engines\.js"\)/);
 assert.match(route,/loadSpecialistEngineStates\(\)/);
 assert.match(route,/sourceEngine:"park-weather"/);
 assert.match(route,/verifiedEvidence/);
 assert.match(route,/candidateCountByEngine:countByEngine\(safePool\)/);
 assert.match(route,/selectedEngineDiversity/);
 assert.match(route,/diagnostics:\{\s*opportunityEngines:opportunityEngineDiagnostics/);
 assert.match(engines,/https:\/\/chrisizworski\.com\/api\/buoys/);
 assert.match(engines,/https:\/\/chrisizworski\.com\/api\/aurora/);
 assert.match(engines,/api\.weather\.gov\/alerts\/active\/zone\/LCZ460/);
 assert.match(engines,/function waterCandidate/);
 assert.match(engines,/function nightSkyCandidate/);
 assert.match(engines,/function fallColorCandidates/);
 assert.match(engines,/function sunsetPhotographyCandidate/);
 assert.match(engines,/function freighterWatchingCandidate/);
 assert.match(engines,/api\/freighter-ais/);
 assert.match(route,/Detroit Riverfront Conservancy/);
 assert.match(route,/sunset-photography/);
 assert.match(route,/great-lakes-ais/);
 assert.match(engines,/function hardGateSpecialistCandidates/);
 assert.match(engines,/function dedupeMixedPool/);
 assert.match(engines,/WATER_HARD_ALERT/);
 assert.match(engines,/Required NOAA\/NDBC water observation is older than four hours/);
 assert.match(engines,/Regional fall-color modeling cannot establish exact foliage at a specific park/);
 assert.match(engines,/modeled planning signals, not a visibility guarantee/);
});

test("Detroit Outdoors seals normalized specialist evidence before Haiku and review",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/for\(const item of candidate\.verifiedEvidence\|\|\[\]\)/);
 assert.match(route,/Opportunity time window:/);
 assert.match(route,/Why now:/);
 assert.match(route,/Uncertainty:/);
 assert.match(route,/sourceEngine:candidate\.sourceEngine/);
 assert.match(route,/opportunityType:candidate\.opportunityType/);
 assert.match(route,/verifiedEvidence:candidate\.verifiedEvidence/);
 assert.match(route,/specialistHandoff:candidate\.specialistHandoff/);
});


test("Detroit Outdoors propagates specialist hard vetoes over legacy equivalents",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const engines=read("lib/detroit-outdoors/engines.js");
 assert.match(route,/dedupeMixedPool\(parkSafePool,specialistGate\.safe,specialistGate\.rejected\)/);
 assert.match(engines,/vetoedLegacy/);
 assert.match(engines,/legacyId:normalized\.id/);
 assert.match(engines,/specialistId:veto\.id/);
 assert.match(engines,/Required NWS park-point alert feed is unavailable/);
 assert.match(engines,/Required NWS alert feed is unavailable/);
});


test("Detroit Outdoors can surface non-park Riverfront opportunities without changing the card UI",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const engines=read("lib/detroit-outdoors/engines.js");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(engines,/id:"detroit-riverfront"/);
 assert.match(engines,/sourceEngine:"sunset-photography"/);
 assert.match(engines,/sourceEngine:"great-lakes-ais"/);
 assert.match(engines,/opportunityType:"sunset-photography"/);
 assert.match(engines,/opportunityType:"live-freighter-passage"/);
 assert.match(route,/photography:"Sunset \/ photography window"/);
 assert.match(route,/"freighter-watching":"Live freighter window"/);
 assert.match(route,/The Detroit Riverwalk is a public riverfront corridor stretching almost five miles/);
 assert.match(client,/function renderCard/);
 assert.doesNotMatch(client,/sunset-photography.*special-case|great-lakes-ais.*special-case/);
});


test("Detroit Outdoors uses the most valuable top-line space for the live board, not product explanation",()=>{
 const html=read("public/detroit-outdoors/index.html");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(html,/id="live-headline"/);
 assert.match(html,/id="live-dek"/);
 assert.match(html,/Detroit Outdoors Today/);
 assert.doesNotMatch(html,/A live look at the few outings that make sense today/);
 assert.doesNotMatch(html,/Weather, active NWS hazards, seasonal timing and specialist checks are compared in the background/);
 const top=html.slice(html.indexOf('<main class="shell">'),html.indexOf('<section class="hero"'));
 assert.doesNotMatch(top,/Built and published by/);
 assert.match(html,/Sources, safety rules, and how the ranking works[\s\S]*Built and published by/);
 assert.match(client,/function renderTopline/);
 assert.match(client,/renderTopline\(data\.opportunities\|\|\[\]\)/);
 assert.match(client,/is on the Detroit River right now/);
 assert.match(client,/rest\.join\(" · "\)/);
});

test("Detroit Outdoors dynamic headline understands specialist opportunity types",()=>{
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(client,/engine==="great-lakes-ais"/);
 assert.match(client,/engine==="sunset-photography"/);
 assert.match(client,/engine==="great-lakes-water"/);
 assert.match(client,/engine==="night-sky-aurora"/);
 assert.match(client,/engine==="fall-color-phenology"/);
});


test("Detroit Outdoors lets JEV reassign a repeatedly rejected editorial job instead of weakening review",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/async function recoverEditorialSlot/);
 assert.match(route,/originally assigned Detroit Outdoors card-writing job has repeatedly failed editorial review/);
 assert.match(route,/Choose a DIFFERENT editorial job/);
 assert.match(route,/attempt=5/);
 assert.match(route,/activeSlot=await recoverEditorialSlot\(candidate,slot,fallSnapshot\)/);
 assert.match(route,/The original editorial job was repeatedly rejected\. JEV has reassigned this card to a different job/);
 assert.match(route,/review=await reviewEditorialNote\(candidate,activeSlot,note\)/);
 assert.match(route,/reassignedFrom:activeSlot\.reassignedFrom\|\|null/);
});

test("Detroit Outdoors exposes the actual reassigned treatment and evidence sources",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const actualPlacements=\[\]/);
 assert.match(route,/noteSources\[result\.candidateId\]=result\.sources/);
 assert.match(route,/treatment:result\.treatment\|\|planned&&planned\.treatment/);
 assert.match(route,/noteSources:Object\.keys\(editorial\.noteSources\|\|\{\}\)\.length\?editorial\.noteSources/);
 assert.match(route,/placements:editorial\.actualPlacements&&editorial\.actualPlacements\.length\?editorial\.actualPlacements/);
});

test("Detroit Outdoors makes the hero image a JEV board-level decision with freshness memory",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const APPROVED_BOARD_IMAGES = \[/);
 assert.match(route,/belle-isle-skyline-cc-by-sa-4/);
 assert.match(route,/detroit-riverwalk-cc-by-4/);
 assert.match(route,/huron-river-ann-arbor-cc-by-3/);
 assert.match(route,/pointe-mouillee-public-domain/);
 assert.match(route,/sterling-state-park-cc-by-3/);
 assert.match(route,/function imagePoolForBoard/);
 assert.match(route,/function imageCycleKey/);
 assert.match(route,/detroit-outdoors:image-history:v2/);
 assert.match(route,/cached-jev-image/);
 assert.match(route,/Choose the single best hero file photo for today's Detroit Outdoors board/);
 assert.match(route,/This is a board-level visual decision, not a lead-card illustration/);
 assert.match(route,/recentlyUsedImageIds/);
 assert.match(route,/Relevance is more important than novelty/);
 assert.match(route,/prefer one that is not in recentlyUsedImageIds/i);
 assert.match(route,/judgeImage\(hold\?\[\]:ranked\)/);
 assert.match(route,/pool:imageResult\.pool\|\|\[\]/);
 assert.match(route,/recentIds:imageResult\.recentIds\|\|\[\]/);
 assert.doesNotMatch(route,/async function judgeImage\(lead\)/);
});

test("Detroit image selection cannot take down the live editorial response",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/async function judgeImageUnsafe\(candidates\)/);
 assert.match(route,/async function judgeImage\(candidates\)/);
 assert.match(route,/return await judgeImageUnsafe\(candidates\)/);
 assert.match(route,/mode:"deterministic-image-fallback"/);
 assert.match(route,/Image selector runtime fallback:/);
});



test("Detroit hero image loads independently from board and editorial",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 const html=read("public/detroit-outdoors/index.html");
 assert.match(route,/if\(query\.get\("mode"\)==="image"\)/);
 assert.match(route,/mode:"hero-image"/);
 assert.match(route,/const imageResult=await judgeImage\(hold\?\[\]:ranked\)/);
 assert.match(route,/Hero image is loaded independently from mode=image/);
 assert.match(client,/async function loadHeroImage\(\)/);
 assert.match(client,/requestBoard\("\/api\/detroit-outdoors\?mode=image"\)/);
 assert.match(client,/media\.dataset\.independentImage="1"/);
 assert.match(client,/loadHeroImage\(\);\s*enrichEditorial\(\);/);
 assert.match(client,/enriched && media\.dataset\.independentImage!=="1"/);
 assert.match(html,/detroit-outdoors\.js\?v=20260922d/);
});
