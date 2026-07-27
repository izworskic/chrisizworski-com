(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function clampInteger(value, minimum, maximum, fallback) {
    var parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) parsed = fallback;
    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function calculateToll(vehicleClass, leadAxles, towedAxles, motorhomeTowingAuto) {
    var lead = clampInteger(leadAxles, 2, 12, 2);
    var towed = clampInteger(towedAxles, 0, 12, 0);
    var isOther = vehicleClass === "other";
    var leadRate = isOther ? 5 : 2;
    var towedRate = isOther && motorhomeTowingAuto && towed > 0 ? 2 : leadRate;
    return {
      total: lead * leadRate + towed * towedRate,
      leadAxles: lead,
      towedAxles: towed,
      leadRate: leadRate,
      towedRate: towedRate,
      exceptionApplied: isOther && motorhomeTowingAuto && towed > 0,
    };
  }

  function render() {
    var classInput = byId("guideTollClass");
    var leadInput = byId("guideLeadAxles");
    var towedInput = byId("guideTowedAxles");
    var exceptionInput = byId("guideMotorhomeAuto");
    if (!classInput || !leadInput || !towedInput || !exceptionInput) return;

    var result = calculateToll(
      classInput.value,
      leadInput.value,
      towedInput.value,
      exceptionInput.checked,
    );
    leadInput.value = String(result.leadAxles);
    towedInput.value = String(result.towedAxles);
    exceptionInput.disabled = classInput.value !== "other" || result.towedAxles === 0;
    if (exceptionInput.disabled) exceptionInput.checked = false;

    byId("guideTollTotal").textContent = "$" + result.total.toFixed(2);
    var formula = result.leadAxles + " lead axles × $" + result.leadRate.toFixed(2);
    if (result.towedAxles) {
      formula += " + " + result.towedAxles + " towed axles × $" + result.towedRate.toFixed(2);
    }
    if (result.exceptionApplied) formula += " • motorhome/auto exception";
    byId("guideTollFormula").textContent = formula;
  }

  function init() {
    ["guideTollClass", "guideLeadAxles", "guideTowedAxles", "guideMotorhomeAuto"].forEach(function (id) {
      var input = byId(id);
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
