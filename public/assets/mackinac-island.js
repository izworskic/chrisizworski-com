// Mackinac Island Trip Planner (My Trip), Sep 29 2026.
//
// One straight line (Chris, same day: "You begin by asking questions then you build an
// itinerary then you ask for more info? That's odd"):
//   1. one question: where are you driving from? No plan is shown before that answer.
//   2. the plan: a one-line summary of the trip it assumed (tap a word to change it) and the
//      day sheet from /api/mackinac-island?format=sheet, redrawn in place on every change.
// Nothing after the plan asks for anything.
(() => {
  "use strict";
  const API = "/api/mackinac-island";
  const ORIGIN_API = "/api/mackinac-origin";
  const PROFILE_API = "/api/mackinac-profile";
  const STORE = "mackinac-day-sheet-v1";
  const PLAN_KEY = "mackinac-trip-plan-v1";
  const PROFILE_KEY = "mackinac-trip-profile-v1";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const picks = { stay: $("pickStay"), who: $("pickWho"), from: $("pickFrom"), day: $("pickDay"), leave: $("pickLeave"), go: $("pickGo") };
  const ask = $("askFromSelect");
  if (!picks.stay || !$("sheet") || !ask) return;
  // The first question offers the same measured city list as the trip line.
  ask.insertAdjacentHTML("beforeend", picks.from.innerHTML);

  const DEFAULTS = { stay: "day", who: "couple", from: "", day: "", leave: "06:00", go: "foot" };
  const ADULTS = { solo: 1, couple: 2, group: 4, "family-young": 2, "family-teens": 4, grandparents: 4 };
  // Links from the guide pages say what the visitor was reading about.
  const INTENTS = { "with-kids": { who: "family-young" }, "two-day": { stay: "1" }, stay: { stay: "1" }, "limited-walking": { go: "carriage" }, "bike-day": { go: "bike" }, "day-trip": { stay: "day" } };
  let state = { ...DEFAULTS };
  let custom = null;        // a city found through the origin lookup: {name, m, s}
  let seq = 0;
  let lastSheet = null;
  let profileTimer = null;

  function track(name, params = {}) { try { if (typeof window.gtag === "function") window.gtag("event", name, params); } catch {} }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } }

  // Days are the Island's days (America/Detroit), whatever the device clock says.
  function islandToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  function addDays(date, n) { const [y, m, d] = date.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10); }
  function dayWords(date, today) {
    if (date === today) return "today";
    if (date === addDays(today, 1)) return "tomorrow";
    const [y, m, d] = date.split("-").map(Number);
    return "on " + new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  }
  function fillDays() {
    const today = islandToday();
    const days = [];
    for (let i = 1; i <= 45; i++) days.push(addDays(today, i));
    if (state.day && !days.includes(state.day)) days.push(state.day);
    picks.day.innerHTML = `<option value="">today</option>` + days.sort().map(d => `<option value="${d}">${esc(dayWords(d, today))}</option>`).join("") + `<option value="__date">another date…</option>`;
  }
  function cleanState() {
    const today = islandToday();
    const has = (el, v) => [...el.options].some(o => o.value === v);
    if (!["day", "1", "2", "3"].includes(state.stay)) state.stay = DEFAULTS.stay;
    if (!has(picks.who, state.who)) state.who = DEFAULTS.who;
    if (!has(picks.leave, state.leave)) state.leave = DEFAULTS.leave;
    if (!has(picks.go, state.go)) state.go = DEFAULTS.go;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.day || "") || state.day <= today) state.day = "";
    if (state.from && !originFor(state.from)) state.from = "";
  }

  function originFor(value) {
    if (!value) return null;
    const opt = [...picks.from.options].find(o => o.value === value && o.dataset.m);
    if (opt) return { name: value, m: Number(opt.dataset.m), s: Number(opt.dataset.s) };
    if (custom && custom.name === value) return custom;
    return null;
  }
  function addCustom(c) {
    custom = c;
    for (const sel of [picks.from, ask]) {
      const group = sel.querySelector('optgroup[label="Somewhere else"]');
      group.querySelectorAll("option[data-custom]").forEach(o => o.remove());
      const opt = document.createElement("option");
      opt.value = c.name; opt.textContent = c.name.replace(/,\s*MI$/, ""); opt.dataset.custom = "1";
      if (Number.isFinite(c.m)) opt.dataset.m = c.m;
      if (Number.isFinite(c.s)) opt.dataset.s = c.s;
      group.prepend(opt);
    }
  }
  // Ask until there's a starting city; after that, show the plan.
  function setMode() {
    const planning = Boolean(state.from);
    document.documentElement.classList.toggle("mk-plan", planning);
    if (!planning) { ask.value = ""; $("sheet").setAttribute("aria-busy", "true"); }
  }

  function sync() {
    for (const [key, el] of Object.entries(picks)) {
      const value = state[key] ?? "";
      if ([...el.options].some(o => o.value === value)) el.value = value;
      const label = el.closest(".pick");
      label.querySelector(".pick-text").textContent = el.selectedOptions[0]?.textContent || "";
    }
  }
  function flash(key) {
    const label = picks[key]?.closest(".pick"); if (!label) return;
    label.classList.remove("changed"); void label.offsetWidth; label.classList.add("changed");
  }

  function request() {
    const p = new URLSearchParams({ format: "sheet", go: state.go, who: state.who, depart_not_before: state.leave });
    if (state.stay === "day") p.set("trip", "day-trip"); else { p.set("trip", "overnight"); p.set("nights", state.stay); }
    if (state.day) p.set("trip_date", state.day);
    const o = originFor(state.from);
    if (o) {
      const routes = [["Mackinaw City", o.m], ["St. Ignace", o.s]].filter(([, n]) => Number.isFinite(n)).sort((a, b) => a[1] - b[1]);
      p.set("origin_name", o.name);
      if (Number.isFinite(o.m)) p.set("origin_mackinaw_minutes", String(o.m));
      if (Number.isFinite(o.s)) p.set("origin_st_ignace_minutes", String(o.s));
      if (routes.length) { p.set("origin_preferred_port", routes[0][0]); p.set("origin_drive_minutes", String(routes[0][1])); }
    }
    return `${API}?${p}`;
  }

  async function plan(reason) {
    const id = ++seq;
    const sheet = $("sheet");
    sheet.setAttribute("aria-busy", "true");
    try {
      const r = await fetch(request(), { headers: { accept: "application/json" } });
      const data = await r.json();
      if (id !== seq) return;
      if (!r.ok || !data.day_sheet) throw new Error(data?.error || `HTTP ${r.status}`);
      // "today" became tomorrow because the good boats have gone: show that in the sentence.
      if (!state.day && data.planning_mode === "tomorrow" && data.target_date > islandToday()) { state.day = data.target_date; fillDays(); sync(); flash("day"); }
      render(data.day_sheet, data);
      remember(data.day_sheet);
      track("mackinac_sheet_built", { reason, stay: state.stay, go: state.go, who: state.who, has_origin: Boolean(state.from), stops: data.day_sheet.stop_count || 0 });
    } catch (err) {
      if (id !== seq) return;
      $("sheetHeadline").textContent = "The planner didn’t load";
      $("sheetSummary").textContent = "Check your connection and try again. Ferry schedules are also on the Ferries page.";
      $("sheetHeads").hidden = true;
      $("sheetDays").innerHTML = `<p class="sheet-empty"><button class="btn primary" type="button" id="retryBtn">Try again</button></p>`;
      $("retryBtn")?.addEventListener("click", () => plan("retry"));
      track("mackinac_sheet_failed", { reason: String(err?.message || err).slice(0, 80) });
    } finally {
      if (id === seq) sheet.setAttribute("aria-busy", "false");
    }
  }

  function render(s, data = {}) {
    lastSheet = s;
    const multi = s.days.length > 1;
    const notice = $("sheetNotice");
    notice.hidden = !s.notice; notice.textContent = s.notice || "";
    $("sheetDate").textContent = multi ? `${s.days[0].label} · ${s.days.length - 1} night${s.days.length === 2 ? "" : "s"}` : (s.date_label || "Your day");
    $("sheetHeadline").textContent = s.headline;
    $("sheetSummary").textContent = s.summary || "";
    const heads = $("sheetHeads");
    heads.hidden = !s.heads_up?.length;
    heads.innerHTML = (s.heads_up || []).map((h, i) => `<li class="head head-${esc(h.kind)}"><span>${esc(h.text)}</span>${h.action ? `<button type="button" data-head="${i}">${esc(h.action.label)}</button>` : ""}</li>`).join("");
    heads.querySelectorAll("[data-head]").forEach(b => b.addEventListener("click", () => {
      const action = s.heads_up[Number(b.dataset.head)]?.action;
      if (action?.set) { track("mackinac_heads_up_action", { action: action.label }); change(action.set, "heads-up"); }
    }));
    $("sheetDays").innerHTML = s.empty
      ? `<p class="sheet-empty">Try leaving earlier, another day, or a night on the Island.</p>`
      : s.days.map(d => `<section class="day">${multi ? `<h3 class="day-title">${esc(d.label)}<em>${esc(d.title || "")}</em></h3>` : ""}<ol class="rows">${d.rows.map(r => `<li class="row kind-${esc(r.kind)} fresh"><time>${esc(r.time)}</time><div class="row-body"><strong>${esc(r.title)}</strong><span>${esc(r.note)}</span></div></li>`).join("")}</ol></section>`).join("");
    const sources = (s.sources || []).filter(x => /^https:\/\//.test(x.url || ""));
    const updated = data.local_now?.time ? `Updated ${esc(data.local_now.time)} ET. ` : "";
    $("sheetTruth").innerHTML = `${updated}${esc(s.truth || "")}${sources.length ? ` Sources: ${sources.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join(", ")}.` : ""}`;
    $("sheetStatus").textContent = `Plan updated. ${s.headline}.`;
  }

  // The guide pages (Stay, Eat, Explore…) read the same saved trip.
  function remember(s) {
    save(STORE, { ...state, custom, saved_at: Date.now() });
    const o = originFor(state.from);
    if (!o || s.empty) return;
    const nights = state.stay === "day" ? 0 : Number(state.stay);
    save(PLAN_KEY, { plan: { trip_date: s.date, origin_text: o.name, trip: nights ? "overnight" : "day-trip", ...(nights ? { nights } : {}), adults: ADULTS[state.who] || 2, children: state.who === "family-young" ? 2 : 0, ...(s.leave_time ? { depart_at: s.leave_time } : {}) }, saved_at: Date.now() });
    clearTimeout(profileTimer);
    profileTimer = setTimeout(async () => {
      const answers = {
        trip_date: s.date,
        trip_duration: nights === 0 ? "day" : nights === 1 ? "one-night" : "two-three",
        party: { solo: "solo", couple: "couple", group: "adults-friends", "family-young": "family-young", "family-teens": "family-teens", grandparents: "multigenerational" }[state.who],
        trip_vision: state.who === "family-young" ? (state.go === "bike" ? ["kids", "biking"] : ["kids"]) : state.go === "bike" ? ["biking"] : state.go === "carriage" ? ["relaxed"] : ["icons"],
        trip_loss: state.go === "carriage" ? "walking" : "flexible"
      };
      try {
        const r = await fetch(PROFILE_API, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ answers, surface: "my-trip" }) });
        const d = await r.json();
        if (r.ok && d.profile) save(PROFILE_KEY, { answers: d.profile.answers || answers, profile: d.profile, saved_at: Date.now() });
      } catch {}
    }, 600);
  }

  function change(changes, source) {
    let changed = false;
    for (const [key, value] of Object.entries(changes)) {
      if (key in state && state[key] !== value) { state[key] = value; changed = true; flash(key); }
    }
    if (!changed) return;
    if ("day" in changes) fillDays();
    sync();
    setMode();
    track("mackinac_choice_changed", { source, choice: Object.keys(changes).join(",") });
    if (state.from) plan(source);
  }

  // ---------- Other city / another date ----------
  const other = $("otherCity"), otherInput = $("otherCityInput"), otherStatus = $("otherCityStatus");
  let otherMode = "city";
  function openOther(mode) {
    otherMode = mode;
    other.hidden = false;
    other.querySelector("label").textContent = mode === "city" ? "Another city or ZIP" : "Another date";
    otherInput.type = mode === "city" ? "text" : "date";
    otherInput.placeholder = mode === "city" ? "Toledo, OH or 49684" : "";
    otherInput.value = mode === "date" ? (state.day || addDays(islandToday(), 1)) : "";
    if (mode === "date") otherInput.min = addDays(islandToday(), 1);
    otherStatus.textContent = "";
    otherInput.focus();
  }
  ask.addEventListener("change", () => {
    if (ask.value === "__other") { ask.value = ""; openOther("city"); return; }
    if (ask.value) change({ from: ask.value }, "first-question");
  });
  for (const [key, el] of Object.entries(picks)) {
    el.addEventListener("change", () => {
      if (key === "from" && el.value === "__other") { el.value = state.from; sync(); openOther("city"); return; }
      if (key === "day" && el.value === "__date") { el.value = state.day; sync(); openOther("date"); return; }
      change({ [key]: el.value }, "sentence");
    });
  }
  $("tripForm").addEventListener("submit", async e => {
    e.preventDefault();
    const q = otherInput.value.trim();
    if (!q) { otherInput.focus(); return; }
    if (otherMode === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(q) || q <= islandToday()) { otherStatus.textContent = "Pick a date after today."; return; }
      other.hidden = true;
      change({ day: q }, "another-date");
      return;
    }
    otherStatus.textContent = "Finding it…";
    try {
      const r = await fetch(`${ORIGIN_API}?q=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
      const d = await r.json();
      const route = port => Number((d.routes || []).find(x => x.port === port)?.drive_minutes);
      const c = { name: d.origin?.label || q, m: route("Mackinaw City"), s: route("St. Ignace") };
      if (!r.ok || (!Number.isFinite(c.m) && !Number.isFinite(c.s))) throw new Error(d?.error || "not found");
      addCustom(c);
      other.hidden = true; otherStatus.textContent = "";
      change({ from: c.name }, "other-city");
    } catch {
      otherStatus.textContent = "Couldn’t find that place. Try a city and state, like “Toledo, OH”, or a ZIP code.";
    }
  });

  // ---------- Share ----------
  function shareUrl() {
    const u = new URL("/mackinac-island/", location.origin);
    for (const k of Object.keys(DEFAULTS)) if (state[k] && state[k] !== DEFAULTS[k]) u.searchParams.set(k, state[k]);
    if (!state.day && lastSheet?.date) u.searchParams.set("day", lastSheet.date);
    if (custom && custom.name === state.from) {
      if (Number.isFinite(custom.m)) u.searchParams.set("fm", custom.m);
      if (Number.isFinite(custom.s)) u.searchParams.set("fs", custom.s);
    }
    return u.toString();
  }
  $("shareBtn").addEventListener("click", async () => {
    const url = shareUrl();
    const text = lastSheet ? `${lastSheet.headline}. ${lastSheet.summary || ""}` : "Mackinac Island trip plan";
    if (navigator.share) {
      try { await navigator.share({ title: "Mackinac Island plan", text, url }); track("mackinac_share", { method: "native" }); return; }
      catch (e) { if (e?.name === "AbortError") return; }
    }
    const btn = $("shareBtn");
    try { await navigator.clipboard.writeText(url); btn.textContent = "Link copied"; track("mackinac_share", { method: "clipboard" }); }
    catch { window.prompt("Copy this link", url); }
    setTimeout(() => { btn.textContent = "Share this plan"; }, 2200);
  });

  // ---------- Start ----------
  function start() {
    const qs = new URLSearchParams(location.search);
    const saved = load(STORE);
    const shared = Object.keys(DEFAULTS).some(k => k !== "from" && qs.has(k)) || (qs.has("from") && !qs.has("intent"));
    if (shared) {
      for (const k of Object.keys(DEFAULTS)) if (qs.has(k)) state[k] = qs.get(k);
      if (qs.has("fm") || qs.has("fs")) addCustom({ name: state.from, m: qs.has("fm") ? Number(qs.get("fm")) : NaN, s: qs.has("fs") ? Number(qs.get("fs")) : NaN });
    } else if (saved) {
      for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === "string") state[k] = saved[k];
      if (saved.custom?.name) addCustom(saved.custom);
    } else {
      // A trip saved by the earlier version of this page still counts.
      const old = load(PLAN_KEY)?.plan;
      const text = String(old?.origin_text || "").trim();
      const match = text && [...picks.from.options].find(o => o.dataset.m && (o.value === text || o.value.split(",")[0] === text.split(",")[0]));
      if (match) state.from = match.value;
      if (old?.trip === "overnight") state.stay = String(Math.min(3, Math.max(1, Number(old.nights) || 1)));
    }
    if (!shared) {
      const intent = INTENTS[qs.get("intent")];
      if (intent) Object.assign(state, intent);
      if (qs.get("from")) state.from = qs.get("from");
    }
    fillDays();
    cleanState();
    fillDays();
    sync();
    setMode();
    if (qs.get("intent")) track("mackinac_planner_intent", { intent: qs.get("intent") });
    if (state.from) plan("load");
    else track("mackinac_first_question_shown", { intent: qs.get("intent") || "none" });
  }
  start();
})();
