(function () {
  "use strict";

  window.va =
    window.va ||
    function () {
      (window.vaq = window.vaq || []).push(arguments);
    };

  function clean(value, fallback) {
    return String(value || fallback || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "unknown";
  }

  function pageTool() {
    return clean(document.body && document.body.dataset.seasonalTool, "seasonal-tool");
  }

  function send(name, data) {
    window.va("event", { name: name, data: data });
  }

  function actionData(element) {
    return {
      tool: pageTool(),
      action: clean(element.dataset.seasonalAction, "open"),
      persona: clean(element.dataset.seasonalPersona, "field-user"),
      placement: clean(element.dataset.seasonalPlacement, "page")
    };
  }

  document.addEventListener("click", function (event) {
    var origin = event.target;
    if (!origin || typeof origin.closest !== "function") return;

    var action = origin.closest("[data-seasonal-action]");
    if (action) {
      send("Seasonal Decision", actionData(action));
      return;
    }

    var toolLink = origin.closest("a[data-seasonal-tool-open]");
    if (!toolLink) return;
    send("Seasonal Tool Open", {
      tool: pageTool(),
      destination: clean(toolLink.dataset.seasonalToolOpen, "seasonal-tool"),
      placement: clean(toolLink.dataset.seasonalPlacement, "seasonal-switcher")
    });
  });

  document.addEventListener("change", function (event) {
    var select = event.target;
    if (!select || !select.matches || !select.matches("[data-seasonal-select]")) return;
    send("Seasonal Selection", {
      tool: pageTool(),
      selector: clean(select.dataset.seasonalSelect, "region"),
      selection: clean(select.value, "none"),
      placement: clean(select.dataset.seasonalPlacement, "tool")
    });
  });

  function observeModules() {
    if (!("IntersectionObserver" in window)) return;
    var modules = document.querySelectorAll("[data-seasonal-module]");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        send("Seasonal Module View", {
          tool: pageTool(),
          module: clean(entry.target.dataset.seasonalModule, "module")
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: [0.5] });
    modules.forEach(function (module) { observer.observe(module); });
  }

  function loadWinterFunnel() {
    if (window.location.pathname.indexOf("/michigan-ice/") !== 0) return;
    if (document.querySelector('script[data-winter-funnel-loader]')) return;
    var funnel = document.createElement("script");
    funnel.src = "/assets/winter-funnel.js";
    funnel.defer = true;
    funnel.dataset.winterFunnelLoader = "ice";
    document.body.appendChild(funnel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      observeModules();
      loadWinterFunnel();
    });
  } else {
    observeModules();
    loadWinterFunnel();
  }
})();
