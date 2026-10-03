(() => {
  "use strict";

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
