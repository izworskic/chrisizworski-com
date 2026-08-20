(function () {
  "use strict";

  window.va =
    window.va ||
    function () {
      (window.vaq = window.vaq || []).push(arguments);
    };

  function clean(value, fallback) {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  document.addEventListener("click", function (event) {
    var origin = event.target;
    if (!origin || typeof origin.closest !== "function") return;

    var link = origin.closest("a[data-growth-cta]");
    if (!link) return;

    var destination = "unknown";
    try {
      var url = new URL(link.href, window.location.href);
      destination = url.hostname === window.location.hostname ? url.pathname : url.hostname;
    } catch (_error) {
      destination = "unknown";
    }

    window.va("event", {
      name: "Growth CTA",
      data: {
        action: clean(link.dataset.growthCta, "growth-action"),
        page: clean(document.body.dataset.analyticsPage, "site"),
        destination: clean(destination, "unknown"),
      },
    });
  });
})();
