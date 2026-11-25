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

  // The Authority publishes a 2.3% credit/debit fee. Round each crossing
  // independently to cents; actual transaction rounding may differ.
  function paymentComparison(total, vehicleClass, leadAxles, towedAxles) {
    if (!Number.isInteger(total) || total <= 0) return null;
    var cents = total * 100;
    var fee = Math.round(cents * 23 / 1000);
    return {
      cardOneCents: cents + fee,
      cardReturnCents: 2 * (cents + fee),
      macPassCandidate: vehicleClass === "passenger" && leadAxles === 2 && towedAxles === 0,
      qualifyingMacPassReturnCents: cents
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
    var standardReturn = byId("guideRoundTripTotal");
    if (standardReturn) standardReturn.textContent = "$" + (2 * result.total).toFixed(2);
    var formula = result.leadAxles + " lead axles × $" + result.leadRate.toFixed(2);
    if (result.towedAxles) {
      formula += " + " + result.towedAxles + " towed axles × $" + result.towedRate.toFixed(2);
    }
    if (result.exceptionApplied) formula += " • motorhome/auto exception";
    byId("guideTollFormula").textContent = formula;
    var payment = paymentComparison(result.total, classInput.value, result.leadAxles, result.towedAxles);
    if (payment && byId("guideCardOne")) {
      byId("guideCardOne").textContent = "$" + (payment.cardOneCents / 100).toFixed(2);
      byId("guideCardReturn").textContent = "$" + (payment.cardReturnCents / 100).toFixed(2);
      byId("guideMacPassExample").textContent = payment.macPassCandidate
        ? "If your existing MacPass account, vehicle and return trip qualify: $" + (payment.qualifyingMacPassReturnCents / 100).toFixed(2) + " for both crossings."
        : "This configuration does not qualify for the two-axle passenger vehicle return discount. Budget the standard two-crossing fare.";
    }
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
