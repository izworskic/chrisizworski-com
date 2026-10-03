(() => {
  "use strict";

  const unsupportedLabels = {
    pedestrian: "walking",
    bicycle: "bicycles",
    bus: "buses",
    tow: "trailers",
  };

  function setText(id, text) {
    const node = document.getElementById(id);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function polishDecision() {
    const traveler = document.getElementById("travelerSelect")?.value;
    const preferred = document.getElementById("preferredSelect")?.value;
    const headline = document.getElementById("decisionHeadline")?.textContent || "";

    if (unsupportedLabels[traveler] && /not reliable enough|cannot justify|unavailable/i.test(headline)) {
      const mode = unsupportedLabels[traveler];
      setText("decisionHeadline", `No comparable live border wait is published for ${mode}`);
      setText("decisionReason", "The bridge rules are still usable, but official sources do not publish a like-for-like current wait for this travel mode. Use the eligibility and camera checks below; no passenger-car wait is being substituted.");
      setText("ribbonStatus", `Mode-specific live wait is not published for ${mode}.`);
      return;
    }

    if (traveler === "nexus" && preferred === "whirlpool" && /cannot justify switching away|comparison is not reliable enough/i.test(headline)) {
      setText("decisionHeadline", "Whirlpool's current wait is context, not a like-for-like comparison");
      setText("decisionReason", "Niagara Falls Bridge Commission says Whirlpool does not use the same real-time wait technology as the other crossings. We will not use that difference to tell you to switch bridges.");
      setText("ribbonStatus", "Whirlpool wait is operator context only.");
    }
  }

  function init() {
    const answer = document.querySelector(".trip-answer");
    if (!answer) return;
    let queued = false;
    const queuePolish = () => {
      if (queued) return;
      queued = true;
      window.setTimeout(() => {
        queued = false;
        polishDecision();
      }, 0);
    };
    new MutationObserver(queuePolish).observe(answer, { childList: true, subtree: true, characterData: true });
    document.getElementById("travelerSelect")?.addEventListener("change", queuePolish);
    document.getElementById("preferredSelect")?.addEventListener("change", queuePolish);
    queuePolish();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
