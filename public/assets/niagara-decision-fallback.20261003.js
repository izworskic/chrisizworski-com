(() => {
  "use strict";

  const GENERIC_HEADLINES = [
    "Current crossing comparison is not reliable enough to choose a bridge",
    "Current crossing comparison is unavailable",
  ];

  const modeLabels = {
    pedestrian: "walking",
    bicycle: "bicycles",
    bus: "buses",
    tow: "trailers",
  };

  function text(id) {
    return document.getElementById(id)?.textContent?.trim() || "";
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function isGenericInsufficientHeadline(value) {
    return GENERIC_HEADLINES.some((headline) => value === headline);
  }

  function improveInsufficientState() {
    const headline = text("decisionHeadline");
    const traveler = document.getElementById("travelerSelect")?.value || "passenger";
    const preferred = document.getElementById("preferredSelect")?.value || "rainbow";

    if (modeLabels[traveler] && (isGenericInsufficientHeadline(headline) || /cannot justify switching away/i.test(headline))) {
      const mode = modeLabels[traveler];
      setText("decisionHeadline", `No comparable live border wait is published for ${mode}`);
      setText("decisionReason", "The bridge rules are still usable, but official sources do not publish a like-for-like current wait for this travel mode. Use the eligibility and camera checks below; no passenger-car wait is being substituted.");
      setText("decisionState", "Rules available · live wait limited");
      setText("ribbonStatus", `Mode-specific live wait is not published for ${mode}.`);
      return;
    }

    if (traveler === "nexus" && preferred === "whirlpool" && (isGenericInsufficientHeadline(headline) || /cannot justify switching away/i.test(headline))) {
      setText("decisionHeadline", "Whirlpool's current wait is context, not a like-for-like comparison");
      setText("decisionReason", "Niagara Falls Bridge Commission says Whirlpool does not use the same real-time wait technology as the other crossings. This tool will not use that difference to tell you to switch bridges.");
      setText("decisionState", "Use Whirlpool context carefully");
      setText("ribbonStatus", "Whirlpool wait is operator context only.");
      return;
    }

    if (isGenericInsufficientHeadline(headline)) {
      setText("decisionHeadline", "Live wait reports are incomplete right now");
      setText("decisionReason", "Do not switch bridges based on incomplete numbers. Use the eligibility cards to rule out crossings that cannot serve your trip, then verify your normal eligible crossing with the official wait and live camera before entering the approach.");
      setText("decisionState", "Live comparison limited");
      setText("ribbonStatus", "Some official wait reports are temporarily incomplete.");
    }
  }

  function init() {
    const answer = document.querySelector(".trip-answer");
    if (!answer) return;

    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        improveInsufficientState();
      });
    };

    new MutationObserver(queue).observe(answer, { childList: true, subtree: true, characterData: true });
    document.getElementById("travelerSelect")?.addEventListener("change", queue);
    document.getElementById("preferredSelect")?.addEventListener("change", queue);
    queue();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
