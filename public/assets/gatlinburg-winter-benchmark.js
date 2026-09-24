(() => {
  "use strict";
  const nativeFetch = window.fetch.bind(window);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const time = v => {
    if (!/^\d\d:\d\d$/.test(v || "")) return v || "—";
    const [h,m] = v.split(":").map(Number), suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${suffix}`;
  };

  function ensure(id, html, anchor, position = "afterend") {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement("section");
      node.id = id;
      node.className = "benchmark-section";
      node.innerHTML = html;
      anchor?.insertAdjacentElement(position, node);
    }
    return node;
  }

  function renderSeasonFacts(data) {
    const top = document.querySelector(".decision-top");
    if (!top || !Array.isArray(data.seasonFacts)) return;
    let facts = document.getElementById("seasonFacts");
    if (!facts) {
      facts = document.createElement("div");
      facts.id = "seasonFacts";
      facts.className = "season-facts";
      top.appendChild(facts);
    }
    facts.innerHTML = data.seasonFacts.map(row => `
      <a class="season-fact" href="${esc(row.sourceUrl)}" target="_blank" rel="noopener">
        <span>${esc(row.label)}</span>
        <strong>${esc(row.value)}</strong>
        <small>${esc(row.note)}</small>
      </a>`).join("");

    let jump = document.getElementById("quickJump");
    if (!jump) {
      jump = document.createElement("nav");
      jump.id = "quickJump";
      jump.className = "quick-jump";
      jump.setAttribute("aria-label", "Jump to Gatlinburg winter plan sections");
      top.appendChild(jump);
    }
    jump.innerHTML = [
      ["#plan","Your plan"],
      ["#stopFactsSection","Stop details"],
      ["#dateIntelligenceSection","Compare dates"],
      ["#mapSection","Map"],
      ["#commitSection","Before you go"]
    ].map(([href,label]) => `<a href="${href}">${label}</a>`).join("");
  }

  function renderBrief(data) {
    const plan = document.getElementById("plan");
    const timeline = document.getElementById("timeline");
    if (!plan || !timeline || !data.planBrief) return;
    let brief = document.getElementById("planBrief");
    if (!brief) {
      brief = document.createElement("div");
      brief.id = "planBrief";
      brief.className = "plan-brief";
      timeline.insertAdjacentElement("beforebegin", brief);
    }
    const rows = [
      ["Plan time", data.planBrief.totalTime],
      ["Cost shape", data.planBrief.costMix],
      ["Walking", data.planBrief.walking],
      ["Weather exposure", data.planBrief.exposure],
      ["Movement", data.planBrief.movement],
      ["Stops", String(data.planBrief.stopCount)],
      ["Verification", data.planBrief.verification],
      ["Date anchor", data.planBrief.eventAnchor]
    ];
    brief.innerHTML = rows.map(([label,value]) => `<div class="plan-brief-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
  }

  function renderStopFacts(data) {
    const plan = document.getElementById("plan");
    if (!plan || !Array.isArray(data.stopFacts)) return;
    const ops = document.getElementById("visitOperationsSection");
    const anchor = ops || plan;
    const section = ensure(
      "stopFactsSection",
      '<div class="section-heading"><div><p class="eyebrow">Need to know</p><h2>What each stop asks of you</h2></div><span class="map-note">Selected stops only</span></div><div id="stopFacts" class="stop-facts"></div>',
      anchor
    );
    const host = section.querySelector("#stopFacts");
    host.innerHTML = data.stopFacts.length ? data.stopFacts.map(row => `
      <article class="stop-fact">
        <div class="stop-fact-index">${esc(row.order)}</div>
        <div>
          <h3>${esc(row.name)}</h3>
          <div class="stop-fact-time">${esc(time(row.start))}–${esc(time(row.end))} · ${esc(Math.round(row.durationMinutes || 0))} min</div>
          <p class="stop-fact-why">${esc(row.whyHere)}</p>
          <div class="stop-fact-badges">
            ${(row.tags || []).slice(0,5).map(tag => `<span class="stop-fact-badge">${esc(tag)}</span>`).join("")}
            ${row.verificationRequired ? '<span class="stop-fact-badge verify">Verify future hours</span>' : ""}
          </div>
          ${row.officialUrl ? `<a class="stop-fact-source" href="${esc(row.officialUrl)}" target="_blank" rel="noopener">Official stop check ↗</a>` : ""}
        </div>
        <div class="stop-fact-meta">
          <div><span>Cost</span><strong>${esc(row.cost)}</strong></div>
          <div><span>Plan ahead</span><strong>${esc(row.reservation)}</strong></div>
          <div><span>Walking</span><strong>${esc(row.walking)}</strong></div>
          <div><span>Weather</span><strong>${esc(row.weather)}</strong></div>
        </div>
      </article>`).join("") : '<p class="empty-note">No selected stops are available to expand yet.</p>';
  }

  function renderCommit(data) {
    const changes = document.getElementById("changes");
    if (!changes || !Array.isArray(data.commitChecks)) return;
    const section = ensure(
      "commitSection",
      '<div class="commit-shell"><div class="section-heading"><div><p class="eyebrow">Before you commit</p><h2>Know before you go</h2></div></div><p class="plan-summary">The plan is built. These are the few operational checks that can still change how you execute it.</p><ul id="commitList" class="commit-list"></ul></div>',
      changes,
      "beforebegin"
    );
    const host = section.querySelector("#commitList");
    host.innerHTML = data.commitChecks.map(row => `
      <li class="commit-item">
        <span class="commit-item-priority">${esc(String(row.priority || "check").replaceAll("-"," "))}</span>
        <strong>${esc(row.label)}</strong>
        <p>${esc(row.detail)}</p>
        ${row.sourceUrl ? `<a href="${esc(row.sourceUrl)}" target="_blank" rel="noopener">${esc(row.sourceLabel || "Official source")} ↗</a>` : ""}
      </li>`).join("");
  }

  function renderStaticGuide() {
    const context = document.querySelector(".search-context");
    if (!context || document.getElementById("benchmarkStatic")) return;
    const section = document.createElement("section");
    section.id = "benchmarkStatic";
    section.className = "benchmark-static";
    section.innerHTML = `
      <div class="benchmark-static-grid">
        <div>
          <p class="eyebrow">Winter reality check</p>
          <h2>Downtown Gatlinburg and the high Smokies are not the same winter.</h2>
          <p>Great Smoky Mountains National Park says temperatures can vary 10–20°F from mountain base to top, and clear skies lower down do not guarantee the same conditions at higher elevations. The planner therefore keeps downtown weather, mountain visibility, park closures and Ober operations as separate inputs instead of collapsing them into a generic “snow day.”</p>
          <p><a href="https://www.nps.gov/grsm/planyourvisit/weather.htm" target="_blank" rel="noopener">NPS winter weather guidance ↗</a></p>
        </div>
        <ul class="benchmark-static-list">
          <li><strong>Winter Magic</strong>Use the official self-guided map and snowpeople scavenger hunt if you want to extend the lights portion after the core itinerary. <a href="https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/" target="_blank" rel="noopener">Official page ↗</a></li>
          <li><strong>Downtown parking</strong>City garage availability belongs to the city, not this planner. Check the live city source before entering the core. <a href="https://www.gatlinburgtn.gov/documents/departments/parking/479808" target="_blank" rel="noopener">City parking ↗</a></li>
          <li><strong>Smokies parking tag</strong>A parking tag is required for vehicles parked longer than 15 minutes in Great Smoky Mountains National Park. <a href="https://www.nps.gov/grsm/planyourvisit/fees.htm" target="_blank" rel="noopener">NPS parking tags ↗</a></li>
          <li><strong>Winter trolley</strong>General winter service is published for 10:30 AM–10:00 PM from November 1–April 30; route/event service can vary. <a href="https://www.gatlinburg.com/things-to-do/trolley/" target="_blank" rel="noopener">Official trolley ↗</a></li>
        </ul>
      </div>`;
    context.insertAdjacentElement("beforebegin", section);
  }

  function renderAll(data) {
    if (!data || !data.ok) return;
    renderSeasonFacts(data);
    renderBrief(data);
    renderStopFacts(data);
    renderCommit(data);
    renderStaticGuide();
  }

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/api/gatlinburg-winter")) {
        response.clone().json().then(data => setTimeout(() => renderAll(data), 40)).catch(() => {});
      }
    } catch {}
    return response;
  };

  document.addEventListener("DOMContentLoaded", renderStaticGuide);
})();
