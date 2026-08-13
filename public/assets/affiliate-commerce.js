(function () {
  "use strict";

  window.va =
    window.va ||
    function () {
      (window.vaq = window.vaq || []).push(arguments);
    };

  function clean(value) {
    return String(value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9/-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "unknown";
  }

  function pageName() {
    return clean(document.body && document.body.dataset.analyticsPage);
  }

  function send(name, data) {
    window.va("event", {
      name: name,
      data: data
    });
  }

  function observeModules() {
    var markers = document.querySelectorAll("[data-affiliate-view-marker]");
    if (!("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
          var marker = entry.target;
          var module = marker.closest("[data-affiliate-module]");
          if (!module) return;
          send("Affiliate Module View", {
            page: pageName(),
            context: clean(module.dataset.affiliateContext),
            item: clean(module.dataset.affiliateModule),
            retailer: "amazon"
          });
          observer.unobserve(marker);
        });
      },
      { threshold: [0.5] }
    );

    markers.forEach(function (marker) {
      observer.observe(marker);
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-affiliate-item]");
    if (!link) return;
    send("Affiliate Click", {
      page: pageName(),
      context: clean(link.dataset.affiliateContext),
      item: clean(link.dataset.affiliateItem),
      retailer: "amazon"
    });
  });

  observeModules();
})();
