(() => {
  "use strict";

  const NEXUS_DEFINITION = "NEXUS = a Canada–U.S. trusted-traveler program for pre-approved, low-risk travelers. Everyone in the vehicle must be a NEXUS member to use a NEXUS lane.";

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
    document.querySelectorAll(".bridge-choice, .compare-bridge").forEach(rewriteComparisonCard);
    rewriteWhirlpoolReality();
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
  applyEligibilityLabels();
})();
