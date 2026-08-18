(function () {
  "use strict";

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  function clean(value, fallback) {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
  }

  function surface() {
    var p = window.location.pathname;
    if (p === "/michigan-cross-country-skiing/" || p === "/michigan-cross-country-skiing") return "xc-authority";
    if (p === "/michigan-ice/" || p === "/michigan-ice") return "ice-hub";
    if (p.indexOf("/michigan-ice/regions/") === 0) return "ice-region";
    if (p.indexOf("/michigan-ice/") === 0) return "ice-guide";
    return "winter";
  }

  var currentSurface = surface();
  var seen = Object.create(null);

  function emit(name, data) {
    window.va("event", { name: name, data: data || {} });
  }

  function once(key, name, data) {
    if (seen[key]) return;
    seen[key] = true;
    emit(name, data);
  }

  once("surface", "Winter Surface View", { surface: currentSurface });

  var stages = [];
  if (currentSurface === "xc-authority") {
    stages = [
      [".hero-actions", "live-handoff"],
      ["#xc-decision-desk", "decision-desk"],
      ["#ski-by-region", "regional-shortlist"],
      ["#trail-picks", "trail-comparison"],
      ["#condition-sources", "verification-sources"]
    ];
  } else if (currentSurface === "ice-hub") {
    stages = [
      [".seasonal-desk", "decision-desk"],
      [".seasonal-water-picker", "water-picker"],
      ["#water-behavior", "water-behavior"],
      ["#board", "conditions-board"]
    ];
  } else if (currentSurface === "ice-region") {
    stages = [
      [".safety-banner", "safety-boundary"],
      ["[data-seasonal-module]", "regional-decision"]
    ];
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var stage = entry.target.getAttribute("data-winter-observed-stage");
        if (!stage) return;
        once("stage:" + stage, "Winter Decision Stage", {
          surface: currentSurface,
          stage: stage
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    stages.forEach(function (pair) {
      var node = document.querySelector(pair[0]);
      if (!node) return;
      node.setAttribute("data-winter-observed-stage", pair[1]);
      observer.observe(node);
    });
  }

  document.addEventListener("click", function (event) {
    var origin = event.target;
    if (!origin || typeof origin.closest !== "function") return;
    var link = origin.closest("a[href]");
    if (!link) return;

    var url;
    try { url = new URL(link.href, window.location.href); }
    catch (_error) { return; }

    var destination = "";
    if (url.hostname === "xcski.chrisizworski.com") destination = "live-xc";
    else if (url.pathname.indexOf("/michigan-ice/regions/") === 0) destination = "ice-region";
    else if (url.pathname === "/michigan-ice/" || url.pathname === "/michigan-ice") destination = "ice-hub";
    else if (url.pathname === "/michigan-cross-country-skiing/" || url.pathname === "/michigan-cross-country-skiing") destination = "xc-authority";

    if (destination) {
      emit("Winter Handoff", {
        from: currentSurface,
        to: destination,
        placement: clean(link.dataset.placement, "content")
      });
    }

    if (currentSurface === "xc-authority" && url.hostname !== window.location.hostname && url.hostname !== "xcski.chrisizworski.com") {
      emit("Winter Verification Open", {
        surface: currentSurface,
        source: clean(url.hostname.replace(/^www\./, ""), "external-source"),
        placement: clean(link.dataset.placement, "trail-source")
      });
    }
  });
})();
