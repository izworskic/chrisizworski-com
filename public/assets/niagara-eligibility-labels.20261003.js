(() => {
  "use strict";

  const NEXUS_DEFINITION = "NEXUS = a Canada–U.S. trusted-traveler program for pre-approved, low-risk travelers. Everyone in the vehicle must be a NEXUS member to use a NEXUS lane.";
  const selectedSituations = new Set();

  const SITUATIONS = {
    kids: {
      label: "Kids",
      canada: "Carry acceptable identification for each child. If a parent or legal guardian is not travelling, bring the appropriate consent and custody documents.",
      us: "Carry identification for each child. If a parent or guardian is not travelling, bring a signed permission or custody document and check current CBP guidance.",
      link: "https://www.cbsa-asfc.gc.ca/travel-voyage/td-dv-eng.html",
      linkLabel: "Children and travel documents",
    },
    pet: {
      label: "Pet",
      canada: "Check the animal import requirements and have required permits, certificates or vaccination records ready. Pets must be declared when entering Canada.",
      us: "Check current U.S. animal-entry requirements and keep the pet's required health or vaccination paperwork ready before reaching the booth.",
      link: "https://www.cbsa-asfc.gc.ca/services/fpa-apa/animals-animaux-eng.html",
      linkLabel: "Travelling with animals",
    },
    food: {
      label: "Food / plants",
      canada: "Declare all food, plant and animal products. Restrictions depend on the item, origin and current animal or plant health rules.",
      us: "Agriculture restrictions vary by product and origin. Declare agricultural items and check the current U.S. traveler rules before arrival.",
      link: "https://www.cbsa-asfc.gc.ca/services/fpa-apa/bringing-apporter-fpa-eng.html",
      linkLabel: "Food, plants and animals",
    },
    purchases: {
      label: "Purchases",
      canada: "Keep receipts handy and declare purchases and gifts. Duties, taxes and personal exemptions depend on your residency and time away.",
      us: "Keep receipts handy and declare purchases as required. Your exemption and duty treatment depend on the trip and what you are bringing back.",
      link: "https://www.cbsa-asfc.gc.ca/travel-voyage/checklist-aidememoire-eng.html",
      linkLabel: "Border declaration checklist",
    },
    cash: {
      label: "Cash $10k+",
      canada: "Currency or monetary instruments totalling CAN$10,000 or more must be declared when entering or leaving Canada.",
      us: "Large amounts of currency or monetary instruments can trigger federal reporting requirements. Check CBP before reaching the border.",
      link: "https://www.cbsa-asfc.gc.ca/travel-voyage/declare-eng.html",
      linkLabel: "Currency reporting",
    },
    firearms: {
      label: "Firearms / weapons",
      canada: "Do not arrive at the Canadian border with a firearm or weapon until you have checked the current import, permit and declaration rules. Many weapons are prohibited or restricted.",
      us: "Firearm and weapon rules are specialized. Check the current U.S. import and transport requirements before approaching the port of entry.",
      link: "https://www.cbsa-asfc.gc.ca/travel-voyage/rpg-mrp-eng.html",
      linkLabel: "Restricted and prohibited goods",
    },
    cannabis: {
      label: "Cannabis",
      canada: "Do not carry cannabis across the Canadian border without an authorized permit or exemption, even if cannabis is legal where your trip starts or ends.",
      us: "Do not carry cannabis across the international border. U.S. border entry is governed by federal law, not state or provincial legalization.",
      link: "https://www.cbsa-asfc.gc.ca/travel-voyage/rpg-mrp-eng.html",
      linkLabel: "Cannabis and border rules",
    },
  };

  function explainNexus() {
    const select = document.getElementById("travelerSelect");
    const option = select?.querySelector('option[value="nexus"]');
    if (option) option.textContent = "NEXUS member";
    if (!select || document.getElementById("nexusDefinition")) return;

    const note = document.createElement("small");
    note.id = "nexusDefinition";
    note.className = "control-help nexus-definition";
    note.textContent = NEXUS_DEFINITION;
    note.style.display = "block";
    note.style.marginTop = "5px";
    select.insertAdjacentElement("afterend", note);
  }

  function currentDirection() {
    return document.querySelector('[data-direction="to_us"]')?.getAttribute("aria-pressed") === "true" ? "to_us" : "to_canada";
  }

  function directionLabel() {
    return currentDirection() === "to_canada" ? "Entering Canada" : "Entering the United States";
  }

  function officialChecklist() {
    return currentDirection() === "to_canada"
      ? { href: "https://www.cbsa-asfc.gc.ca/travel-voyage/checklist-aidememoire-eng.html", label: "Official Canada border checklist" }
      : { href: "https://www.cbp.gov/travel", label: "Official U.S. traveler information" };
  }

  function injectReadinessStyles() {
    if (document.getElementById("niagaraBorderReadyStyles")) return;
    const style = document.createElement("style");
    style.id = "niagaraBorderReadyStyles";
    style.textContent = `
      .border-ready-card{margin:18px 0;padding:22px;border:1px solid #cbd9df;border-radius:18px;background:#fff;color:#152332;box-shadow:0 8px 28px rgba(7,35,54,.07)}
      .border-ready-card h2,.border-ready-card h3{color:#072336;margin-top:0}.border-ready-card p{color:#53656f}
      .border-ready-head{display:flex;gap:18px;justify-content:space-between;align-items:flex-start}.border-ready-head p{max-width:720px;margin-bottom:0}
      .border-ready-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}
      .border-ready-check{border:1px solid #d8e2e7;border-radius:13px;padding:13px;background:#f8fbfc}.border-ready-check span{display:block;font:700 11px/1.2 var(--sans);text-transform:uppercase;letter-spacing:.06em;color:#55707c;margin-bottom:5px}.border-ready-check strong{display:block;font:700 15px/1.25 var(--sans);color:#0b314c}.border-ready-check small{display:block;margin-top:5px;color:#657983;line-height:1.35}
      .border-ready-situations{border-top:1px solid #e4ebee;padding-top:17px}.border-ready-situations h3{margin-bottom:4px}.border-ready-situations>p{margin-top:0}
      .border-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}.border-chip{appearance:none;border:1px solid #a9bec8;background:#fff;color:#163849;border-radius:999px;padding:9px 12px;font:700 13px/1 var(--sans);cursor:pointer}.border-chip[aria-pressed="true"]{background:#0b314c;color:#fff;border-color:#0b314c}.border-chip:focus-visible{outline:3px solid #8ec5e0;outline-offset:2px}
      .border-ready-detail{border-left:4px solid #4c8bad;background:#f3f8fa;border-radius:10px;padding:12px 14px;margin:8px 0 16px}.border-ready-detail[hidden]{display:none}.border-ready-detail strong{color:#0b314c}.border-ready-detail p{margin:5px 0 8px}.border-ready-detail a{font-weight:700;color:#0b5c8a}
      .border-ready-checklist{background:#0b314c;color:#fff;border-radius:14px;padding:16px}.border-ready-checklist h3{color:#fff;margin:0 0 8px}.border-ready-checklist ul{margin:0;padding-left:20px}.border-ready-checklist li{margin:6px 0;line-height:1.38}.border-ready-checklist a{color:#bfe8ff;font-weight:700}.border-ready-fine{font-size:12px!important;margin:12px 0 0!important}
      @media(max-width:760px){.border-ready-card{padding:16px;margin:14px 0}.border-ready-head{display:block}.border-ready-grid{grid-template-columns:1fr 1fr}.border-ready-check{padding:11px}.border-chip{padding:9px 11px}.border-ready-fine{font-size:11px!important}}
      @media(max-width:390px){.border-ready-grid{gap:8px}.border-ready-check strong{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function renderReadinessChecklist() {
    const card = document.getElementById("borderReady");
    if (!card) return;
    const checklist = card.querySelector("#borderReadyChecklist");
    const official = officialChecklist();
    const traveler = document.getElementById("travelerSelect")?.selectedOptions?.[0]?.textContent?.trim() || "your traveler type";
    const headline = document.getElementById("decisionHeadline")?.textContent?.trim();
    const bridgeLine = headline && !/loading|unavailable|reliable enough/i.test(headline)
      ? headline
      : "Use the live bridge decision above before entering the approach.";
    const items = [
      bridgeLine,
      `Have an accepted travel document ready for every traveler (${traveler}).`,
      "Keep documents, receipts and anything you may need to declare within reach before the booth.",
    ];
    selectedSituations.forEach((key) => {
      const item = SITUATIONS[key];
      if (!item) return;
      items.push(`${item.label}: ${currentDirection() === "to_canada" ? item.canada : item.us}`);
    });
    checklist.innerHTML = `<h3>Your crossing checklist</h3><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul><p style="margin:12px 0 0"><a href="${official.href}" target="_blank" rel="noopener">${official.label} →</a></p>`;

    const direction = card.querySelector("#borderReadyDirection");
    if (direction) direction.textContent = directionLabel();
    const officialLink = card.querySelector("#borderReadyOfficial");
    if (officialLink) {
      officialLink.href = official.href;
      officialLink.textContent = official.label;
    }
  }

  function showSituation(key) {
    const card = document.getElementById("borderReady");
    const item = SITUATIONS[key];
    if (!card || !item) return;
    const detail = card.querySelector("#borderReadyDetail");
    const text = currentDirection() === "to_canada" ? item.canada : item.us;
    detail.hidden = false;
    detail.innerHTML = `<strong>${item.label}</strong><p>${text}</p><a href="${item.link}" target="_blank" rel="noopener">${item.linkLabel} →</a>`;
  }

  function toggleSituation(button) {
    const key = button.dataset.borderSituation;
    if (!SITUATIONS[key]) return;
    if (selectedSituations.has(key)) selectedSituations.delete(key);
    else selectedSituations.add(key);
    document.querySelectorAll("[data-border-situation]").forEach((chip) => chip.setAttribute("aria-pressed", String(selectedSituations.has(chip.dataset.borderSituation))));
    if (selectedSituations.has(key)) showSituation(key);
    else if (!selectedSituations.size) document.getElementById("borderReadyDetail")?.setAttribute("hidden", "");
    else showSituation([...selectedSituations].at(-1));
    renderReadinessChecklist();
    if (window.va) window.va("event", { name: "Niagara Border Prep", situation: key, selected: selectedSituations.has(key) });
  }

  function buildReadinessLayer() {
    if (document.getElementById("borderReady")) return;
    const reality = document.querySelector(".reality-card");
    if (!reality) return;
    injectReadinessStyles();
    const section = document.createElement("section");
    section.className = "border-ready-card";
    section.id = "borderReady";
    section.setAttribute("aria-labelledby", "borderReadyHeading");
    section.innerHTML = `
      <div class="border-ready-head">
        <div><p class="eyebrow">Before the booth</p><h2 id="borderReadyHeading">Ready to cross?</h2><p>Bridge choice is only part of the trip. Check the few things that most often change what happens at the border, then expand only what applies to you.</p></div>
        <span class="trip-state" id="borderReadyDirection">${directionLabel()}</span>
      </div>
      <div class="border-ready-grid" aria-label="Four border readiness checks">
        <div class="border-ready-check"><span>1 · Documents</span><strong>Right ID for everyone?</strong><small>Passport or another accepted border document, based on citizenship and age.</small></div>
        <div class="border-ready-check"><span>2 · Declare</span><strong>Bringing anything?</strong><small>Purchases, food, plants, animals, cash and restricted goods can change the conversation.</small></div>
        <div class="border-ready-check"><span>3 · Special trip</span><strong>Anything unusual?</strong><small>Kids, pets, NEXUS, trailers and other situations can add requirements.</small></div>
        <div class="border-ready-check"><span>4 · At the booth</span><strong>Have it within reach</strong><small>Documents, receipts and declaration details should be ready before the inspection point.</small></div>
      </div>
      <div class="border-ready-situations">
        <h3>What applies to this trip?</h3>
        <p>Tap only what matters. The checklist below updates for your trip.</p>
        <div class="border-chip-row" role="group" aria-label="Trip situations">
          ${Object.entries(SITUATIONS).map(([key, item]) => `<button class="border-chip" type="button" data-border-situation="${key}" aria-pressed="false">${item.label}</button>`).join("")}
        </div>
        <div class="border-ready-detail" id="borderReadyDetail" hidden></div>
      </div>
      <div class="border-ready-checklist" id="borderReadyChecklist"></div>
      <p class="border-ready-fine">This is a trip-prep checklist, not an admissibility determination. Entry rules depend on citizenship, immigration status and what you are carrying. <a id="borderReadyOfficial" href="${officialChecklist().href}" target="_blank" rel="noopener">${officialChecklist().label}</a>.</p>
    `;
    reality.insertAdjacentElement("afterend", section);
    section.addEventListener("click", (event) => {
      const button = event.target.closest("[data-border-situation]");
      if (button) toggleSituation(button);
    });
    renderReadinessChecklist();
  }

  function rewriteComparisonCard(card) {
    const kicker = card.querySelector(".bridge-choice-kicker")?.textContent?.trim();
    if (kicker !== "Not for this trip") return;

    const wait = card.querySelector(".bridge-choice-wait, .compare-wait");
    if (!wait || wait.textContent.trim() !== "Unavailable") return;

    const name = card.querySelector("h3")?.textContent?.trim() || "";
    wait.textContent = /Whirlpool Rapids/i.test(name) ? "NEXUS only" : "Not eligible";
    wait.setAttribute("data-eligibility-label", "true");
  }

  function rewriteWhirlpoolReality() {
    const heading = document.getElementById("realityHeading")?.textContent?.trim() || "";
    if (!/^Whirlpool Rapids\b/i.test(heading)) return;

    const wait = document.querySelector("#realityGrid .reality-item:first-child .reality-value");
    if (wait?.textContent?.trim() === "Unavailable") {
      wait.textContent = "NEXUS only";
      wait.setAttribute("data-eligibility-label", "true");
    }
  }

  function applyEligibilityLabels() {
    explainNexus();
    buildReadinessLayer();
    document.querySelectorAll(".bridge-choice, .compare-bridge").forEach(rewriteComparisonCard);
    rewriteWhirlpoolReality();
    renderReadinessChecklist();
  }

  function observe(id) {
    const node = document.getElementById(id);
    if (!node) return;
    new MutationObserver(applyEligibilityLabels).observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  observe("crossingGrid");
  observe("compareGrid");
  observe("realityGrid");
  observe("decisionHeadline");
  document.getElementById("travelerSelect")?.addEventListener("change", renderReadinessChecklist);
  document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => setTimeout(renderReadinessChecklist, 0)));
  applyEligibilityLabels();
})();
