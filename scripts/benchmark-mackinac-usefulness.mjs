// Experiential usefulness benchmark for /mackinac-island/. See docs/mackinac-usefulness-loss.md.
// Drives the real page as eight personas on a 390px phone and scores what is on screen.
//   node scripts/benchmark-mackinac-usefulness.mjs [--base http://localhost:8790] [--label name] [--only id]
import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ["playwright", "/home/claude/.npm-global/lib/node_modules/playwright"]) {
    try { return require(p); } catch {}
  }
  throw new Error("Playwright is required: npm i -g playwright");
}
const {chromium} = loadPlaywright();
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const LABEL = arg("--label", "run");
const ONLY = arg("--only", null);
let BASE = arg("--base", null);

const WEIGHTS = {react: 20, correct: 20, ask: 15, clarity: 15, distinct: 10, continuity: 8, speed: 5, stability: 4, truth: 3};
const JARGON = /\b(JEV|deterministic|vector|archetypes?|harness|bounded|classif(y|ier|ication)|visitor profile|surface|candidates?|loss function|persona)\b/gi;
const clamp = x => Math.max(0, Math.min(1, x));
const DATE = "2026-10-03";

const toMin = s => { const m = String(s || "").match(/(\d{1,2}):(\d{2})\s*([AP]M)/i); if (!m) return null; let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return h * 60 + +m[2]; };
const hhmm = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const has = re => t => re.test(t);
function ferryAtLeast(leave, hours) {
  return (t, d) => { const f = toMin(d.primaryRec); return f != null && f >= hhmm(leave) + hours * 60; };
}

const PERSONAS = [
  {id: "detroit-first", answers: {trip_duration: "day", party: "couple", trip_vision: ["icons"], trip_loss: "rushed"}, origin: "Detroit, MI", leave: "06:00",
    expect: [["Mackinaw City port", has(/mackinaw city/i)], ["ferry reachable (≥3h after leaving)", ferryAtLeast("06:00", 3)], ["return ferry shown", has(/(ferry back|head back|return)[\s\S]{0,40}\d{1,2}:\d{2}/i)]]},
  {id: "gr-family", answers: {trip_duration: "day", party: "family-young", trip_vision: ["kids"], trip_loss: "walking"}, origin: "Grand Rapids, MI", leave: "07:00",
    expect: [["kids/family pacing", has(/\bkids?\b|family|children|little ones/i)], ["low-walking movement", has(/carriage|taxi|less walking|flat|short walk|easy walk/i)], ["ferry reachable (≥3h)", ferryAtLeast("07:00", 3)]]},
  {id: "tc-couple-night", answers: {trip_duration: "one-night", party: "couple", trip_vision: ["relaxed", "food-shopping"], trip_loss: "crowds"}, origin: "Traverse City, MI", leave: "09:00",
    expect: [["overnight shape", has(/overnight|arrival day|departure day|day 1|day 2|night/i)], ["dinner", has(/dinner/i)], ["ferry reachable (≥2h)", ferryAtLeast("09:00", 2)]]},
  {id: "lansing-bikes", answers: {trip_duration: "day", party: "adults-friends", trip_vision: ["biking"], trip_loss: "weather"}, origin: "Lansing, MI", leave: "06:30",
    expect: [["bike loop", has(/m-185|bike|biking|loop/i)], ["ferry reachable (≥3h)", ferryAtLeast("06:30", 3)]]},
  {id: "saginaw-multigen", answers: {trip_duration: "day", party: "multigenerational", trip_vision: ["history"], trip_loss: "walking"}, origin: "Saginaw, MI", leave: "07:00",
    expect: [["Fort / history", has(/fort mackinac|\bfort\b|history/i)], ["carriage / taxi", has(/carriage|taxi/i)], ["ferry reachable (≥2.5h)", ferryAtLeast("07:00", 2.5)]]},
  {id: "marquette-solo", answers: {trip_duration: "day", party: "solo", trip_vision: ["scenery"], trip_loss: "crowds"}, origin: "Marquette, MI", leave: "06:00",
    expect: [["St. Ignace port", has(/st\.? ignace/i)], ["scenery", has(/scen|photo|view|arch rock|shore/i)]]},
  {id: "baycity-late", answers: {trip_duration: "day", party: "couple", trip_vision: ["icons"], trip_loss: "missing"}, origin: "Bay City, MI", leave: "11:30",
    expect: [["ferry reachable (≥2h after 11:30)", ferryAtLeast("11:30", 2)], ["Mackinaw City port", has(/mackinaw city/i)]]},
  {id: "chicago-teens", answers: {trip_duration: "two-three", party: "family-teens", trip_vision: ["biking", "history"], trip_loss: "missing"}, origin: "Chicago, IL", leave: "07:00",
    expect: [["multiple days", has(/day 2|day 3|full (island )?day|nights?/i)], ["bike", has(/bike|biking|m-185|loop/i)], ["history / Fort", has(/fort|history/i)]]}
];

// ---------------------------------------------------------------- page helpers
const PLAN_SEL = ".hero-lede, .hero-ticket, #planner, #tripShapePanel, #tripProfileCard, #trip-intake, #liveBar";
async function snapshot(page) {
  await page.evaluate(sel => {
    window.__snap = new Map();
    document.querySelectorAll(sel).forEach(root => root.querySelectorAll("*").forEach(el => {
      if (el.children.length === 0 && el.textContent.trim()) window.__snap.set(el, el.textContent.trim());
    }));
    window.__snapKeys = new Set(window.__snap.keys());
  }, PLAN_SEL);
}
async function reaction(page) {
  await page.waitForTimeout(4000);
  return page.evaluate(sel => {
    const inView = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== "hidden"; };
    let anyChange = false, visibleChange = false;
    document.querySelectorAll(sel).forEach(root => root.querySelectorAll("*").forEach(el => {
      if (el.children.length) return;
      const now = el.textContent.trim(); if (!now) return;
      const before = window.__snap.get(el);
      const changed = before === undefined ? !window.__snapKeys.has(el) : before !== now;
      if (!changed) return;
      if (/^(Question \d+ of \d+)$/.test(now)) return;           // progress counters are not plan changes
      if (el.closest("#trip-intake") && !el.closest("#tripProfileCard, #intakePreview")) return; // the next question is not a plan change
      if (el.closest(".profile-logistics, #profileLogisticsStatus, label")) return;       // the form the visitor is typing in
      anyChange = true; if (inView(el)) visibleChange = true;
    }));
    const t = document.getElementById("planToast");
    const toast = !!t && !t.hidden && t.classList.contains("show");
    return {anyChange, visibleChange, toast};
  }, PLAN_SEL);
}
async function planText(page) {
  return page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => e.innerText).join("\n"), ".hero-lede, .hero-ticket, #planner, #tripShapePanel");
}
async function signature(page) {
  return page.evaluate(() => {
    // Stops + ferry, as the spec defines it: the plan, not the boilerplate around it.
    const items = new Set();
    document.querySelectorAll("#itinerary li strong, #tripShapeDays strong, #tripShapeDays li, #tripDays strong").forEach(e => { const t = e.textContent.trim().toLowerCase(); if (t) items.add(t); });
    const rec = document.getElementById("primaryRec")?.innerText || "";
    const f = rec.match(/take the ([\d:]+ [ap]m) from ([a-z. ]+)/i); if (f) items.add(`ferry ${f[1]} ${f[2]}`.toLowerCase());
    const back = document.getElementById("heroReturn")?.textContent.trim(); if (back) items.add(`back ${back}`.toLowerCase());
    return [...items];
  });
}

async function tap(page, locator, log, what) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await snapshot(page);
  await locator.click();
  const r = await reaction(page);
  log.push({what, ...r});
}

async function runPersona(browser, base, p) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: true, isMobile: true});
  await ctx.addInitScript(() => {
    window.__cls = 0; window.__lastInput = 0;
    addEventListener("pointerdown", () => { window.__lastInput = performance.now(); }, true);
    addEventListener("keydown", () => { window.__lastInput = performance.now(); }, true);
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput && e.startTime - window.__lastInput > 5000) window.__cls += e.value; }).observe({type: "layout-shift", buffered: true});
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(base + "/mackinac-island/", {waitUntil: "domcontentloaded"});
  let speedMs = 15000;
  try {
    await page.waitForFunction(() => { const s = document.querySelector("#primaryRec strong"); return s && /\d{1,2}:\d{2}/.test(s.textContent); }, null, {timeout: 15000});
    speedMs = Date.now() - t0;
  } catch {}
  await page.waitForTimeout(800);

  // First screen: what does a visitor see before scrolling?
  const first = await page.evaluate(jargonSrc => {
    const inView = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none"; };
    const rec = document.getElementById("primaryRec");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let words = 0;
    while (walker.nextNode()) { const n = walker.currentNode; const el = n.parentElement; if (el && inView(el) && n.textContent.trim()) words += n.textContent.trim().split(/\s+/).length; }
    const ctas = [...document.querySelectorAll("a.btn, button.btn, button.intake-option")].filter(inView).length;
    const q = document.querySelector("#heroStart .start-chip, #intakeOptions button");
    const qScreens = q ? (q.getBoundingClientRect().top + scrollY) / innerHeight : 9;
    const jargon = (document.body.innerText.match(new RegExp(jargonSrc, "gi")) || []).length;
    return {answerVisible: !!rec && inView(rec) && /\d{1,2}:\d{2}/.test(rec.textContent), words, ctas, qScreens, jargon};
  }, JARGON.source);

  const log = [];
  // Where from and when: use the page's own one-tap chips if it offers them.
  if (await page.locator("#heroStart").isVisible().catch(() => false)) {
    const city = page.locator(`#heroStart [data-city="${p.origin}"]`);
    if (await city.count()) await tap(page, city, log, "start city chip");
    else {
      await tap(page, page.locator("#heroStart [data-city-other]"), log, "start city other");
      const inp = page.locator("#startCityInput"); await snapshot(page); await inp.fill(p.origin); await inp.press("Enter");
      log.push({what: "start city typed", ...(await reaction(page))});
    }
    const leave = page.locator(`#heroStart [data-leave="${p.leave}"]`);
    if (await leave.count()) await tap(page, leave, log, "start leave chip");
    else {
      await tap(page, page.locator("#heroStart [data-leave-other]"), log, "start leave other");
      const inp = page.locator("#startLeaveInput"); await snapshot(page); await inp.fill(p.leave); await inp.press("Enter");
      log.push({what: "start leave typed", ...(await reaction(page))});
    }
  }
  // Answer the questions the page asks, by tapping what a visitor would tap.
  for (let guard = 0; guard < 8; guard++) {
    const qid = await page.evaluate(() => {
      const work = document.getElementById("intakeWork"); if (!work || work.hidden) return null;
      const opts = [...document.querySelectorAll("#intakeOptions [data-intake-value]")].map(b => b.dataset.intakeValue);
      return opts.length ? opts : null;
    });
    if (!qid) break;
    const key = Object.keys(p.answers).find(k => [].concat(p.answers[k]).some(v => qid.includes(v)));
    if (!key) { log.push({what: "unanswerable question", anyChange: false, visibleChange: false, toast: false}); break; }
    const values = [].concat(p.answers[key]);
    for (const v of values) {
      const opt = page.locator(`#intakeOptions [data-intake-value="${v}"]`);
      if (!(await opt.count())) { log.push({what: `${key}=${v} (not offered)`, anyChange: false, visibleChange: false, toast: false, notOffered: true}); break; }
      await tap(page, opt, log, `${key}=${v}`);
    }
    if (Array.isArray(p.answers[key])) {
      const cont = page.locator("#intakeContinue");
      if (await cont.isVisible()) await tap(page, cont, log, `${key}:continue`);
    }
  }
  await page.waitForTimeout(1500);
  // Optional extra question: a real visitor answers it if it's there.
  const adaptive = page.locator("#adaptiveQuestion [data-adaptive-value]").first();
  if (await adaptive.isVisible().catch(() => false)) await tap(page, adaptive, log, "adaptive");

  // Logistics, if the page asks for them.
  const fields = [["#profileTripDate", DATE], ["#profileOriginInput", p.origin], ["#profileDepartTime", p.leave]];
  let asked = false;
  for (const [sel, val] of fields) {
    const loc = page.locator(sel);
    if (await loc.isVisible().catch(() => false) && !(await loc.inputValue().catch(() => ""))) {
      asked = true;
      await loc.scrollIntoViewIfNeeded(); await snapshot(page);
      await loc.fill(val); await loc.dispatchEvent("change");
      const r = await reaction(page); log.push({what: sel, ...r});
    }
  }
  const build = page.locator("#profileBuildTrip");
  const planReady = await page.evaluate(() => document.body.classList.contains("mackinac-plan-ready"));
  if (!planReady && await build.isVisible().catch(() => false)) await tap(page, build, log, "build");
  await page.waitForTimeout(3000);

  const text = await planText(page);
  const primaryRec = await page.evaluate(() => document.getElementById("primaryRec")?.innerText || "");
  const d = {primaryRec};
  const checks = p.expect.map(([label, fn]) => ({label, pass: !!fn(text, d)}));
  const sig = await signature(page);
  const truth = await page.evaluate(() => /updated\s+\d{1,2}:\d{2}/i.test(document.body.innerText));
  const cls = await page.evaluate(() => window.__cls);
  const jargonAfter = await page.evaluate(src => (document.body.innerText.match(new RegExp(src, "gi")) || []), JARGON.source);

  // Does the rest of the site follow?
  await page.goto(base + "/mackinac-island/where-to-stay/", {waitUntil: "domcontentloaded"});
  await page.waitForTimeout(4500);
  const cont = await page.evaluate(() => {
    const strip = document.querySelector(".trip-strip .trip-context");
    const stripOn = !!strip && getComputedStyle(strip).display !== "none" && !/continues here/i.test(strip.innerText);
    const focus = !!document.querySelector(".platform-focus-card:not(.degraded)");
    const top = document.querySelector(".catalog-grid [data-place-id]")?.dataset.placeId || null;
    return {stripOn, focus, top};
  });
  await ctx.close();

  const taps = log.length;
  const wasted = log.filter(x => !x.anyChange).length;
  const reactScores = log.map(x => x.visibleChange ? 0 : x.toast ? 0.4 : 1);
  const L = {
    react: reactScores.length ? reactScores.reduce((a, b) => a + b, 0) / reactScores.length : 1,
    correct: checks.filter(c => !c.pass).length / checks.length,
    ask: clamp(0.6 * clamp((taps - 4) / 10) + 0.4 * (taps ? wasted / taps : 1)),
    clarity: [first.answerVisible ? 0 : 1, clamp(Math.max(first.jargon, jargonAfter.length) / 5), clamp((first.words - 90) / 150), clamp((first.ctas - 2) / 4), clamp((first.qScreens - 1) / 2)].reduce((a, b) => a + b, 0) / 5,
    continuity: ((cont.stripOn ? 0 : 1) + (cont.focus ? 0 : 1)) / 2,
    speed: clamp((speedMs - 1500) / 4500),
    stability: clamp(cls / 0.25),
    truth: truth ? 0 : 1
  };
  return {id: p.id, L, detail: {speedMs, first, taps, wasted, log, checks, primaryRec: primaryRec.slice(0, 160), cls: +cls.toFixed(3), jargon: [...new Set(jargonAfter.map(x => x.toLowerCase()))], continuity: cont}, sig};
}

function jaccard(a, b) { const A = new Set(a), B = new Set(b); const i = [...A].filter(x => B.has(x)).length; return i / (A.size + B.size - i || 1); }

async function main() {
  let server = null;
  if (!BASE) {
    BASE = "http://localhost:8791";
    server = spawn(process.execPath, ["scripts/dev-mackinac-server.mjs", "8791"], {stdio: "ignore"});
    await new Promise(r => setTimeout(r, 1500));
  }
  const browser = await chromium.launch();
  const results = [];
  for (const p of PERSONAS.filter(x => !ONLY || x.id === ONLY)) {
    try { results.push(await runPersona(browser, BASE, p)); console.error(`  ${p.id} done`); }
    catch (e) { console.error(`  ${p.id} failed: ${e.message}`); results.push({id: p.id, L: {react: 1, correct: 1, ask: 1, clarity: 1, continuity: 1, speed: 1, stability: 1, truth: 1}, detail: {error: e.message}, sig: []}); }
  }
  await browser.close();
  if (server) server.kill();

  const sims = [];
  for (let i = 0; i < results.length; i++) for (let j = i + 1; j < results.length; j++) sims.push(jaccard(results[i].sig, results[j].sig));
  const meanSim = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
  const terms = {};
  for (const k of Object.keys(WEIGHTS)) {
    terms[k] = k === "distinct" ? clamp((meanSim - 0.35) / 0.65) : results.reduce((a, r) => a + r.L[k], 0) / results.length;
  }
  const W = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const loss = Object.entries(WEIGHTS).reduce((a, [k, w]) => a + w * terms[k], 0) / W;
  const contrib = Object.fromEntries(Object.entries(WEIGHTS).map(([k, w]) => [k, +(w * terms[k] / W).toFixed(4)]));
  const out = {label: LABEL, at: new Date().toISOString(), base: BASE, loss: +loss.toFixed(4), terms: Object.fromEntries(Object.entries(terms).map(([k, v]) => [k, +v.toFixed(3)])), contribution: contrib, meanPlanSimilarity: +meanSim.toFixed(3), personas: results.map(({id, L, detail}) => ({id, L: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, +v.toFixed(3)])), ...detail}))};
  const file = "benchmarks/mackinac-usefulness.json";
  let history = {};
  try { history = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  history.runs = [...(history.runs || []).filter(r => r.label !== LABEL), {label: LABEL, at: out.at, loss: out.loss, terms: out.terms, contribution: contrib}];
  history.latest = out;
  fs.writeFileSync(file, JSON.stringify(history, null, 2) + "\n");
  console.log(JSON.stringify({label: LABEL, loss: out.loss, terms: out.terms, contribution: contrib, meanPlanSimilarity: out.meanPlanSimilarity}, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
