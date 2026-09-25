(() => {
  "use strict";

  const FIVE = new Set(["first", "family", "couple", "christmas", "snow"]);
  const LEGACY = {
    attractions: { persona: "first", priority: "attractions" },
    "food-lights": { persona: "couple", priority: "food-lights", dinner: "1" },
    budget: { persona: "first", priority: "budget" },
    evening: { persona: "couple", start: "16:00", end: "22:00" },
    "full-day": { persona: "first", start: "09:30", end: "21:30" },
    "multi-day": { persona: "first" }
  };
  const GOALS = {
    first: [
      ["classic", "Classic first visit", "One daylight/elevation block plus a compact after-dark Gatlinburg block."],
      ["mountains", "Mountains first", "Protect daylight and elevation; downtown is the secondary block."],
      ["compact", "Keep it compact", "Stay mostly in the core and minimize movement."]
    ],
    family: [
      ["easy", "Easiest day", "Fewer stops, less walking and less backtracking."],
      ["weather-proof", "Weather-proof", "Build around a strong indoor anchor and shorter exposure."],
      ["lights", "Kids + lights", "Keep family energy for the after-dark seasonal block."]
    ],
    couple: [
      ["scenic", "Scenic + evening", "Use daylight for a view or mountain block, then transition cleanly into dinner/evening."],
      ["festive", "Festive date", "Make dinner and lights the center of the visit."],
      ["low-key", "Low-key", "Avoid a paid-attraction sprint and keep the evening calmer."]
    ],
    christmas: [
      ["lights", "Winter Magic", "Make the lights the reason for the evening, not an add-on."],
      ["event", "Holiday event", "Anchor the plan to a fixed published event when one exists."],
      ["low-crowd", "Christmas, fewer crowds", "Keep the holiday atmosphere while avoiding the biggest crowd magnets."]
    ],
    snow: [
      ["activity", "Snow activity", "Prioritize a real Ober snow-activity block when feasible."],
      ["tubing", "Tubing", "Tubing is the specific goal, not generic winter scenery."],
      ["natural", "Natural winter", "Favor scenic/NPS winter context and keep natural snow separate from Ober operations."]
    ]
  };
  const PERSONA_COPY = {
    first: ["First visit", "Show me the shape of Gatlinburg, not a checklist."],
    family: ["Family", "Protect energy, walking and weather resilience."],
    couple: ["Couple", "Build a coherent day-to-evening rhythm."],
    christmas: ["Christmas", "Make the seasonal reason for visiting control the plan."],
    snow: ["Snow", "Separate mountain operations, natural snow and road conditions."]
  };

  const $ = id => document.getElementById(id);
  const initial = new URLSearchParams(location.search);
  let kidsExplicit = initial.has("kids");

  function normalizeLegacyUrl() {
    const q = new URLSearchParams(location.search);
    const requested = q.get("persona");
    if (!requested || FIVE.has(requested)) return q;
    const mapped = LEGACY[requested] || { persona: "first" };
    q.set("persona", mapped.persona);
    for (const [key, value] of Object.entries(mapped)) if (key !== "persona" && value) q.set(key, value);
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
    return q;
  }

  function personaFromUrl() {
    const value = new URLSearchParams(location.search).get("persona");
    return FIVE.has(value) ? value : "first";
  }

  function makeSelect(id, label, options) {
    const wrap = document.createElement("label");
    wrap.className = "persona-question";
    wrap.innerHTML = `<span>${label}</span><select id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select>`;
    return wrap;
  }

  function installControls() {
    const row = $("personaRow");
    if (!row || $("personaQuestions")) return;
    row.innerHTML = Object.entries(PERSONA_COPY).map(([id, [label]]) => `<button class="persona${id === personaFromUrl() ? " active" : ""}" data-persona="${id}">${label}</button>`).join("");
    row.setAttribute("aria-label", "Who are you planning for?");

    const intro = document.createElement("div");
    intro.className = "persona-intro";
    intro.innerHTML = `<strong>Who are you planning for?</strong><span id="personaExplain"></span>`;
    row.parentNode.insertBefore(intro, row);

    const panel = document.createElement("div");
    panel.id = "personaQuestions";
    panel.className = "persona-questions";
    panel.setAttribute("aria-label", "Trip-shaping questions");
    panel.appendChild(makeSelect("personaGoal", "What should this trip optimize for?", []));
    panel.appendChild(makeSelect("personaPace", "Pace", [["easy", "Easy"], ["balanced", "Balanced"], ["packed", "Packed"]]));
    panel.appendChild(makeSelect("tripOrigin", "Starting situation", [["arriving", "Arriving for the visit"], ["downtown", "Already downtown"], ["outside", "Starting outside the core"]]));
    panel.appendChild(makeSelect("tripPriority", "Secondary priority", [["balanced", "Balanced"], ["attractions", "Paid attractions"], ["food-lights", "Food + lights"], ["budget", "Keep costs down"]]));
    const dinner = document.createElement("label");
    dinner.className = "persona-question persona-check";
    dinner.innerHTML = `<input id="dinnerAnchor" type="checkbox"><span>Make room for a real dinner block</span>`;
    panel.appendChild(dinner);
    row.insertAdjacentElement("afterend", panel);

    const q = normalizeLegacyUrl();
    $("personaPace").value = q.get("pace") || "balanced";
    $("tripOrigin").value = q.get("origin") || "arriving";
    $("tripPriority").value = q.get("priority") || "balanced";
    $("dinnerAnchor").checked = q.get("dinner") === "1";
    syncGoal(q.get("goal"));
  }

  function syncGoal(preferred = null) {
    const persona = personaFromUrl();
    const goal = $("personaGoal");
    const explanation = $("personaExplain");
    if (!goal) return;
    const options = GOALS[persona] || GOALS.first;
    const current = preferred || goal.value;
    goal.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    goal.value = options.some(([value]) => value === current) ? current : options[0][0];
    if (explanation) explanation.textContent = PERSONA_COPY[persona]?.[1] || PERSONA_COPY.first[1];
    document.body.dataset.gatlinburgPersona = persona;
  }

  function updateUrlFromControls() {
    const q = new URLSearchParams(location.search);
    q.set("persona", personaFromUrl());
    if ($("personaGoal")) q.set("goal", $("personaGoal").value);
    if ($("personaPace")) q.set("pace", $("personaPace").value);
    if ($("tripOrigin")) q.set("origin", $("tripOrigin").value);
    if ($("tripPriority")) q.set("priority", $("tripPriority").value);
    if ($("dinnerAnchor")?.checked) q.set("dinner", "1"); else q.delete("dinner");
    if (!kidsExplicit && String($("kids")?.value || "").replace(/\s/g, "") === "6,10") q.delete("kids");
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  }

  function extraQuery() {
    const q = new URLSearchParams();
    if ($("personaGoal")) q.set("goal", $("personaGoal").value);
    if ($("personaPace")) q.set("pace", $("personaPace").value);
    if ($("tripOrigin")) q.set("origin", $("tripOrigin").value);
    if ($("tripPriority")) q.set("priority", $("tripPriority").value);
    if ($("dinnerAnchor")?.checked) q.set("dinner", "1");
    return q;
  }

  function updateResultMeta(data) {
    if (!data || !data.ok) return;
    const badge = $("liveState");
    if (badge && data.decisionHealth) {
      badge.textContent = data.mode === "preseason" ? "PRE-SEASON" : data.decisionHealth.label || "PLAN READY";
      badge.className = `state-pill${data.decisionHealth.state === "check" ? " degraded" : ""}`;
      badge.title = data.decisionHealth.summary || "";
    }
    const engine = $("engineBadge");
    if (engine) {
      const jev = data.decision?.jev?.mode === "shared-harness-jev" ? "JEV plan choice" : "Grounded plan choice";
      const writer = data.decision?.writer?.mode === "anthropic-haiku" ? "Haiku desk copy" : "grounded desk copy";
      engine.textContent = `${jev} · ${writer}`;
    }
    const whyLabel = $("whyPlan")?.parentElement?.querySelector("span");
    if (whyLabel) whyLabel.textContent = "Why this fits you";
  }

  normalizeLegacyUrl();
  installControls();

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function personaAwareFetch(input, init) {
    const raw = typeof input === "string" ? input : String(input?.url || input || "");
    if (!raw.includes("/api/gatlinburg-winter")) return nativeFetch(input, init);
    const url = new URL(raw, location.origin);
    for (const [key, value] of extraQuery()) url.searchParams.set(key, value);
    if (!kidsExplicit && String($("kids")?.value || "").replace(/\s/g, "") === "6,10") url.searchParams.delete("kids");
    updateUrlFromControls();
    const response = await nativeFetch(url.pathname + url.search, init);
    try {
      const data = await response.clone().json();
      setTimeout(() => updateResultMeta(data), 0);
    } catch {}
    return response;
  };

  document.addEventListener("DOMContentLoaded", () => {
    syncGoal(new URLSearchParams(location.search).get("goal"));
    document.querySelectorAll(".persona").forEach(button => button.addEventListener("click", () => {
      const q = new URLSearchParams(location.search);
      q.set("persona", button.dataset.persona || "first");
      q.delete("goal");
      history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
      syncGoal();
      if (button.dataset.persona === "family" && !kidsExplicit && String($("kids")?.value || "").replace(/\s/g, "") === "6,10") $("kids").value = "";
      updateUrlFromControls();
    }));

    ["personaGoal", "personaPace", "tripOrigin", "tripPriority", "dinnerAnchor"].forEach(id => $(id)?.addEventListener("change", () => {
      updateUrlFromControls();
      if ($("refreshState")) $("refreshState").textContent = "Plan changed — rebuild ready";
    }));
    $("kids")?.addEventListener("input", () => { kidsExplicit = Boolean($("kids").value.trim()); });
  });
})();
